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
        bank = Databank.get(params.driver, {schema: {test: {pkey: 'number'}}});
    }, Error, "Error on get()");

    assert.ok(bank);

    bank.connect(params, function(err) {
        bank.create('test', 2, {'pass': false, 'iters': 30}, function(err, value) {
            assert.ifError(err);
            assert.ok(value);
            assert.equal(value.pass, false);
            assert.equal(value.iters, 30);
            bank.create('test', 3, {'pass': true, 'iters': 77}, function(err, value) {
                assert.ifError(err);
                assert.ok(value);
                assert.equal(value.pass, true);
                assert.equal(value.iters, 77);
                bank.create('test', 4, {'pass': false, 'iters': 109}, function(err, value) {
                    assert.ifError(err);
                    assert.ok(value);
                    assert.equal(value.pass, false);
                    assert.equal(value.iters, 109);
                    console.log("Reading many objects.");
                    bank.readAll('test', [2, 3, 4], function(err, results) {
                        assert.ifError(err);
                        assert.ok(results);
                        assert.ok(results[2]);
                        assert.equal(results[2].pass, false);
                        assert.equal(results[2].iters, 30);
                        assert.ok(results[3]);
                        assert.equal(results[3].pass, true);
                        assert.equal(results[3].iters, 77);
                        assert.ok(results[4]);
                        assert.equal(results[4].pass, false);
                        assert.equal(results[4].iters, 109);
                        bank.del('test', 2, function(err) { 
                            assert.ifError(err);
                            bank.del('test', 3, function(err) {
                                assert.ifError(err);
                                bank.del('test', 4, function(err) {
                                    assert.ifError(err);
                                    bank.disconnect(function(err) {
                                        assert.ifError(err);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
};

main(parseCmdLine(process.argv));
