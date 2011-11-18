// Testing basic crud functionality

var assert = require('assert');

var parseCmdLine = function(args) {

    var driver = args[2] || 'disk',
        i = 0,
        arg = null,
        parts = null,
        results = {'driver': driver};

    for (i = 3; i < args.length; i++) {
        arg = args[i];
        parts = arg.split('=', 2);
        results[parts[0]] = parts[1];
    }

    return results;
};

var main = function(params) {

    var bank = null,
        databank = null,
        Databank = null,
        DatabankError = null;

    console.log("Loading module");

    // Get databank
    assert.doesNotThrow(function() {
        databank = require('../databank');
    }, Error, "Error loading databank module");

    console.log("Getting classes");

    // Get Databank
    Databank = databank.Databank;
    DatabankError = databank.DatabankError;

    assert.ok(Databank);
    assert.ok(DatabankError);

    console.log("Creating instance");

    // Instantiate with factory method
    assert.doesNotThrow(function() {
        bank = Databank.get(params['driver'], params);
    }, Error, "Error on get()");

    assert.ok(bank);

    bank.connect(params, function(err) {
        assert.ifError(err);
	console.log("Creating object");
        bank.create('test', 1, {'pass': true, 'iters': 42}, function(err, value) {
            assert.ifError(err);
            assert.ok(value);
            assert.equal(value['pass'], true);
            assert.equal(value['iters'], 42);
	    console.log("Fetching object");
            bank.read('test', 1, function(err, value) {
                assert.ifError(err);
                assert.ok(value);
                assert.equal(value['pass'], true);
                assert.equal(value['iters'], 42);
		console.log("Updating object");
                bank.update('test', 1, {'pass': true, 'iters': 43}, function(err, value) {
                    assert.ifError(err);
                    assert.ok(value);
                    assert.equal(value['pass'], true);
                    assert.equal(value['iters'], 43);
		    console.log("Deleting object");
                    bank.del('test', 1, function(err) {
                        assert.ifError(err);
                        bank.disconnect(function(err) {
                            assert.ifError(err);
                        });
                    });
                });
            });
        });
    });
};

main(parseCmdLine(process.argv));
