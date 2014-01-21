Ooze
===

A model event wrapper. The spiritual successor to gedi

Ooze lets you  wrap an object in an evented getter/setter API.

## Usage

### Instantiation

    var someModel = {
        // properties.
    };

    var Ooze = require('ooze'),
        model = new Ooze(someModel);

Instantiating Ooze returns a scope object, that can be used to access the object.


### Get

    // Simple
    model.get('property');

    // Deeper into the object
    model.get('property.childProp');

### Set

    // Simple
    model.set('property', 'value');

    // Deeper into the object
    model.set('property.childProp', 'value');

### Listen to events

    // Simple
    model.on('property', function(property){...});

    // Multiple paths (Space seperated)
    model.on('property anotherProperty someOtherOne.childProp.grandchildProp', function(property, another, grandchild){...});

handlers will be called with 'this' as the event:

    model.on('property', function(property){
        var event = this;
    });

handlers will be called if any of the bound paths changes.

Model events will ONLY be raised if a change is made via Ooze. Changing values directly will not trigger handlers!

### Create a new scope

    var propertyModel = model.scopeTo('property');

    // Calls to propertyModel will all be scoped to the 'property' path.

    propertyModel.set('childProp', 3);

    // The above is equivilent to:
    model.set('property.childProp', 3);

### Create a getter/setter

    var getterSetter = model.bind('property');

    // Get (no arguments)
    getterSetter();

    // The above is equivilent to:
    model.get('property');

    // Set (pass an argument)
    getterSetter(3);

    // The above is equivilent to:
    model.set('property', 3);