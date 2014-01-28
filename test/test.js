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

    model.set('a', 1);

    t.equal(model.get('a'), 1);
});

grape('set deep', function(t){
    t.plan(1);

    var model = new Ooze();

    model.set('a.b',1);

    t.equal(model.get('a.b'), 1);
});

grape('on target', function(t){
    t.plan(2);

    var model = new Ooze();

    model.on('a', function(a){
        t.equal(a, 1);
        t.equal(this.captureType, 'target');
    });

    model.set('a',1);
});

grape('on bubbled', function(t){
    t.plan(2);

    var model = new Ooze();

    model.on('a', function(a){
        t.deepEqual(a, {b:1});
        t.equal(this.captureType, 'bubble');
    });

    model.set('a.b',1);
});

grape('off target', function(t){
    t.plan(2);

    var model = new Ooze();

    var handler = model.on('a', function(a){
        t.equal(a, 1);
        t.equal(this.captureType, 'target');
    });

    model.set('a',1);

    model.off('a', handler);

    model.set('a',2);
});

grape('off bubbled', function(t){
    t.plan(2);

    var model = new Ooze();

    var handler = model.on('a', function(a){
        t.deepEqual(a, {b:1});
        t.equal(this.captureType, 'bubble');
    });

    model.set('a.b', 1);

    model.off('a', handler);

    model.set('a.b', 2);
});

grape('on multiple paths', function(t){
    t.plan(3);

    var model = new Ooze();

    model.on('a b c', function(a, b, c){
        t.equal(a, 1);
        t.equal(b, 2);
        t.equal(c, 3);
    });

    model.set({a:1, b:2, c:3});
});

grape('scopeTo', function(t){
    t.plan(1);

    var model = new Ooze({a:1}),
        aScope = model.scopeTo('a');

    t.equal(aScope.get(), 1);
});

grape('bind get', function(t){
    t.plan(1);

    var model = new Ooze({a:1}),
        getterSetter = model.bind('a');

    getterSetter(1);

    t.equal(getterSetter(), 1);
});

grape('bind set', function(t){
    t.plan(1);

    var model = new Ooze({a:1}),
        getterSetter = model.bind('a');

    getterSetter(2);

    t.equal(model.get('a'), 2);
});

grape('bind handler', function(t){
    t.plan(1);

    var model = new Ooze({a:1}),
        getterSetter = model.bind('a', function(a){
            t.equal(a, 2);
        });

    getterSetter(2);
});