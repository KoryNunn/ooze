var Ooze = require('./ooze'),
    model = new Ooze({a:'b'});

var scoped = model.scopeTo('things');

model.set('things', {
    stuff:'a',
    majiger:'b',
    whatsits:{
        foo: 8
    }
});

var callback = function(majiger){
    console.log(majiger);
};

var binding = model.bind('things.majiger', callback);

console.log(binding());

binding(12);

model.off('things.majiger', callback);

binding(13);
