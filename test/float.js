// Test CRUD for floating-point scalars

var assert = require('assert'),
    vows = require('vows'),
    databank = require('../lib/databank'),
    Databank = databank.Databank,
    driverParams = require('./driver-params').driverParams;

var floatContext = function(driver, params) {

    var context = {};

    context["When we create a " + driver + " databank"] = {

        topic: function() {
            params.schema = {
                'probability': {
                    pkey: 'weather'
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
            'and we can insert a number': {
                topic: function(bank) {
                    bank.create('probability', 'rain', 0.30, this.callback); 
                },
                'without an error': function(err, value) {
                    assert.ifError(err);
                    assert.isNumber(value);
                    assert.equal(value - 0.30 < 0.0001, true);
                },
                'and we can fetch it': {
                    topic: function(created, bank) {
                        bank.read('probability', 'rain', this.callback);
                    },
                    'without an error': function(err, value) {
			assert.ifError(err);
                        assert.isNumber(value);
                        assert.equal(value - 0.30 < 0.0001, true);
                    },
                    'and we can update it': {
                        topic: function(read, created, bank) {
                            bank.update('probability', 'rain', 0.45, this.callback);
                        },
                        'without an error': function(err, value) {
			    assert.ifError(err);
			    assert.isNumber(value);
                            assert.equal(value - 0.45 < 0.0001, true);
                        },
                        'and we can read it again': {
                            topic: function(updated, read, created, bank) {
				bank.read('probability', 'rain', this.callback);
                            },
                            'without an error': function(err, value) {
				assert.ifError(err);
			        assert.isNumber(value);
                                assert.equal(value - 0.45 < 0.0001, true);
                            },
                            'and we can save it': {
                                topic: function(readAgain, updated, read, created, bank) {
				    bank.save('probability', 'rain', 0.25, this.callback);
                                },
                                'without an error': function(err, value) {
				    assert.ifError(err);
			            assert.isNumber(value);
                                    assert.equal(value - 0.25 < 0.0001, true);
                                },
                                'and we can read it once more': {
                                    topic: function(saved, readAgain, updated, read, created, bank) {
				        bank.read('probability', 'rain', this.callback);
                                    },
                                    'without an error': function(err, value) {
				        assert.ifError(err);
			                assert.isNumber(value);
                                        assert.equal(value - 0.45 < 0.0001, true);
                                    },
			            'and we can delete it': {
				        topic: function(readOnceMore, saved, readAgain, updated, read, created, bank) {
				            bank.del('probability', 'rain', this.callback);
				        },
				        'without an error': function(err) {
				            assert.ifError(err);
				        },
                                        'and we can save to create': {
                                            topic: function(readOnceMore, saved, readAgain, updated, read, created, bank) {
				                bank.save('probability', 'fog', 0.10, this.callback);
                                            },
                                            'without an error': function(err, value) {
				                assert.ifError(err);
			                        assert.isNumber(value);
                                                assert.equal(value - 0.10 < 0.0001, true);
                                            },
			                    'and we can delete it': {
				                topic: function(saveCreated, readOnceMore, saved, readAgain, updated, read, created, bank) {
				                    bank.del('probability', 'fog', this.callback);
				                },
				                'without an error': function(err) {
				                    assert.ifError(err);
				                },
				                'and we can disconnect': {
				                    topic: function(saveCreated, readOnceMore, saved, readAgain, updated, read, created, bank) {
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
        }
    };

    return context;
};

var suite = vows.describe('float values'),
    driver = null;

for (driver in driverParams) {
    suite.addBatch(floatContext(driver, driverParams[driver]));
}

suite.export(module);
