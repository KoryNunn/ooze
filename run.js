var paths = require('./paths');

function parse(parameter){
    var parts = paths.toParts(parameter),
        keyParts = parts[parts.length-1].split(':');

    parts[parts.length-1] = keyParts[0];

    return {
        path: paths.join(parts),
        key: keyParts[1] || keyParts[0]
    };
}

function run(model, parameters, fn){
    var originalScope = {},
        scope = {};

    if(!Array.isArray(parameters)){
        parameters = [parameters];
    }

    var pathMap = [];

    parameters.forEach(function(parameter){
        var map = parse(parameter);

        if(map.key in scope){
            throw 'two paths with the same final key were passed to run, alias conflicting keys with a colon ("foo.a", "bar.a:barA")';
        }
        originalScope[map.key] = scope[map.key] = model.get(map.path);
        pathMap.push(map);
    });

    var result = fn(scope);

    pathMap.forEach(function(map){

        if(scope[map.key] && typeof scope[map.key] === 'object' && scope[map.key] === originalScope[map.key]){
            model.trigger(map.path);
        }else{
            model.set(map.path, scope[map.key]);
        }
    });

    return result;
}

module.exports = run;