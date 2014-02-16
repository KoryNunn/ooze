var modelOperations = require('./modelOperations'),
    oozePaths = require('./paths'),
    get = modelOperations.get,
    set = modelOperations.set,
    wildcardRegex = new RegExp('(\\' + oozePaths.constants.wildcard + ')', 'g'),
    arrayProto = [],
    WM = typeof WeakMap !== 'undefined' ? WeakMap : require('weakmap');

var isBrowser = typeof Node != 'undefined';

module.exports = function(modelGet){
    var modelBindings,
        modelBindingDetails,
        callbackReferenceDetails,
        modelReferences;

    function resetEvents(){
        modelBindings = {};
        modelBindingDetails = new WM();
        callbackReferenceDetails = new WM();
        modelReferences = new WM();
    }

    resetEvents();

    function ModelEventEmitter(target){
        this.model = modelGet();
        this.events = {};
        this.alreadyEmitted = {};
        this.target = target;
    }
    ModelEventEmitter.prototype.pushPath = function(path, type, skipReferences){
        var currentEvent = this.events[path];

        if(!currentEvent || type === 'target' || type === 'keys'){
            this.events[path] = type;
        }

        if(skipReferences){
            return;
        }

        var modelValue = get(path, this.model),
            references = modelValue && typeof modelValue === 'object' && modelReferences.get(modelValue),
            referencePathParts,
            referenceBubblePath,
            pathParts = oozePaths.toParts(path),
            targetParts = oozePaths.toParts(this.target),
            referenceTarget;

        // If no references, or only in the model once
        // There are no reference events to fire.
        if(!references || Object.keys(references).length === 1){
            return;
        }

        for(var key in references){
            referencePathParts = oozePaths.toParts(key);

            referenceTarget = oozePaths.join(referencePathParts.concat(targetParts.slice(pathParts.length)));

            bubbleTrigger(referenceTarget, this, true);
            this.pushPath(referenceTarget, 'target', true);
            sinkTrigger(referenceTarget, this, true);
        }
    };
    ModelEventEmitter.prototype.emit = function(){
        var emitter = this,
            callbacksCalled = [],
            targetReference,
            referenceDetails;

        for(var path in this.events){
            var type = this.events[path];

            targetReference = get(path, modelBindings);
            referenceDetails = targetReference && modelBindingDetails.get(targetReference);

            if(!referenceDetails){
                continue;
            }

            for(var i = 0; i < referenceDetails.length; i++) {
                var details = referenceDetails[i],
                    path = details.path;

                if(details.callback._lastEmitter === this){
                    continue;
                }

                details.callback._lastEmitter = this;

                details.callback({
                    target: emitter.target,
                    path: details.path,
                    captureType: type
                });
            };
        }
    };

    function sinkTrigger(path, emitter, skipReferences){
        var reference = get(path, modelBindings);

        for(var key in reference){
            var sinkPath = oozePaths.join([path, key]);
            emitter.pushPath(sinkPath, 'sink', skipReferences);
            sinkTrigger(sinkPath, emitter, skipReferences);
        }
    }

    function bubbleTrigger(path, emitter, skipReferences){
        var pathParts = oozePaths.toParts(path);

        for(var i = 0; i < pathParts.length - 1; i++){

            emitter.pushPath(
                oozePaths.join(pathParts.slice(0, i+1)),
                'bubble',
                skipReferences
            );
        }
    }

    function trigger(path, keysChange){

        var emitter = new ModelEventEmitter(path);

        bubbleTrigger(path, emitter);

        if(keysChange){
            emitter.pushPath(oozePaths.up(path), 'keys');
        }

        emitter.pushPath(path, 'target');

        sinkTrigger(path, emitter);

        emitter.emit();
    }

    function addReferencesForBinding(path){
        var model = modelGet(),
            pathParts = oozePaths.toParts(path),
            itemPath = path,
            item = get(path, model);

        while(typeof item !== 'object' && pathParts.length){
            pathParts.pop();
            itemPath = oozePaths.join(pathParts);
            item = get(itemPath, model);
        }

        addModelReference(itemPath, item);
    }

    function setBinding(path, callback){
        var details = {
                path: path,
                callback: callback
            };

        var reference = get(path, modelBindings) || {},
            referenceDetails = modelBindingDetails.get(reference),
            callbackReferences = callbackReferenceDetails.get(callback);

        if(!referenceDetails){
            referenceDetails = [];
            modelBindingDetails.set(reference, referenceDetails);
        }

        if(!callbackReferences){
            callbackReferences = [];
            callbackReferenceDetails.set(callback, callbackReferences);
        }

        callbackReferences.push(path);
        referenceDetails.push(details);

        set(path, reference, modelBindings);

        addReferencesForBinding(path);
    }

    function setWildcardBinding(path, callback){
        var parts = oozePaths.toParts(path),
            pathStub = oozePaths.join(parts.slice(0, parts.indexOf(oozePaths.constants.wildcard)));

        var sanitized = path.replace(/(\.|\$)/g, '\\$1'),
            wildcarded = sanitized.replace(wildcardRegex, '(.*?)'),
            pathMatcher = new RegExp(wildcarded);

        callback.__boundCallback = function(event){
            var matchedPath = event.target.match(pathMatcher);

            if(matchedPath){
                var replaced = 0;
                event.wildcardValues = arrayProto.slice.call(matchedPath, 1);
                event.path = path;
                event.resolvedPath = path.replace(wildcardRegex, function(){
                    return event.wildcardValues[replaced++];
                });

                callback(event);
            }
        };

        setBinding(pathStub, callback.__boundCallback);
    }

    function on(paths, callback){
        for(var i = 0; i < paths.length; i++) {

            if(paths[i].indexOf(oozePaths.constants.wildcard)>=0){
                setWildcardBinding(paths[i], callback);
                continue;
            }

            setBinding(paths[i], callback);
        }
    }

    function removeBinding(path, callback){
        if(typeof path === 'function'){
            callback = path;
            path = null;
        }

        if(path == null){
            var references = callback && callbackReferenceDetails.get(callback);
            if(references){
                while(references.length){
                    off(references.pop(), callback);
                }
            }else{
                resetEvents();
            }
            return;
        }

        var targetReference = get(path, modelBindings),
            referenceDetails = modelBindingDetails.get(targetReference);

        if(referenceDetails){
            for(var i = 0; i < referenceDetails.length; i++) {
                var details = referenceDetails[i];
                if(!callback || callback === details.callback){
                    referenceDetails.splice(i, 1);
                    i--;
                }
            }
        }
    }

    function off(paths, callback){
        if(callback.__boundCallback){
            callback = callback.__boundCallback;
        }
        for(var i = 0; i < paths.length; i++) {
            removeBinding(
                paths[i],
                callback
            );
        }
    }

    // Add a new object who's references should be tracked.
    function addModelReference(path, object){
        if(!object || typeof object !== 'object'){
            return;
        }

        var objectReferences = modelReferences.get(object);

        if(!objectReferences){
            objectReferences = {};
            modelReferences.set(object, objectReferences);
        }

        if(!(path in objectReferences)){
            objectReferences[path] = null;
        }

        if(isBrowser && object instanceof Node){
            return;
        }

        for(var key in object){
            var prop = object[key];

            // Faster to check again here than to create pointless paths.
            if(prop && typeof prop === 'object'){
                var refPath = oozePaths.join([path, key]);
                if(modelReferences.has(prop)){
                    if(prop !== object){
                        modelReferences.get(prop)[refPath] = null;
                    }
                }else{
                    addModelReference(refPath, prop);
                }
            }
        }
    }

    function removeModelReference(path, object){
        if(!object || typeof object !== 'object'){
            return;
        }

        var objectReferences = modelReferences.get(object),
            refIndex;

        if(!objectReferences){
            return;
        }

        delete objectReferences[path];

        if(!Object.keys(objectReferences).length){
            modelReferences['delete'](object);
        }

        for(var key in object){
            var prop = object[key];

            // Faster to check again here than to create pointless paths.
            if(prop && typeof prop === 'object' && prop !== object){
                removeModelReference(oozePaths.join([path, key]), prop);
            }
        }
    }

    return {
        on: on,
        trigger: trigger,
        off: off,
        addModelReference: addModelReference,
        removeModelReference: removeModelReference
    };
};