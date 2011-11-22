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
        databankobject = null,
        Databank = null,
        DatabankError = null,
        DatabankObject = null,
        Person = null;

    console.log("Loading modules");

    // Get databank
    assert.doesNotThrow(function() {
        databank = require('../databank');
    }, Error, "Error loading databank module");

    assert.doesNotThrow(function() {
        databankobject = require('../databankobject');
    }, Error, "Error loading databankobject module");

    console.log("Getting classes");

    // Get Databank
    Databank = databank.Databank;
    DatabankError = databank.DatabankError;
    DatabankObject = databankobject.DatabankObject;

    assert.ok(Databank);
    assert.ok(DatabankError);
    assert.ok(DatabankObject);

    console.log("Getting databank");

    // Instantiate with factory method
    assert.doesNotThrow(function() {
        bank = Databank.get(params.driver, {schema: {person: {pkey: 'username'}}});
    }, Error, "Error on get()");

    assert.ok(bank);

    DatabankObject.bank = bank;

    console.log("Initializing Person class");

    Person = DatabankObject.subClass('person');

    assert.ok(Person);

    assert.ok(Person.get);
    assert.ok(Person.search);
    assert.ok(Person.pkey);
    assert.ok(Person.bank);
    assert.equal(Person.bank(), bank);
    assert.equal(Person.type, 'person');
    assert.equal(Person.pkey(), 'username');

    console.log("Connecting to databank");

    bank.connect(params, function(err) {

        var evan;

        console.log("Creating new person");

        assert.ifError(err);

        evan = new Person({username: 'evanp', name: {last: 'Prodromou', first: 'Evan'}, age: 42});

        assert.ok(evan);
        assert.ok(evan.del);
        assert.ok(evan.save);
        assert.equal(evan.username, 'evanp');
        assert.equal(evan.name.last, 'Prodromou');
        assert.equal(evan.name.first, 'Evan');
        assert.equal(evan.age, 42);

        evan.save(function(err, person) {
            assert.ifError(err);
            assert.ok(person);
            assert.equal(person.username, 'evanp');
            assert.equal(person.name.last, 'Prodromou');
            assert.equal(person.name.first, 'Evan');
            assert.equal(person.age, 42);

            console.log("Fetching new person");

            Person.get('evanp', function(err, person) {

                assert.ifError(err);
                assert.ok(person);
                assert.equal(person.username, 'evanp');
                assert.equal(person.name.last, 'Prodromou');
                assert.equal(person.name.first, 'Evan');
                assert.equal(person.age, 42);
                person.age = 43;

                console.log("Saving changed person");

                person.save(function(err, person) {

                    assert.ifError(err);
                    assert.ok(person);
                    assert.equal(person.username, 'evanp');
                    assert.equal(person.name.last, 'Prodromou');
                    assert.equal(person.name.first, 'Evan');
                    assert.equal(person.age, 43);

                    console.log("Fetching changed person");

                    Person.get('evanp', function(err, person) {
                        assert.ifError(err);
                        assert.ok(person);
                        assert.equal(person.username, 'evanp');
                        assert.equal(person.name.last, 'Prodromou');
                        assert.equal(person.name.first, 'Evan');
                        assert.equal(person.age, 43);

                        console.log("Deleting changed person");

                        person.del(function(err) {
                            assert.ifError(err);

                            console.log("Disconnecting databank");

                            bank.disconnect(function(err) {
                                assert.ifError(err);
                            });
                        });
                    });
                });
            });
        });
    });
};

main(parseCmdLine(process.argv));
