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

// This is an extremely hot function
// string concat is used over array.join
// for performance.
function join(paths){
    var result = '',
        path;

    for(var i = 0; i < paths.length; i++) {
        path = paths[i];

        if(path == null || path === ''){
            continue;
        }

        if(result === ''){
            result = path;
            continue;
        }

        result += '.' + path;
    }

    return result;
}

function up(path, number){
    number = number || 1;
    return join(pathToParts(path).slice(0,-number));
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