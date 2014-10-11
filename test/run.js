var Ooze = require('../'),
    run = require('../run'),
    test = require('grape');


test('run set', function(t){
    t.plan(1);

    var model = new Ooze();

    run(model, ['foo', 'bar'], function(scope){
        scope.foo = 10;
    });

    t.equal(model.get('foo'), 10);
});

test('run set triggers events', function(t){
    t.plan(1);

    var model = new Ooze();

    model.on('foo', function(){
        t.equal(this.path, '$.foo');
    });

    run(model, ['foo'], function(scope){
        scope.foo = 10;
    });
});

test('run set triggers events for references', function(t){
    t.plan(2);

    var model = new Ooze();

    run(model, ['foo', 'bar'], function(scope){
        scope.foo = scope.bar = {};
    });

    model.on('foo', function(){
        t.equal(this.path, '$.foo');
        t.equal(this.target, '$.bar');
    });

    run(model, ['bar'], function(scope){
        scope.bar.things = 'stuff';
    });

});

test('run with same keys', function(t){
    t.plan(1);

    var model = new Ooze({
        foo:{},
        bar:{}
    });

    t.throws(function(){
        run(model, ['foo.a', 'bar.a'], function(scope){
            // Nonsensical code...
            scope.a = 5;
            scope.a = 10;
        });
    });
});

test('run with aliased keys', function(t){
    t.plan(2);

    var model = new Ooze({
        foo:{},
        bar:{}
    });

    run(model, ['foo.a:fooA', 'bar.a:barA'], function(scope){
        scope.fooA = 5;
        scope.barA = 10;
    });

    t.equal(model.get('foo.a'), 5);
    t.equal(model.get('bar.a'), 10);
});