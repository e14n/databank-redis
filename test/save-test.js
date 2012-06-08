// Testing basic crud functionality

// Testing readAll() method

var assert = require('assert'),
    vows = require('vows'),
    databank = require('../lib/databank'),
    Databank = databank.Databank,
    driverParams = require('./driver-params').driverParams;

var saveContext = function(driver, params) {

    var context = {};

    context["When we create a " + driver + " databank"] = {

        topic: function() {
            params.schema = {
                test: {
                    pkey: 'number'
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
            'and we can save an item': {
                topic: function(bank) {
                    bank.save('test', 1, {'pass': true, 'iters': 42}, this.callback); 
                },
                'without an error': function(err, value) {
                    assert.ifError(err);
                    assert.ok(value);
                    assert.isObject(value);
                    assert.equal(value.pass, true);
                    assert.equal(value.iters, 42);
                },
                'and we can fetch it': {
                    topic: function(created, bank) {
                        bank.read('test', 1, this.callback);
                    },
                    'without an error': function(err, value) {
                        assert.ifError(err);
                        assert.isObject(value);
                        assert.equal(value.pass, true);
                        assert.equal(value.iters, 42);
                    },
                    'and we can save it again': {
                        topic: function(read, created, bank) {
                            bank.save('test', 1, {'pass': true, 'iters': 43}, this.callback);
                        },
                        'without an error': function(err, value) {
                            assert.ifError(err);
                            assert.ok(value);
                            assert.equal(typeof value, 'object');
                            assert.equal(value.pass, true);
                            assert.equal(value.iters, 43);
                        },
                        'and we can read it again': {
                            topic: function(updated, read, created, bank) {
                                bank.read('test', 1, this.callback);
                            },
                            'without an error': function(err, value) {
                                assert.ifError(err);
                                assert.ok(value);
                                assert.equal(typeof value, 'object');
                                assert.equal(value.pass, true);
                                assert.equal(value.iters, 43);
                            },
                            'and we can delete it': {
                                topic: function(readAgain, updated, read, created, bank) {
                                    bank.del('test', 1, this.callback);
                                },
                                'without an error': function(err) {
                                    assert.ifError(err);
                                },
                                'and we can disconnect': {
                                    topic: function(readAgain, updated, read, created, bank) {
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
    };

    return context;
};



var suite = vows.describe('save'),
    driver = null;

for (driver in driverParams) {
    suite.addBatch(saveContext(driver, driverParams[driver]));
}

suite.export(module);
