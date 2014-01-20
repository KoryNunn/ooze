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

var binding = model.bind('things.majiger', function(majiger){
    console.log(majiger);
});

console.log(binding());

binding(12);