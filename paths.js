var pathSeparator = '.',
    wildcard = '*';

function pathToParts(path){
    if(!path){
        return [];
    }
    return path.split(pathSeparator);
}

function createArgumentsKey(arguments){
    var key = '';

    for(var i = 0; i < arguments.length; i++) {
        key += ',' + arguments[i];
    }
    return key;
}

var appendCache = {};
function appendPath(){
    var argumentsKey = createArgumentsKey(arguments),
        all = [],
        arg;

    if(appendCache[argumentsKey]){
        return appendCache[argumentsKey];
    }

    for(var i = 0; i < arguments.length; i++) {
        arg = arguments[i];
        if(!arg){
            continue;
        }
        if(typeof arg === 'string' || typeof arg === 'number'){
            all.push(arg);
            continue;
        }
        var pathSegment = appendPath.apply(null, arg);
        if(pathSegment){
            all.push(pathSegment);
        }
    }

    return (appendCache[argumentsKey] = all.join(pathSeparator));
}

function up(path, number){
    number = number || 1;
    return appendPath(pathToParts(path).slice(0,-number));
}

module.exports = {
    append: appendPath,
    toParts: pathToParts,
    up: up,
    constants:{
        separator: pathSeparator,
        wildcard: wildcard
    }
};