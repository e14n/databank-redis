// Test search

var assert = require('assert'),
    vows = require('vows'),
    databank = require('../databank'),
    Databank = databank.Databank,
    driverParams = require('./driver-params').driverParams;

var searchContext = function(driver, params) {

    var context = {};

    context["When we create a " + driver + " databank"] = {

        topic: function() {
            params.schema = {
                person: {
                    pkey: 'username',
                    indices: ['name.last']
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
            'and we can add a person': {
                topic: function(bank) {
                    bank.create('person', 'evanp', {name: {last: 'Prodromou', first: 'Evan'}, age: 43}, this.callback);
                },
                'without an error': function(err, person) {
                    assert.ifError(err);
                },
                'and we can add another person': {
                    topic: function(evan, bank) {
                        bank.create('person', 'stav', {name: {last: 'Prodromou', first: 'Stav'}, age: 67}, this.callback);
                    },
                    'without an error': function(err, person) {
                        assert.ifError(err);
                    },
                    'and we can add yet another person': {
                        topic: function(stav, evan, bank) {
                            bank.create('person', 'abe', {name: {last: 'Lincoln', first: 'Abraham'}, age: 202}, this.callback);
                        },
                        'without an error': function(err, person) {
                            assert.ifError(err);
                        },
                        'and we can search by an indexed value': {
                            topic: function(abe, stav, evan, bank) {
                                var results = [], onResult = function(result) { results.push(result); };

                                bank.search('person', {'name.last': 'Prodromou'}, onResult, this.callback);
                            },
                            'without an error': function(err) {
                                assert.ifError(err);
                            },
                            'and we can search by an non-indexed value': {
                                topic: function(abe, stav, evan, bank) {
                                    var results = [], onResult = function(result) { results.push(result); };

                                    bank.search('person', {'age': 43}, onResult, this.callback);
                                },
                                'without an error': function(err) {
                                    assert.ifError(err);
                                },
                                'and we can delete the last person': {
                                    topic: function(abe, stav, evan, bank) {
                                        bank.del('person', 'abe', this.callback);
                                    },
                                    'without an error': function(err) {
                                        assert.ifError(err);
                                    },
                                    'and we can delete the second person': {
                                        topic: function(abe, stav, evan, bank) {
                                            bank.del('person', 'stav', this.callback);
                                        },
                                        'without an error': function(err) {
                                            assert.ifError(err);
                                        },
                                        'and we can delete the first person': {
                                            topic: function(abe, stav, evan, bank) {
                                                bank.del('person', 'evanp', this.callback);
                                            },
                                            'without an error': function(err) {
                                                assert.ifError(err);
                                            },
                                            'and we can disconnect': {
                                                topic: function(abe, stav, evan, bank) {
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
        }
    };
    
    return context;
};


var suite = vows.describe('search values'),
    driver = null;

for (driver in driverParams) {
    suite.addBatch(searchContext(driver, driverParams[driver]));
}

suite.export(module);
