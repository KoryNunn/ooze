var pathSeparator = ".";

function pathToParts(path){
    if(!path){
        return [];
    }
    return path.split(pathSeparator);
}

var appendCache = {};
function appendPath(){

    // Use a rarely used character (`) to test for path the-samey-nes.
    var joinedArgs = arrayProto.join.call(arguments, '`'),
        all = [],
        arg;

    if(appendCache[joinedArgs]){
        return appendCache[joinedArgs];
    }

    for(var i = 0; i < arguments.length; i++) {
        arg = arguments[i];
        if(!arg){
            continue;
        }
        if(typeof arg == 'string'){
            all.push(arg);
            continue;
        }
        var pathSegment = appendPath.apply(null, arg);
        if(pathSegment){
            all.push(pathSegment);
        }
    }

    return (appendCache[joinedArgs] = all.join(pathSeparator));
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
        separator: pathSeparator
    }
};