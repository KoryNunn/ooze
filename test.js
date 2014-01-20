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

scoped.on('stuff majiger whatsits.foo', function(stuff, majiger, foo){
    console.log(stuff, majiger, foo);
    console.log(this);
});

model.set('things.whatsits.foo', 9);