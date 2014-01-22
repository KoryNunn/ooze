var pathSeparator = ".";

function pathToParts(path){
    if(!path){
        return [];
    }
    return path.split(pathSeparator);
}

function appendPath(){
    var all = [],
        arg;

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

    return all.join(pathSeparator);
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