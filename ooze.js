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
