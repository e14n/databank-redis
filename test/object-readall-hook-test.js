// Testing DatabankObject basic functionality

var assert = require('assert'),
    vows = require('vows'),
    Step = require('step'),
    databank = require('../lib/databank'),
    Databank = databank.Databank,
    DatabankObject = require('../lib/databankobject').DatabankObject,
    driverParams = require('./driver-params').driverParams,
    nicknames = ['george', 'jane', 'judy', 'elroy', 'astro', 'rosie'];

var objectReadallHookContext = function(driver, params) {

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
                'and we can create a few people': {
                    topic: function(Person) {
                        var cb = this.callback;

                        Step(
                            function() {
                                var i, group = this.group();
                                for (i = 0; i < nicknames.length; i++) {
                                    Person.create({username: nicknames[i]}, group());
                                }
                            },
                            function(err, people) {
                                cb(err, people);
                            }
                        );
                    },
                    teardown: function(people) {
                        var i;

                        for (i = 0; i < people.length; i++) {
                            people[i].del(function(err) {});
                        }
                    },
                    'it works': function(err, people) {
                        assert.ifError(err);
                        assert.isArray(people);
                    },
                    'and we read a few back': {
                        topic: function(people, Person) {
                            var cb = this.callback,
                                called = {
                                    before: 0,
                                    after: 0,
                                    people: {}
                                };

                            Person.beforeGet = function(username, callback) {
                                called.before++;
                                callback(null, username);
                            };

                            Person.prototype.afterGet = function(callback) {
                                called.after++;
                                this.addedByAfter = 23;
                                callback(null, this);
                            };

                            Person.readAll(nicknames, function(err, ppl) {
                                called.people = ppl;
                                cb(err, called);
                            });
                        },
                        'without an error': function(err, called) {
                            assert.ifError(err);
                            assert.isObject(called);
                        },
                        'and the before hook is called': function(err, called) {
                            assert.isObject(called);
                            assert.equal(called.before, nicknames.length);
                        },
                        'and the after hook is called': function(err, called) {
                            assert.equal(called.after, nicknames.length);
                        },
                        'and the after hook modification happened': function(err, called) {
                            var nick;
                            for (nick in called.people) {
                                assert.isObject(called.people[nick]);
                                assert.equal(called.people[nick].addedByAfter, 23);
                            }
                        }
                    }
                }
            }
        }
    };

    return context;
};

var suite = vows.describe('object readall hooks'),
    driver = null;

for (driver in driverParams) {
    suite.addBatch(objectReadallHookContext(driver, driverParams[driver]));
}

suite.export(module);
