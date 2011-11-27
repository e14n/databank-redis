// Testing DatabankObject basic functionality

var assert = require('assert'),
    vows = require('vows'),
    databank = require('../databank'),
    Databank = databank.Databank,
    DatabankObject = require('../databankobject').DatabankObject,
    driverParams = require('./driver-params').driverParams;

var objectContext = function(driver, params) {

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
            'without an error': function(err) {
                assert.ifError(err);
            },
            'and we can initialize the Person class': {
                topic: function(bank) {
                    DatabankObject.bank = bank;
                    return DatabankObject.subClass('person');
                },
                'which is valid': function(Person) {
                    assert.ok(Person);
                    assert.ok(Person.get);
                    assert.ok(Person.search);
                    assert.ok(Person.pkey);
                    assert.ok(Person.bank());
                    assert.equal(Person.type, 'person');
                    assert.equal(Person.pkey(), 'username');
                },
                'and we can instantiate a new Person': {
                    topic: function(Person, bank) {
                        return new Person({username: 'evanp', name: {last: 'Prodromou', first: 'Evan'}, age: 42});
                    },
                    'which is valid': function(evan) {
                        assert.ok(evan);
                        assert.ok(evan.del);
                        assert.ok(evan.save);
                        assert.equal(evan.username, 'evanp');
                        assert.ok(evan.name);
                        assert.equal(evan.name.last, 'Prodromou');
                        assert.equal(evan.name.first, 'Evan');
                        assert.equal(evan.age, 42);
                    },
                    'and we can save that person': {
                        topic: function(evan, Person, bank) {
                            evan.save(this.callback);
                        },
                        'which is valid': function(err, person) {
                            assert.ifError(err);
                            assert.ok(person);
                            assert.equal(person.username, 'evanp');
                            assert.ok(person.name);
                            assert.equal(person.name.last, 'Prodromou');
                            assert.equal(person.name.first, 'Evan');
                            assert.equal(person.age, 42);
                        },
                        'and we can read that person': {
                            topic: function(saved, evan, Person, bank) {
                                Person.get('evanp', this.callback);
                            },
                            'which is valid': function(err, person) {
                                assert.ifError(err);
                                assert.ok(person);
                                assert.equal(person.username, 'evanp');
                                assert.ok(person.name);
                                assert.equal(person.name.last, 'Prodromou');
                                assert.equal(person.name.first, 'Evan');
                                assert.equal(person.age, 42);
                            },
                            'and we can save a changed person': {
                                topic: function(person, saved, evan, Person, bank) {
                                    person.age = 43;
                                    person.save(this.callback);
                                },
                                'which is valid': function(err, person) {
                                    assert.ifError(err);
                                    assert.ok(person);
                                    assert.equal(person.username, 'evanp');
                                    assert.ok(person.name);
                                    assert.equal(person.name.last, 'Prodromou');
                                    assert.equal(person.name.first, 'Evan');
                                    assert.equal(person.age, 43);
                                },
                                'and we can fetch the saved person': {
                                    topic: function(changed, read, saved, evan, Person, bank) {
                                        Person.get('evanp', this.callback);
                                    },
                                    'which is valid': function(err, person) {
                                        assert.ifError(err);
                                        assert.ok(person);
                                        assert.equal(person.username, 'evanp');
                                        assert.ok(person.name);
                                        assert.equal(person.name.last, 'Prodromou');
                                        assert.equal(person.name.first, 'Evan');
                                        assert.equal(person.age, 43);
                                    },
                                    'and we can delete the fetched, saved person': {
                                        topic: function(reread, changed, read, saved, evan, Person, bank) {
                                            reread.del(this.callback);
                                        },
                                        'without an error': function(err) {
                                            assert.ifError(err);
                                        },
                                        'and we can disconnect': {
                                            topic: function(reread, changed, read, saved, evan, Person, bank) {
                                                bank.disconnect(this.callback);
                                            },
                                            'without an error': function(err) {
                                                assert.ifError(err);
                                            }
                                        }
                                    }
                                }
                            }
                        }
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
    suite.addBatch(objectContext(driver, driverParams[driver]));
}

suite.export(module);
