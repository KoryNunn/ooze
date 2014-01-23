var modelOpperations = require('./modelOperations')
    paths = require('./paths'),
    createEvents = require('./events'),
    arrayProto = [];

function Scope(scope, path){
    this._ooze = scope;
    this._path = path;
}
Scope.prototype.get = function(path){
    return this._ooze.get(this.resolve(path), this._model);
};
Scope.prototype.set = function(path, value){
    var resolvedPath = this.resolve(path);

    this._ooze.set(resolvedPath, value);
};
Scope.prototype.bind = function(path, callback){
    var resolvedPath = this.resolve(path),
        scope = this;

    callback && this._ooze.on(path, callback);

    return function(value){
        if(arguments.length === 0){
            return scope._ooze.get(resolvedPath);
        }
        scope._ooze.set(resolvedPath, value);
    };
};
Scope.prototype.scopeTo = function(path){
    return new Scope(this._ooze, this.resolve(path));
};
Scope.prototype.resolve = function(){
    var args = arrayProto.slice.call(arguments);
    if(this._path){
        args.unshift(this._path);
    }
    return paths.append(args);
};

Scope.prototype.on = function(path, callback){
    if(arguments.length === 1){
        callback = path,
        path = null;
    }

    var params = path ? path.split(' ') : [null];

    for(var i = 0; i < params.length; i++) {
        params[i] = this.resolve(params[i]);
    }

    this._ooze.on(params, callback);
};
Scope.prototype.removeListener =
Scope.prototype.off = function(path, callback){
    params = path.split(' ');

    for(var i = 0; i < params.length; i++) {
        params[i] = this.resolve(params[i]);
    }

    this._ooze.off(params, callback);
};

function Ooze(model){
    this._model = model || {};
    this._events = createEvents(this.get.bind(this));
    return new Scope(this);
}
Ooze.prototype.get = function(path){
    return modelOpperations.get(path, this._model);
};
Ooze.prototype.set = function(path, value){
    if(this._transforms[path]){
        for(var i = 0; i < this._transforms[path].length; i++) {
            value = this._transforms[path][i](value);
        }
    }
    modelOpperations.set(path, value, this._model);
    this.trigger(path);
};

function applyParameters(ooze, params, callback){
    return function(event){
        var args = [];
        for(var i = 0; i < params.length; i++) {
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
Ooze.prototype.addTransform = function(path, callback){
    this._transforms[path] = this._transforms[path] || [];
    this._transforms[path].push(callback);
};
Ooze.prototype.removeTransform = function(path, callback){
    if(!this._transforms[path]){
        return;
    }

    var index;
    while(index = this._transforms[path].indexOf(callback) >= 0){
        this._transforms[path].splice(index, 1);
    }
};

module.exports = Ooze;
