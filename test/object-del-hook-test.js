// Testing DatabankObject basic functionality

var assert = require('assert'),
    vows = require('vows'),
    databank = require('../lib/databank'),
    Databank = databank.Databank,
    DatabankObject = require('../lib/databankobject').DatabankObject,
    driverParams = require('./driver-params').driverParams;

var objectDelContext = function(driver, params) {

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
                'and we can create and delete a Person': {
                    topic: function(Person) {

                        var cb = this.callback,
                            called = {
                                before: false,
                                after: false
                            };

                        Person.prototype.beforeDel = function(callback) {
                            called.before = true;
                            callback(null);
                        };

                        Person.prototype.afterDel = function(callback) {
                            called.after = true;
                            callback(null);
                        };

                        Person.create({username: "evan"}, function(err, person) {
                            if (err) {
                                cb(err, null);
                            } else {
                                person.del(function(err) {
                                    if (err) {
                                        cb(err, null);
                                    } else {
                                        // note: not the person
                                        cb(null, called);
                                    }
                                });
                            }
                        });
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
    suite.addBatch(objectDelContext(driver, driverParams[driver]));
}

suite.export(module);
