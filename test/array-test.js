// Test CRUD + append, prepend, item, slice for arrays

var assert = require('assert'),
    vows = require('vows'),
    databank = require('../lib/databank'),
    Databank = databank.Databank,
    driverParams = require('./driver-params').driverParams;

var arrayContext = function(driver, params) {

    var context = {};

    context["When we create a " + driver + " databank"] = {

        topic: function() {
            params.schema = {
                inbox: {
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
            'and we can insert an array': {
                topic: function(bank) {
                    bank.create('inbox', 'evanp', [1, 2, 3], this.callback); 
                },
                'without an error': function(err, value) {
                    assert.ifError(err);
                    assert.isArray(value);
                    assert.equal(value.length, 3);
		    assert.deepEqual(value, [1, 2, 3]);
                },
                'and we can fetch it': {
                    topic: function(created, bank) {
                        bank.read('inbox', 'evanp', this.callback);
                    },
                    'without an error': function(err, value) {
			assert.ifError(err);
			assert.isArray(value);
			assert.equal(value.length, 3);
			assert.deepEqual(value, [1, 2, 3]);
                    },
                    'and we can update it': {
                        topic: function(read, created, bank) {
                            bank.update('inbox', 'evanp', [1, 2, 3, 4], this.callback);
                        },
                        'without an error': function(err, value) {
			    assert.ifError(err);
			    assert.isArray(value);
			    assert.equal(value.length, 4);
			    assert.deepEqual(value, [1, 2, 3, 4]);
                        },
                        'and we can read it again': {
                            topic: function(updated, read, created, bank) {
				bank.read('inbox', 'evanp', this.callback);
                            },
                            'without an error': function(err, value) {
				assert.ifError(err);
				assert.isArray(value);
				assert.equal(value.length, 4);
				assert.deepEqual(value, [1, 2, 3, 4]);
                            },
                            'and we can prepend to it': {
                                topic: function(readAgain, updated, read, created, bank) {
				    bank.prepend('inbox', 'evanp', 0, this.callback);
                                },
                                'without an error': function(err, value) {
				    assert.ifError(err);
				    assert.isArray(value);
				    assert.equal(value.length, 5);
				    assert.deepEqual(value, [0, 1, 2, 3, 4]);
				},
				'and we can append to it': {
                                    topic: function(prepended, readAgain, updated, read, created, bank) {
					bank.append('inbox', 'evanp', 5, this.callback);
                                    },
                                    'without an error': function(err, value) {
					assert.ifError(err);
					assert.isArray(value);
					assert.equal(value.length, 6);
					assert.deepEqual(value, [0, 1, 2, 3, 4, 5]);
				    },
				    'and we can get a single item': {
					topic: function(appended, prepended, readAgain, updated, read, created, bank) {
					    bank.item('inbox', 'evanp', 2, this.callback);
					},
					'without an error': function(err, value) {
					    assert.ifError(err);
					    assert.equal(value, 2);
					},
					'and we can get a slice': {
					    topic: function(item, appended, prepended, readAgain, updated, read, created, bank) {
					        bank.slice('inbox', 'evanp', 1, 3, this.callback);
					    },
					    'without an error': function(err, value) {
						assert.ifError(err);
					        assert.isArray(value);
					        assert.equal(value.length, 2);
					        assert.deepEqual(value, [1, 2]);
					    },
                                            'and we can get the indexOf an item': {
                                                topic: function(slice, item, appended, prepended, readAgain, updated, read, created, bank) {
                                                    bank.indexOf('inbox', 'evanp', 2, this.callback);
                                                },
                                                'without an error': function(err, index) {
                                                    assert.ifError(err);
                                                    assert.equal(index, 2);
                                                },
                                                'and we can remove an item': {
					            topic: function(index, slice, item, appended, prepended, readAgain, updated, read, created, bank) {
                                                        bank.remove('inbox', 'evanp', 3, this.callback);
                                                    },
                                                    'without an error': function(err) {
                                                        assert.ifError(err);
                                                    },
                                                    'and we can read again': {
					                topic: function(index, slice, item, appended, prepended, readAgain, updated, read, created, bank) {
                                                            bank.read('inbox', 'evanp', this.callback);
                                                        },
                                                        'without an error': function(err, box) {
                                                            assert.ifError(err);
                                                            assert.deepEqual(box, [0, 1, 2, 4, 5]);
                                                        },
					                'and we can delete it': {
					                    topic: function(readAgainAgain, index, slice, item, appended, prepended, readAgain, updated, read, created, bank) {
					                        bank.del('inbox', 'evanp', this.callback);
					                    },
					                    'without an error': function(err) {
						                assert.ifError(err);
                                                            },
                                                            'and we can disconnect': {
					                        topic: function(readAgainAgain, index, slice, item, appended, prepended, readAgain, updated, read, created, bank) {
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
        }
    };

    return context;
};

var suite = vows.describe('array values'),
    driver = null;

for (driver in driverParams) {
    suite.addBatch(arrayContext(driver, driverParams[driver]));
}

suite.export(module);
