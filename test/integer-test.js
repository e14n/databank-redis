// Test CRUD for scalars

var assert = require('assert'),
    vows = require('vows'),
    databank = require('../lib/databank'),
    Databank = databank.Databank,
    driverParams = require('./driver-params').driverParams;

var integerContext = function(driver, params) {

    var context = {};

    context["When we create a " + driver + " databank"] = {

        topic: function() {
            params.schema = {
                'computer-count': {
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
            'and we can insert an integer': {
                topic: function(bank) {
                    bank.create('computer-count', 'evanp', 3, this.callback); 
                },
                'without an error': function(err, value) {
                    assert.ifError(err);
                    assert.isNumber(value);
                    assert.equal(value, 3);
                },
                'and we can fetch it': {
                    topic: function(created, bank) {
                        bank.read('computer-count', 'evanp', this.callback);
                    },
                    'without an error': function(err, value) {
			assert.ifError(err);
			assert.isNumber(value);
			assert.equal(value, 3);
                    },
                    'and we can update it': {
                        topic: function(read, created, bank) {
                            bank.update('computer-count', 'evanp', 5, this.callback);
                        },
                        'without an error': function(err, value) {
			    assert.ifError(err);
			    assert.isNumber(value);
			    assert.equal(value, 5);
                        },
                        'and we can read it again': {
                            topic: function(updated, read, created, bank) {
				bank.read('computer-count', 'evanp', this.callback);
                            },
                            'without an error': function(err, value) {
				assert.ifError(err);
				assert.isNumber(value);
				assert.equal(value, 5);
                            },
                            'and we can increment it': {
                                topic: function(readAgain, updated, read, created, bank) {
				    bank.incr('computer-count', 'evanp', this.callback);
                                },
                                'without an error': function(err, value) {
				    assert.ifError(err);
				    assert.isNumber(value);
				    assert.equal(value, 6);
				},
				'and we can decrement it': {
                                    topic: function(incremented, readAgain, updated, read, created, bank) {
					bank.decr('computer-count', 'evanp', this.callback);
                                    },
                                    'without an error': function(err, value) {
					assert.ifError(err);
					assert.isNumber(value);
					assert.equal(value, 5);
				    },
				    'and we can delete it': {
					topic: function(decremented, incremented, readAgain, updated, read, created, bank) {
					    bank.del('computer-count', 'evanp', this.callback);
					},
					'without an error': function(err) {
					    assert.ifError(err);
					},
					'and we can disconnect': {
					    topic: function(decremented, incremented, readAgain, updated, read, created, bank) {
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



var suite = vows.describe('integer values'),
    driver = null;

for (driver in driverParams) {
    suite.addBatch(integerContext(driver, driverParams[driver]));
}

suite.export(module);
