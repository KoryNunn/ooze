var Ooze = require('../'),
    run = require('../run'),
    test = require('grape');

function createScope(){
    var model = new Ooze({
        target: {}
    });

    return model.scopeTo('target');
}

test('run set', function(t){
    t.plan(1);

    var scope = createScope();

    scope.run(['foo', 'bar'], function(scope){
        scope.foo = 10;
    });

    t.equal(scope.get('foo'), 10);
});

test('run set triggers events', function(t){
    t.plan(1);

    var scope = createScope();

    scope.on('foo', function(){
        t.equal(this.path, '$.target.foo');
    });

    scope.run(['foo'], function(scope){
        scope.foo = 10;
    });
});

test('run set triggers events for references', function(t){
    t.plan(2);

    var scope = createScope();

    run(scope, ['foo', 'bar'], function(scope){
        scope.foo = scope.bar = {};
    });

    scope.on('foo', function(){
        t.equal(this.path, '$.target.foo');
        t.equal(this.target, '$.target.bar');
    });

    scope.run(['bar'], function(scope){
        scope.bar.things = 'stuff';
    });

});