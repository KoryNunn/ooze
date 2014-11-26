var test = require('tape'),
    Ooze = require('../');

require('./run');
require('./oozeRun');
require('./scopeRun');

test('get', function(t){
    t.plan(1);

    var model = new Ooze({a:1});

    t.equal(model.get('a'), 1);
});

test('get deep', function(t){
    t.plan(1);

    var model = new Ooze({a:{b:1}});

    t.equal(model.get('a.b'), 1);
});

test('set', function(t){
    t.plan(1);

    var model = new Ooze();

    model.set('a', 1);

    t.equal(model.get('a'), 1);
});

test('set deep', function(t){
    t.plan(1);

    var model = new Ooze();

    model.set('a.b',1);

    t.equal(model.get('a.b'), 1);
});

test('on target', function(t){
    t.plan(2);

    var model = new Ooze();

    model.on('a', function(a){
        t.equal(a, 1);
        t.equal(this.captureType, 'target');
    });

    model.set('a',1);
});

test('on bubbled', function(t){
    t.plan(2);

    var model = new Ooze();

    model.on('a', function(a){
        t.deepEqual(a, {b:1});
        t.equal(this.captureType, 'bubble');
    });

    model.set('a.b',1);
});

test('off target', function(t){
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

test('off bubbled', function(t){
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

test('on multiple paths', function(t){
    t.plan(3);

    var model = new Ooze();

    model.on('a b c', function(a, b, c){
        t.equal(a, 1);
        t.equal(b, 2);
        t.equal(c, 3);
    });

    model.set({a:1, b:2, c:3});
});

test('on wildcards', function(t){
    t.plan(2);

    var model = new Ooze();

    model.on('a.*.c', function(a, b, c){
        t.pass();
    });

    model.set('a.b.c', true);
    model.set('a.b.b', true);
    model.set('b.b.c', true);
    model.set('a.wat.c', true);
});

test('on wildcards event', function(t){
    t.plan(2);

    var model = new Ooze();

    model.on('a.*.c', function(c){
        t.equal(this.target, '$.a.b.c');
        t.deepEqual(this.wildcardValues, ['b']);
    });

    model.set('a.b.c', true);
});

test('on wildcards values', function(t){
    t.plan(1);

    var model = new Ooze();

    model.on('a.*.c', function(c){
        t.equal(c, true);
    });

    model.set('a.b.c', true);
});

test('scopeTo', function(t){
    t.plan(1);

    var model = new Ooze({a:1}),
        aScope = model.scopeTo('a');

    t.equal(aScope.get(), 1);
});

test('bind get', function(t){
    t.plan(1);

    var model = new Ooze({a:1}),
        getterSetter = model.bind('a');

    getterSetter(1);

    t.equal(getterSetter(), 1);
});

test('bind set', function(t){
    t.plan(1);

    var model = new Ooze({a:1}),
        getterSetter = model.bind('a');

    getterSetter(2);

    t.equal(model.get('a'), 2);
});

test('bind handler', function(t){
    t.plan(1);

    var model = new Ooze({a:1}),
        getterSetter = model.bind('a', function(a){
            t.equal(a, 2);
        });

    getterSetter(2);
});

test('create transform', function(t){
    t.plan(1);

    var model = new Ooze({a:[
            {b:1},
            {b:1},
            {b:2},
            {b:1},
            {b:2}
        ]}),
        transformModel = model.createTransform('a', function(a){
            return a.filter(function(obj){
                return obj.b >= 2;
            });
        });

    t.equal(transformModel.get('1.b'), 2);
});

test('transform reference', function(t){
    t.plan(2);

    var model = new Ooze({a:[
            {b:1},
            {b:1},
            {b:2},
            {b:1},
            {b:2}
        ]}),
        transformModel = model.createTransform('a', function(a){
            return a.filter(function(obj){
                return obj.b >= 2;
            });
        });


    transformModel.set('1.b', 3);

    t.equal(transformModel.get('1.b'), 3);
    t.equal(model.get('a.4.b'), 3);
});

test('transform events', function(t){
    t.plan(2);

    var model = new Ooze({a:[
            {b:1},
            {b:1},
            {b:2},
            {b:1},
            {b:2}
        ]}),
        transformModel = model.createTransform('a', function(a){
            return a.filter(function(obj){
                return obj.b >= 2;
            });
        });

    model.on('a.4', function(){
        t.pass('recieved event on root model');
    });

    transformModel.on('1', function(){
        t.pass('recieved event on transformModel model');
    });

    transformModel.set('1.b', 3);
});

test('transform updates', function(t){
    t.plan(1);

    var model = new Ooze({a:[
            {b:1},
            {b:1},
            {b:2},
            {b:1},
            {b:2}
        ]}),
        transformModel = model.createTransform('a', function(a){
            return a.filter(function(obj){
                return obj.b >= 2;
            });
        });

    transformModel.on(function(list){
        t.equal(list.length, 3);
    });

    model.set('a.5.b', 4);
});