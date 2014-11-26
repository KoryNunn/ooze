var Ooze = require('../'),
    run = require('../run'),
    test = require('grape');


test('run set', function(t){
    t.plan(1);

    var model = new Ooze();

    model.run(['foo', 'bar'], function(scope){
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

    model.run(['foo'], function(scope){
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

    model.run(['bar'], function(scope){
        scope.bar.things = 'stuff';
    });

});