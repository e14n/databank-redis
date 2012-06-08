// Testing DatabankObject basic functionality

var assert = require('assert'),
    vows = require('vows'),
    databank = require('../lib/databank'),
    Databank = databank.Databank,
    DatabankObject = require('../lib/databankobject').DatabankObject,
    driverParams = require('./driver-params').driverParams;

var objectSaveContext = function(driver, params) {

    var context = {};

    context["When we create a " + driver + " databank"] = {

        topic: function() {
            params.schema = {
                person: {
                    pkey: 'username'
                }
            };
            return Databank.get(driver, params);
        },
        'We can connect to it': {
            topic: function(bank) {
                bank.connect(params, this.callback);
            },
            teardown: function(bank) {
                bank.disconnect(function(err) {});
            },
            'without an error': function(err) {
                assert.ifError(err);
            },
            'and we can initialize the Person class': {
                topic: function(bank) {
                    var Person;

                    DatabankObject.bank = bank;

                    Person = DatabankObject.subClass('person');

                    return Person;
                },
                'which is valid': function(Person) {
                    assert.isFunction(Person);
                },
                'and we can create and save a Person': {
                    topic: function(Person) {

                        var cb = this.callback,
                            called = {
                                before: false,
                                after: false,
                                person: null
                            };

                        Person.prototype.beforeSave = function(callback) {
                            called.before = true;
                            this.addedByBefore = 42;
                            callback(null);
                        };

                        Person.prototype.afterSave = function(callback) {
                            called.after = true;
                            this.addedByAfter = 23;
                            callback(null);
                        };

                        var person = new Person({username: "evan"});

                        person.save(function(err, newPerson) {
                            if (err) {
                                cb(err, null);
                            } else {
                                called.person = newPerson;
                                // note: not the person
                                cb(null, called);
                            }
                        });
                    },
                    teardown: function(called) {
                        if (called.person) {
                            called.person.del(function(err) {});
                        }
                    },
                    'without an error': function(err, called) {
                        assert.ifError(err);
                        assert.isObject(called);
                    },
                    'and the before hook is called': function(err, called) {
                        assert.isTrue(called.before);
                    },
                    'and the after hook is called': function(err, called) {
                        assert.isTrue(called.after);
                    },
                    'and the before hook modification happened': function(err, called) {
                        assert.equal(called.person.addedByBefore, 42);
                    },
                    'and the after hook modification happened': function(err, called) {
                        assert.equal(called.person.addedByAfter, 23);
                    }
                }
            }
        }
    };

    return context;
};

var suite = vows.describe('object class'),
    driver = null;

for (driver in driverParams) {
    suite.addBatch(objectSaveContext(driver, driverParams[driver]));
}

suite.export(module);
