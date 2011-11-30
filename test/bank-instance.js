var assert = require('assert'),
    vows = require('vows'),
    databank = require('../lib/databank'),
    Databank = databank.Databank,
    driverParams = require('./driver-params').driverParams;

var bankInstanceContext = function(driver, params) {

    var context = {};

    context["When we create a " + driver + " databank"] = {
        topic: function() {
            return Databank.get(driver, params);
        },
        'it is a databank': function(bank) {
            assert.isObject(bank);
            assert.instanceOf(bank, Databank);
        },
        'it has a connect method': function(bank) {
            assert.isFunction(bank.connect);
        },
        'it has a disconnect method': function(bank) {
            assert.isFunction(bank.disconnect);
        },
        'it has a create method': function(bank) {
            assert.isFunction(bank.create);
        },
        'it has a read method': function(bank) {
            assert.isFunction(bank.read);
        },
        'it has a update method': function(bank) {
            assert.isFunction(bank.update);
        },
        'it has a del method': function(bank) {
            assert.isFunction(bank.del);
        },
        'it has a save method': function(bank) {
            assert.isFunction(bank.save);
        },
        'it has a readAll method': function(bank) {
            assert.isFunction(bank.readAll);
        },
        'it has an incr method': function(bank) {
            assert.isFunction(bank.incr);
        },
        'it has a decr method': function(bank) {
            assert.isFunction(bank.decr);
        },
        'it has an append method': function(bank) {
            assert.isFunction(bank.append);
        },
        'it has a prepend method': function(bank) {
            assert.isFunction(bank.prepend);
        }
    };

    return context;
};

var suite = vows.describe('bank instantiation'),
    driver = null;

for (driver in driverParams) {
    suite.addBatch(bankInstanceContext(driver, driverParams[driver]));
}

suite.export(module);
        
