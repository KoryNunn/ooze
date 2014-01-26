var Ooze = require('./ooze'),
    model = new Ooze({a:'b'});

var scoped = model.scopeTo('things');

model.set('things', {
    thing: 2
});

var callback = function(majiger){
    console.log(majiger);
};

model.on('thing', function(value){
    console.log(this);
    console.log(value);
});

var constraint = model.addConstraint('thing', function(value){
    return Math.max(Math.min(value, 100),0);
});

model.set('thing', 1);
model.set('thing', 4);
model.set('thing', -5);
model.set('thing', 105);



model.removeConstraint('thing', constraint);

model.set('thing', -5);