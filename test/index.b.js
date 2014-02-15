(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        throw TypeError('Uncaught, unspecified "error" event.');
      }
      return false;
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      console.trace();
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],3:[function(require,module,exports){
var WeakMap = require('weakmap'),
    modelOperations = require('./modelOperations'),
    oozePaths = require('./paths'),
    get = modelOperations.get,
    set = modelOperations.set,
    wildcardRegex = new RegExp('(\\' + oozePaths.constants.wildcard + ')', 'g'),
    arrayProto = [];

var isBrowser = typeof Node != 'undefined';

module.exports = function(modelGet){
    var modelBindings,
        modelBindingDetails,
        callbackReferenceDetails,
        modelReferences;

    function resetEvents(){
        modelBindings = {};
        modelBindingDetails = new WeakMap();
        callbackReferenceDetails = new WeakMap();
        modelReferences = new WeakMap();
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
},{"./modelOperations":4,"./paths":12,"weakmap":10}],4:[function(require,module,exports){
var memoiseCache = {};

// Lots of similarities between get and set, refactor later to reuse code.
function get(path, model) {
    if (!path) {
        return model;
    }

    var memoiseObject = memoiseCache[path];
    if(memoiseObject && memoiseObject.model === model){
        return memoiseObject.value;
    }

    var pathParts = path.split('.'),
        reference = model,
        index = 0,
        pathLength = pathParts.length;

    for(; index < pathLength; index++){
        var key = pathParts[index];

        if (reference == null) {
            break;
        } else if (typeof reference[key] === "object") {
            reference = reference[key];
        } else {
            reference = reference[key];

            // If there are still keys in the path that have not been accessed,
            // return undefined.
            if(index < pathLength - 1){
                reference = undefined;
            }
            break;
        }
    }

    memoiseCache[path] = {
        model: model,
        value: reference
    };

    return reference;
}

function overwriteModel(replacement, model){
    if(replacement === model){
        return;
    }
    for (var modelProp in model) {
        delete model[modelProp];
    }
    for (var replacementProp in replacement) {
        model[replacementProp] = replacement[replacementProp];
    }
}

function set(path, value, model) {
    // passed a null or undefined path, do nothing.
    if (!path) {
        return;
    }

    memoiseCache = {};

    // If you just pass in an object, you are overwriting the model.
    if (typeof path === "object") {
        value = path;
        path = paths.createRoot();
    }

    var pathParts = path.split('.'),
        index = 0,
        pathLength = pathParts.length;

    var reference = model,
        keysChanged;

    for(; index < pathLength; index++){
        var key = pathParts[index];

        // if we have hit a non-object property on the reference and we have more keys after this one
        // make an object (or array) here and move on.
        if ((typeof reference[key] !== "object" || reference[key] === null) && index < pathLength - 1) {
            if (!isNaN(key)) {
                reference[key] = [];
            }
            else {
                reference[key] = {};
            }
        }
        if (index === pathLength - 1) {
            // if we are at the end of the line, set to the model
            if(!(key in reference)){
                keysChanged = true;
            }
            reference[key] = value;
        }
            //otherwise, dig deeper
        else {
            reference = reference[key];
        }
    }

    return keysChanged;
}

module.exports = {
    get: get,
    set: set
};
},{}],5:[function(require,module,exports){
(function (process){var EventEmitter = require('events').EventEmitter,
    deepEqual = require('deep-equal'),
    encodeResults = require('./results');

var nextTick = process && process.nextTick || setTimeout;


function instantiate(){
    var testsToRun = [],
        testsRun = [],
        totalTests = 0,
        totalAssersions = 0,
        completedAssersions = 0,
        begun = false,
        timeout = 0,
        only;

    function Test(name, testFunction){
        this._plan = 0;
        this._count = 0;
        this._assersions = [];
        this.name = name;
        this._testFunction = testFunction;
    }

    // Unused currently.
    // Test.prototype = Object.create(EventEmitter.prototype);
    // Test.prototype.constructor = Test;

    function setTestTimeout(time){
        timeout = Math.max(timeout, time);
    };

    Test.prototype.timeout = setTestTimeout;

    Test.prototype.comment = function (message) {
        // ToDo
    };

    Test.prototype.plan = function(ammount){
        this._plan = ammount;
    };

    Test.prototype._run = function(){
        var test = this;
        try {
            test._testFunction(this);
        }
        catch (err) {
            test.error(err);
        }
    };

    Test.prototype._assert = function(details){
        if(details.operator !== 'end'){
            this._count++;
        }
        if(this._ended){
            if(details.operator === 'end' || details.operator === 'fail'){
                return;
            }
            this.fail('asserted after test has ended');
        }
        this._assersions.push(details);
    };

    Test.prototype.end = function (message) {
        var ok = this._plan === this._count;

        if(this._ended){
            return;
        }

        if(ok){
            this._assert({
                ok: true,
                message: message,
                operator: 'end'
            });
        }else{
            this._assert({
                ok: false,
                expected: this._plan,
                actual: this._count,
                message: 'plan != count',
                operator: 'end'
            });
        }

        this._ended = true;
    };

    Test.prototype.error = function(error, message){
        this._assert({
            ok: !error,
            message : message || String(error),
            operator : 'error',
            actual : error
        });
    };

    Test.prototype.pass = function(message){
        this._assert({
            ok: true,
            message: message,
            operator: 'pass'
        });
    };

    Test.prototype.fail = function(message){
        this._assert({
            message: message,
            operator: 'fail'
        });
    };

    Test.prototype.skip = function(message){
        this._assert({
            message: message,
            skip: true,
            operator: 'skip'
        });
    };

    Test.prototype.ok = function(value, message){
        this._assert({
            actual: value,
            ok: !!value,
            message: message,
            operator: 'ok'
        });
    };

    Test.prototype.notOk = function(value, message){
        this._assert({
            actual: value,
            ok:!value,
            message: message,
            operator: 'notOk'
        });
    };

    Test.prototype.equal = function(value, expected, message){
        this._assert({
            actual: value,
            expected: expected,
            ok: value === expected,
            message: message,
            operator: 'equal'
        });
    };

    Test.prototype.deepEqual = function(value, expected, message){
        this._assert({
            actual: value,
            expected: expected,
            ok: deepEqual(value, expected, { strict: true }),
            message: message,
            operator: 'deepEqual'
        });
    };

    Test.prototype.deepLooseEqual = function(value, expected, message){
        this._assert({
            actual: value,
            expected: expected,
            ok: deepEqual(value, expected),
            message: message,
            operator: 'deepLooseEqual'
        });
    };

    Test.prototype.notDeepEqual = function(value, expected, message){
        this._assert({
            actual: value,
            expected: expected,
            ok: !deepEqual(value, expected, { strict: true }),
            message: message,
            operator: 'notDeepEqual'
        });
    };

    Test.prototype.notDeepLooseEqual = function(value, expected, message){
        this._assert({
            actual: value,
            expected: expected,
            ok: !deepEqual(value, expected),
            message: message,
            operator: 'notDeepLooseEqual'
        });
    };

    Test.prototype['throws'] = function (fn, expected, message) {
        var caughtError,
            passed;

        if(typeof expected === 'string'){
            message = expected;
            expected = undefined;
        }

        try{
            fn();
        }catch(error){
            caughtError = {error: error};
        }

        passed = caughtError;

        if(expected instanceof RegExp){
            passed = expected.test(caughtError && caughtError.error);
            expected = String(expected);
        }

        this._assert({
            ok: passed,
            message : message || 'should throw',
            operator : 'throws',
            actual : caughtError && caughtError.error,
            expected : expected,
            error: !passed && caughtError && caughtError.error
        });
    };

    Test.prototype.doesNotThrow = function (fn, expected, message) {
        var caughtError;

        if(typeof expected === 'string'){
            message = expected;
            expected = undefined;
        }

        try{
            fn();
        }catch(error){
            caughtError = { error : error };
        }

        this._assert({
            ok: !caughtError,
            message: message || 'should not throw',
            operator: 'doesNotThrow',
            actual: caughtError && caughtError.error,
            expected: expected,
            error: caughtError && caughtError.error
        });
    };

    function runNextTest(){
        while(testsToRun.length){
            var nextTest = testsToRun.shift();
            nextTest._run();
            testsRun.push(nextTest);
        }
    }

    function complete(){
        var results = encodeResults(testsRun);

        if(testsToRun.length !== totalTests){
            // tests level problem
        }

        grape.emit('complete', results);

        if(!grape.silent){
            console.log(results);
        }
    }

    function begin(){
        if(!begun){
            begun = true;
            nextTick(runNextTest);
            nextTick(function(){
                if(!process || !process.on || grape.useTimeout){
                    setTimeout(complete, timeout);
                }else{
                    process.on('exit', complete);
                }
            });
        }
    }

    function grape(name, testFunction){
        if(only){
            return;
        }
        totalTests++;
        testsToRun.push(new Test(name, testFunction));
        begin();
    }
    grape.timeout = setTestTimeout;

    grape.only = function(name, testFunction){
        if(only){
            throw "There can be only one only";
        }
        only = true;
        testsToRun = [new Test(name, testFunction)];
        begin();
    };

    for(var key in EventEmitter.prototype){
        grape[key] = EventEmitter.prototype[key];
    }

    grape.createNewInstance = instantiate;
    grape.Test = Test;

    return grape;
}

module.exports = instantiate();
}).call(this,require("C:\\Users\\Kory.korys-laptop\\AppData\\Roaming\\npm\\node_modules\\browserify\\node_modules\\insert-module-globals\\node_modules\\process\\browser.js"))
},{"./results":9,"C:\\Users\\Kory.korys-laptop\\AppData\\Roaming\\npm\\node_modules\\browserify\\node_modules\\insert-module-globals\\node_modules\\process\\browser.js":2,"deep-equal":6,"events":1}],6:[function(require,module,exports){
var pSlice = Array.prototype.slice;
var objectKeys = require('./lib/keys.js');
var isArguments = require('./lib/is_arguments.js');

var deepEqual = module.exports = function (actual, expected, opts) {
  if (!opts) opts = {};
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() === expected.getTime();

  // 7.3. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (typeof actual != 'object' && typeof expected != 'object') {
    return opts.strict ? actual === expected : actual == expected;

  // 7.4. For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected, opts);
  }
}

function isUndefinedOrNull(value) {
  return value === null || value === undefined;
}

function objEquiv(a, b, opts) {
  if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return deepEqual(a, b, opts);
  }
  try {
    var ka = objectKeys(a),
        kb = objectKeys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!deepEqual(a[key], b[key], opts)) return false;
  }
  return true;
}

},{"./lib/is_arguments.js":7,"./lib/keys.js":8}],7:[function(require,module,exports){
var supportsArgumentsClass = (function(){
  return Object.prototype.toString.call(arguments)
})() == '[object Arguments]';

exports = module.exports = supportsArgumentsClass ? supported : unsupported;

exports.supported = supported;
function supported(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
};

exports.unsupported = unsupported;
function unsupported(object){
  return object &&
    typeof object == 'object' &&
    typeof object.length == 'number' &&
    Object.prototype.hasOwnProperty.call(object, 'callee') &&
    !Object.prototype.propertyIsEnumerable.call(object, 'callee') ||
    false;
};

},{}],8:[function(require,module,exports){
exports = module.exports = typeof Object.keys === 'function'
  ? Object.keys : shim;

exports.shim = shim;
function shim (obj) {
  var keys = [];
  for (var key in obj) keys.push(key);
  return keys;
}

},{}],9:[function(require,module,exports){

// Taken from https://github.com/substack/tape/blob/master/lib/results.js

function encodeResult (result, count) {
    var output = '';
    output += (result.ok ? 'ok ' : 'not ok ') + count;
    output += result.message ? ' ' + result.message.toString().replace(/\s+/g, ' ') : '';

    if (result.skip) output += ' # SKIP';
    else if (result.todo) output += ' # TODO';

    output += '\n';
    if (result.ok) return output;

    var outer = '  ';
    var inner = outer + '  ';
    output += outer + '---\n';
    output += inner + 'operator: ' + result.operator + '\n';

    var ex = JSON.stringify(result.expected) || '';
    var ac = JSON.stringify(result.actual) || '';

    if (Math.max(ex.length, ac.length) > 65) {
        output += inner + 'expected:\n' + inner + '  ' + ex + '\n';
        output += inner + 'actual:\n' + inner + '  ' + ac + '\n';
    }
    else {
        output += inner + 'expected: ' + ex + '\n';
        output += inner + 'actual:   ' + ac + '\n';
    }
    if (result.at) {
        output += inner + 'at: ' + result.at + '\n';
    }
    if (result.operator === 'error' && result.actual && result.actual.stack) {
        var lines = String(result.actual.stack).split('\n');
        output += inner + 'stack:\n';
        output += inner + '  ' + lines[0] + '\n';
        for (var i = 1; i < lines.length; i++) {
            output += inner + lines[i] + '\n';
        }
    }

    output += outer + '...\n';
    return output;
}

function encodeResults(results){
    var output = '',
        count = 0,
        passed = 0,
        failed = 0;

    for(var i = 0; i < results.length; i++) {
        var test = results[i];

        output += '# ' + test.name + '\n';

        if(test._plan !== test._count){
            test._assert({
                ok: false,
                message: 'plan != count',
                operator: 'end'
            });
        }

        for(var j = 0; j < test._assersions.length; j++) {
            var assersion = test._assersions[j];
            count++;

            if(assersion.ok){
                passed++;
            }else{
                failed++;
            }

            output += encodeResult(assersion, count);
        }
    }

    output += '\n1..' + count + '\n';
    output += '# tests ' + count + '\n';
    output += '# pass  ' + passed + '\n';

    if(failed) {
        output += '# fail  ' + failed + '\n';
    }else{
        output += '\n# ok\n';
    }

    return output;
}

module.exports = encodeResults;
},{}],10:[function(require,module,exports){
/* (The MIT License)
 *
 * Copyright (c) 2012 Brandon Benvie <http://bbenvie.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the 'Software'), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute,
 * sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included with all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
 * BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY  CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// Original WeakMap implementation by Gozala @ https://gist.github.com/1269991
// Updated and bugfixed by Raynos @ https://gist.github.com/1638059
// Expanded by Benvie @ https://github.com/Benvie/harmony-collections

void function(global, undefined_, undefined){
  var getProps = Object.getOwnPropertyNames,
      defProp  = Object.defineProperty,
      toSource = Function.prototype.toString,
      create   = Object.create,
      hasOwn   = Object.prototype.hasOwnProperty,
      funcName = /^\n?function\s?(\w*)?_?\(/;


  function define(object, key, value){
    if (typeof key === 'function') {
      value = key;
      key = nameOf(value).replace(/_$/, '');
    }
    return defProp(object, key, { configurable: true, writable: true, value: value });
  }

  function nameOf(func){
    return typeof func !== 'function'
          ? '' : 'name' in func
          ? func.name : toSource.call(func).match(funcName)[1];
  }

  // ############
  // ### Data ###
  // ############

  var Data = (function(){
    var dataDesc = { value: { writable: true, value: undefined } },
        datalock = 'return function(k){if(k===s)return l}',
        uids     = create(null),

        createUID = function(){
          var key = Math.random().toString(36).slice(2);
          return key in uids ? createUID() : uids[key] = key;
        },

        globalID = createUID(),

        storage = function(obj){
          if (hasOwn.call(obj, globalID))
            return obj[globalID];

          if (!Object.isExtensible(obj))
            throw new TypeError("Object must be extensible");

          var store = create(null);
          defProp(obj, globalID, { value: store });
          return store;
        };

    // common per-object storage area made visible by patching getOwnPropertyNames'
    define(Object, function getOwnPropertyNames(obj){
      var props = getProps(obj);
      if (hasOwn.call(obj, globalID))
        props.splice(props.indexOf(globalID), 1);
      return props;
    });

    function Data(){
      var puid = createUID(),
          secret = {};

      this.unlock = function(obj){
        var store = storage(obj);
        if (hasOwn.call(store, puid))
          return store[puid](secret);

        var data = create(null, dataDesc);
        defProp(store, puid, {
          value: new Function('s', 'l', datalock)(secret, data)
        });
        return data;
      }
    }

    define(Data.prototype, function get(o){ return this.unlock(o).value });
    define(Data.prototype, function set(o, v){ this.unlock(o).value = v });

    return Data;
  }());


  var WM = (function(data){
    var validate = function(key){
      if (key == null || typeof key !== 'object' && typeof key !== 'function')
        throw new TypeError("Invalid WeakMap key");
    }

    var wrap = function(collection, value){
      var store = data.unlock(collection);
      if (store.value)
        throw new TypeError("Object is already a WeakMap");
      store.value = value;
    }

    var unwrap = function(collection){
      var storage = data.unlock(collection).value;
      if (!storage)
        throw new TypeError("WeakMap is not generic");
      return storage;
    }

    var initialize = function(weakmap, iterable){
      if (iterable !== null && typeof iterable === 'object' && typeof iterable.forEach === 'function') {
        iterable.forEach(function(item, i){
          if (item instanceof Array && item.length === 2)
            set.call(weakmap, iterable[i][0], iterable[i][1]);
        });
      }
    }


    function WeakMap(iterable){
      if (this === global || this == null || this === WeakMap.prototype)
        return new WeakMap(iterable);

      wrap(this, new Data);
      initialize(this, iterable);
    }

    function get(key){
      validate(key);
      var value = unwrap(this).get(key);
      return value === undefined_ ? undefined : value;
    }

    function set(key, value){
      validate(key);
      // store a token for explicit undefined so that "has" works correctly
      unwrap(this).set(key, value === undefined ? undefined_ : value);
    }

    function has(key){
      validate(key);
      return unwrap(this).get(key) !== undefined;
    }

    function delete_(key){
      validate(key);
      var data = unwrap(this),
          had = data.get(key) !== undefined;
      data.set(key, undefined);
      return had;
    }

    function toString(){
      unwrap(this);
      return '[object WeakMap]';
    }

    try {
      var src = ('return '+delete_).replace('e_', '\\u0065'),
          del = new Function('unwrap', 'validate', src)(unwrap, validate);
    } catch (e) {
      var del = delete_;
    }

    var src = (''+Object).split('Object');
    var stringifier = function toString(){
      return src[0] + nameOf(this) + src[1];
    };

    define(stringifier, stringifier);

    var prep = { __proto__: [] } instanceof Array
      ? function(f){ f.__proto__ = stringifier }
      : function(f){ define(f, stringifier) };

    prep(WeakMap);

    [toString, get, set, has, del].forEach(function(method){
      define(WeakMap.prototype, method);
      prep(method);
    });

    return WeakMap;
  }(new Data));

  var defaultCreator = Object.create
    ? function(){ return Object.create(null) }
    : function(){ return {} };

  function createStorage(creator){
    var weakmap = new WM;
    creator || (creator = defaultCreator);

    function storage(object, value){
      if (value || arguments.length === 2) {
        weakmap.set(object, value);
      } else {
        value = weakmap.get(object);
        if (value === undefined) {
          value = creator(object);
          weakmap.set(object, value);
        }
      }
      return value;
    }

    return storage;
  }


  if (typeof module !== 'undefined') {
    module.exports = WM;
  } else if (typeof exports !== 'undefined') {
    exports.WeakMap = WM;
  } else if (!('WeakMap' in global)) {
    global.WeakMap = WM;
  }

  WM.createStorage = createStorage;
  if (global.WeakMap)
    global.WeakMap.createStorage = createStorage;
}((0, eval)('this'));

},{}],11:[function(require,module,exports){
var modelOpperations = require('./modelOperations')
    paths = require('./paths'),
    createEvents = require('./events'),
    arrayProto = [],
    rootKey = '$';

function Scope(scope, path){
    this._ooze = scope;
    this._path = path;
}

/**
    ## Get

        scope.get(path);

    Returns a value in the model at the given path.
*/
Scope.prototype.get = function(path){
    return this._ooze.get(this.resolve(path), this._model);
};

/**
    ## Set

        scope.set(path, value);

    Set a value in the model at the given path.
*/
Scope.prototype.set = function(path, value){
    if(arguments.length < 2){
        value = path;
        path = '';
    }

    this._ooze.set(this.resolve(path), value);
};

/**
    ## Remove

        scope.remove(path);

    Remove a key from the model at the given path.
*/
Scope.prototype.remove = function(path){
    this._ooze.remove(this.resolve(path));
};

/**
    ## Trigger

        scope.trigger(path);

    Emit a change event at the given path.
*/
Scope.prototype.trigger = function(path){
    this._ooze.trigger(this.resolve(path));
};

/**
    ## Bind

        scope.bind(path, callback);

    Create a getter/setter function scoped to the given path, and bind a callback to the path while you're at it.
*/
Scope.prototype.bind = function(path, callback){
    var resolvedPath = this.resolve(path),
        scope = this;

    callback && this._ooze.on(resolvedPath, callback);

    return function(value){
        if(arguments.length === 0){
            return scope._ooze.get(resolvedPath);
        }
        scope._ooze.set(resolvedPath, value);
    };
};

/**
    ## Scope To

        scope.scopeTo(path);

    Returns a new scope object at the given path

    eg:

    Assume a model:

        {
            things:{
                stuff: 1
            }
        }

    Create a scope that is relative to a given path:

        var thingScope = scope.scopeTo('things');

    Now calls to thingScope will be based off the path 'things':

        thingsScope.get('stuff')

    Will return 1
*/
Scope.prototype.scopeTo = function(path){
    return new Scope(this._ooze, this.resolve(path));
};

/**
    ## Resolve

        scope.resolve(path);

    Returns a full path as constructed using a scopes path, and a given path.

    eg:

        var thingScope = scope.scopeTo('things');

        thingScope.resolve('stuff');

    Will return 'things.stuff'
*/
Scope.prototype.resolve = function(path){
    return paths.join([this._path, path]);
};

/**
    ## On

        scope.on(path, callback);

    Set a listener for changes on the model at the given path.
*/
Scope.prototype.on = function(path, callback){
    if(arguments.length === 1){
        callback = path,
        path = null;
    }

    var params = path ? path.split(' ') : [null];

    for(var i = 0; i < params.length; i++) {
        params[i] = this.resolve(params[i]);
    }

    return this._ooze.on(params, callback);
};

/**
    ## Off / Remove Listener

        scope.off(path, callback);

    Remove a previously bound listener
*/
Scope.prototype.removeListener =
Scope.prototype.off = function(path, callback){
    var params = path ? path.split(' ') : [''];

    for(var i = 0; i < params.length; i++) {
        params[i] = this.resolve(params[i]);
    }

    this._ooze.off(params, callback);
};

/**
    ## Add Constraint

        scope.addConstraint(path, function);

    Add a function to call before a value is set to a path in the model.

    eg:

    Add a constraint only allow a value between 0 and 100

        var constraintFn = scope.addConstraint('someValue', function(value){
            return Math.max(Math.min(value, 100)0);
        });

*/
Scope.prototype.addConstraint = function(path, callback){
    var resolvedPath = this.resolve(path);

    this._ooze.addConstraint(resolvedPath, callback);

    return callback;
};

/**
    ## Remove Constraint

        scope.removeConstraint(path, function);

    Remove an added constraint.

    eg:

    Remove the above constraint:

        scope.removeConstraint('someValue', constraintFn);

*/
Scope.prototype.removeConstraint = function(path, callback){
    var resolvedPath = this.resolve(path);

    this._ooze.removeConstraint(resolvedPath, callback);
};

/**
    ## Create Transform

        scope.createTransform(path, transform);

    Create a new scope that contains transformed data.

*/
Scope.prototype.createTransform = function(path, transform){
    var resolvedPath = this.resolve(path);

    return this._ooze.createTransform(resolvedPath, transform);
};

function Ooze(model){
    this._model = {};
    this._model[rootKey] = model;
    this._events = createEvents(this.get.bind(this));
    this._constraints = {};
    this._transformId = 0;
    return new Scope(this, rootKey);
}
Ooze.prototype.get = function(path){
    return modelOpperations.get(path, this._model);
};
Ooze.prototype.set = function(path, value){

    if(this._constraints[path]){
        for(var i = 0; i < this._constraints[path].length; i++) {
            value = this._constraints[path][i](value);
        }
    }

    if(this.get(path) === value){
        // If you are setting the same thing that is already there,
        // Don't raise events.
        // Potentially an issue if you update objs directly
        // and use .set() to try and force events.
        // But then you should be using .trigger().
        return;
    }

    modelOpperations.set(path, value, this._model);
    this.trigger(path);
};
Ooze.prototype.remove = function(path){
    if(!path || path === rootKey){
        delete this._model[rootKey];
        this.trigger('');
        return;
    }

    var lastKey = paths.toParts(path).pop(),
        upOnePath = paths.up(path),
        parent = this.get(upOnePath);

    // Key already does not exist.
    // Do nothing.
    if(!(lastKey in parent)){
        return;
    }

    if(Array.isArray(parent)){
        parent.splice(lastKey, 1);
    }else{
        delete parent[lastKey];
    }

    this.trigger(upOnePath);
};

function applyParameters(ooze, params, callback){
    return function(event){
        var args = [];
        for(var i = 0; i < params.length; i++) {
            if(event && event.path === params[i] && event.resolvedPath){
                args.push(ooze.get(event.resolvedPath));
                continue;
            }
            args.push(ooze.get(params[i]));
        }
        callback.apply(event, args);
    }
}

Ooze.prototype.on = function(params, callback){
    if(typeof params === 'string'){
        params  = params.split(' ');
    }

    callback.__oozeCallback = applyParameters(this, params, callback);

    this._events.on(params, callback.__oozeCallback);

    return callback;
};
Ooze.prototype.off = function(params, callback){
    if(typeof params === 'string'){
        params  = params.split(' ');
    }

    this._events.off(params, callback.__oozeCallback);
};
Ooze.prototype.trigger = function(path){
    this._events.trigger(path);
};
Ooze.prototype.addConstraint = function(path, callback){
    this._constraints[path] = this._constraints[path] || [];
    this._constraints[path].push(callback);
};
Ooze.prototype.removeConstraint = function(path, callback){
    if(!this._constraints[path]){
        return;
    }

    var index;
    while((index = this._constraints[path].indexOf(callback)) >= 0){
        this._constraints[path].splice(index, 1);
    }
};
function compareKeys(object1, object2){
    if (typeof object1 !== 'object' || typeof object2 !== 'object') {
        return false;
    }
    var keys1 = Object.keys(object1),
        keys2 = Object.keys(object2);

    if(keys1.length !== keys2.length){
        return false;
    }
    for(var i = 0; i < keys1.length; i++){
        if(keys1[i] !== keys2[i]){
            return false;
        }
    }

    return true;
}
Ooze.prototype.createTransform = function(params, transform){
    if(typeof params === 'string'){
        params  = params.split(' ');
    }

    var ooze = this,
        transformId = (++this._transformId).toString(),
        transformScope = new Scope(this, transformId);

    var applyTransform = function(value){
        var oldValue = transformScope.get(),
            newValue = transform.apply(null, arguments);

        if(!compareKeys(oldValue, newValue)){
            ooze.set(transformId, transform.apply(null, arguments));
        }
    };

    this.on(params, applyTransform);

    applyParameters(this, params, applyTransform)();

    var transformScope = new Scope(this, transformId);

    transformScope.destroy = function(){
        ooze.off(params, applyTransform);
        ooze.remove(transformId);
    };

    return transformScope;
};

module.exports = Ooze;

},{"./events":3,"./modelOperations":4,"./paths":12}],12:[function(require,module,exports){
var pathSeparator = '.',
    wildcard = '*';

function pathToParts(path){
    if(!path){
        return [];
    }
    return path.split(pathSeparator);
}

function concat(){
    var resultPaths = [],
        arg;
    for(var i = 0; i < arguments.length; i++) {
        arg = arguments[i];

        if(Array.isArray(arg)){
            resultPaths.push(join(arg));
            continue;
        }
        resultPaths.push(pathSegment);
    }

    return join(resultPaths);
}

function join(paths){
    var resultPaths = [],
        path;

    for(var i = 0; i < paths.length; i++) {
        path = paths[i];

        if(path == null || path === ''){
            continue;
        }
        resultPaths.push(path);
    }

    return resultPaths.join(pathSeparator);
}

function up(path, number){
    number = number || 1;
    return appendPath(pathToParts(path).slice(0,-number));
}

module.exports = {
    join: join,
    concat: concat,
    toParts: pathToParts,
    up: up,
    constants:{
        separator: pathSeparator,
        wildcard: wildcard
    }
};
},{}],13:[function(require,module,exports){
var grape = require('grape'),
    Ooze = require('../');
/*
grape('get', function(t){
    t.plan(1);

    var model = new Ooze({a:1});

    t.equal(model.get('a'), 1);
});

grape('get deep', function(t){
    t.plan(1);

    var model = new Ooze({a:{b:1}});

    t.equal(model.get('a.b'), 1);
});

grape('set', function(t){
    t.plan(1);

    var model = new Ooze();

    model.set('a', 1);

    t.equal(model.get('a'), 1);
});

grape('set deep', function(t){
    t.plan(1);

    var model = new Ooze();

    model.set('a.b',1);

    t.equal(model.get('a.b'), 1);
});

grape('on target', function(t){
    t.plan(2);

    var model = new Ooze();

    model.on('a', function(a){
        t.equal(a, 1);
        t.equal(this.captureType, 'target');
    });

    model.set('a',1);
});

grape('on bubbled', function(t){
    t.plan(2);

    var model = new Ooze();

    model.on('a', function(a){
        t.deepEqual(a, {b:1});
        t.equal(this.captureType, 'bubble');
    });

    model.set('a.b',1);
});

grape('off target', function(t){
    t.plan(2);

    var model = new Ooze();

    var handler = model.on('a', function(a){
        t.equal(a, 1);
        t.equal(this.captureType, 'target');
    });

    model.set('a',1);

    model.off('a', handler);

    model.set('a',2);
});

grape('off bubbled', function(t){
    t.plan(2);

    var model = new Ooze();

    var handler = model.on('a', function(a){
        t.deepEqual(a, {b:1});
        t.equal(this.captureType, 'bubble');
    });

    model.set('a.b', 1);

    model.off('a', handler);

    model.set('a.b', 2);
});

grape('on multiple paths', function(t){
    t.plan(3);*/

    var model = new Ooze();

    model.on('a b c', function(a, b, c){
        t.equal(a, 1);
        t.equal(b, 2);
        t.equal(c, 3);
    });

    model.set({a:1, b:2, c:3});
/*});

grape('on wildcards', function(t){
    t.plan(2);

    var model = new Ooze();

    model.on('a.*.c', function(a, b, c){
        t.pass();
    });

    model.set('a.b.c', true);
    model.set('a.b.b', true);
    model.set('b.b.c', true);
    model.set('a.wat.c', true);
});

grape('on wildcards event', function(t){
    t.plan(2);

    var model = new Ooze();

    model.on('a.*.c', function(c){
        t.equal(this.target, '$.a.b.c');
        t.deepEqual(this.wildcardValues, ['b']);
    });

    model.set('a.b.c', true);
});

grape('on wildcards values', function(t){
    t.plan(1);

    var model = new Ooze();

    model.on('a.*.c', function(c){
        t.equal(c, true);
    });

    model.set('a.b.c', true);
});

grape('scopeTo', function(t){
    t.plan(1);

    var model = new Ooze({a:1}),
        aScope = model.scopeTo('a');

    t.equal(aScope.get(), 1);
});

grape('bind get', function(t){
    t.plan(1);

    var model = new Ooze({a:1}),
        getterSetter = model.bind('a');

    getterSetter(1);

    t.equal(getterSetter(), 1);
});

grape('bind set', function(t){
    t.plan(1);

    var model = new Ooze({a:1}),
        getterSetter = model.bind('a');

    getterSetter(2);

    t.equal(model.get('a'), 2);
});

grape('bind handler', function(t){
    t.plan(1);

    var model = new Ooze({a:1}),
        getterSetter = model.bind('a', function(a){
            t.equal(a, 2);
        });

    getterSetter(2);
});

grape('create transform', function(t){
    t.plan(1);

    var model = new Ooze({a:[
            {b:1},
            {b:1},
            {b:2},
            {b:1},
            {b:2}
        ]}),
        transformModel = model.createTransform('a', function(a){
            return a.filter(function(obj){
                return obj.b >= 2;
            });
        });

    t.equal(transformModel.get('1.b'), 2);
});

grape('transform reference', function(t){
    t.plan(2);

    var model = new Ooze({a:[
            {b:1},
            {b:1},
            {b:2},
            {b:1},
            {b:2}
        ]}),
        transformModel = model.createTransform('a', function(a){
            return a.filter(function(obj){
                return obj.b >= 2;
            });
        });


    transformModel.set('1.b', 3);

    t.equal(transformModel.get('1.b'), 3);
    t.equal(model.get('a.4.b'), 3);
});

grape('transform events', function(t){
    t.plan(2);

    var model = new Ooze({a:[
            {b:1},
            {b:1},
            {b:2},
            {b:1},
            {b:2}
        ]}),
        transformModel = model.createTransform('a', function(a){
            return a.filter(function(obj){
                return obj.b >= 2;
            });
        });

    model.on('a.4', function(){
        t.pass('recieved event on root model');
    });

    transformModel.on('1', function(){
        t.pass('recieved event on transformModel model');
    });

    transformModel.set('1.b', 3);
});

grape('transform updates', function(t){
    t.plan(1);

    var model = new Ooze({a:[
            {b:1},
            {b:1},
            {b:2},
            {b:1},
            {b:2}
        ]}),
        transformModel = model.createTransform('a', function(a){
            return a.filter(function(obj){
                return obj.b >= 2;
            });
        });

    transformModel.on(function(list){
        t.equal(list.length, 3);
    });

    model.set('a.5.b', 4);
});*/
},{"../":11,"grape":5}]},{},[13])
