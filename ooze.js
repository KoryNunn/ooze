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
Scope.prototype.createSetter = function(path){
    return this._ooze.set.bind(this, this.resolve(path));
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
    params = path.split(' ');

    for(var i = 0; i < params.length; i++) {
        params[i] = this.resolve(params[i]);
    }

    this._ooze.on(params, callback);
};

function Ooze(model){
    this._model = model;
    this._events = createEvents(this.get.bind(this));
    return new Scope(this);
}
Ooze.prototype.get = function(path){
    return modelOpperations.get(path, this._model);
};
Ooze.prototype.set = function(path, value){
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

    this._events.on(params, applyParameters(this, params, callback));
};
Ooze.prototype.trigger = function(path){
    this._events.trigger(path);
};

module.exports = Ooze;
