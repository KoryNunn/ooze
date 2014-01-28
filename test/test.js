var grape = require('grape'),
    Ooze = require('../');

grape('get', function(t){
    t.plan(1);

    var model = new Ooze({a:1});

    t.equal(model.get('a'), 1);
});

grape('get deep', function(t){
    t.plan(1);

    var model = new Ooze({a:{b:1}});

    t.equal(model.get('a.b'), 1);
});

grape('set', function(t){
    t.plan(1);

    var model = new Ooze();

    model.set('a', 1)

    t.equal(model.get(), 1);
});

grape('set deep', function(t){
    t.plan(1);

    var model = new Ooze();

    model.set('a.b',1)

    t.equal(model.get('a.b'), 1);
});