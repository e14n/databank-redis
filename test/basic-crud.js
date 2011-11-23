var assert = require('assert'),
    vows = require('vows'),
    databank = require('../databank'),
    Databank = databank.Databank,
    driverParams = require('./driver-params').driverParams;

var basicCrudContext = function(driver, params) {

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
            'and we can create an item': {
                topic: function(bank) {
                    bank.create('test', 1, {'pass': true, 'iters': 42}, this.callback);
                },
                'without an error': function(err, value) {
                    assert.ifError(err);
                },
                'with an object return value': function(err, value) {
                    assert.isObject(value);
                },
                'with a valid value': function(err, value) {
                    assert.equal(value.pass, true);
                    assert.equal(value.iters, 42);
                },
                'and we can read it back from the databank': {
                    topic: function(created, bank) {
                        bank.read('test', 1, this.callback);
                    },
                    'without an error': function(err, value) {
                        assert.ifError(err);
                    },
                    'with an object return value': function(err, value) {
                        assert.isObject(value);
                    },
                    'with a valid value': function(err, value) {
                        assert.equal(value.pass, true);
                        assert.equal(value.iters, 42);
                    },
                    'and we can update it in the databank': {
                        topic: function(read, created, bank) {
                            bank.update('test', 1, {'pass': true, 'iters': 43}, this.callback);
                        },
                        'without an error': function(err, value) {
                            assert.ifError(err);
                        },
                        'with an object return value': function(err, value) {
                            assert.isObject(value);
                        },
                        'with an updated value': function(err, value) {
                            assert.equal(value.pass, true);
                            assert.equal(value.iters, 43);
                        },
                        'and we can delete the entry': {
                            topic: function(updated, read, created, bank) {
                                bank.del('test', 1, this.callback);
                            },
                            'without an error': function(err) {
                                assert.ifError(err);
                            },
                            'and we can disconnect': {
                                topic: function(updated, read, created, bank) {
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
    };

    return context;
};

var suite = vows.describe('basic crud'),
    driver = null;

for (driver in driverParams) {
    suite.addBatch(basicCrudContext(driver, driverParams[driver]));
}

suite.export(module);
