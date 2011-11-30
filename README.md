This package is an abstraction tool for document stores or key-value
stores in Node.js.

My goal is to hedge my bets by using a simple CRUD + search interface
for interacting with a datastore. If at some point I really need the
special snowflake features of Redis or MongoDB or Cassandra or Riak or
whatever, I should be able to bust out of this simple abstraction and
use their native interface without rewriting a lot of code.

I also want the data structures stored to look roughly like what
someone experienced with the datastore would expect.

I chose the name "databank" since it's not in widespread use and won't
cause name conflicts, and because it sounds like something a 1960s
robot would say.

License
-------

Copyright 2011, StatusNet Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

> http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Schemata
--------

This library assumes you have document "types" - like "person",
"chair", "photo", "bankaccount", "trainreservation" -- that you can
identify with a unique scalar key -- email address, URL, UUID, SSN, or
whatever.

Your "document" is anything that can be JSON-encoded and
decoded. Scalar, array and object/tree values are all totally cool.

Implementation classes that support schemata should support a "schema"
element on the constructor params for `Databank.get()` (see below). A
schema can have elements for each type, with the following elements:

* pkey: the primary key element name.

* indices: array of element names that should be indexed. You should
  really have an index on each element you search on frequently.

Dotted notation
===============

In schemata you can use dotted-notation, a la MongoDB, to define
fields that are part of parts of the object. For example, for an
object like this:

    { email: "evan@status.net", name: { last: "Prodromou", first: "Evan" } }

...you may have a schema like this:

    { person: { pkey: "email", indices: ["name.last"] } }

Databank
========

The class has a single static method for for initializing an instance:

* `get(driver, params)`

  Get an instance of `DriverDatabank` from the module `driverdatabank` and
  initialize it with the provided params (passed as a single object).

  This is the place you should usually pass in a schema parameter.

    var bank = Databank.get('redis', {schema: {person: {pkey: "email"}}});

    bank.connect({}, function(err) {
        if (err) {
            console.log("Couldn't connect to databank: " + err.message);
        } else {
            // ...                
        }
    });

The databank interface has these methods:

* `connect(params, onCompletion)`

  Connect to the databank. `params` may be used by the underlying server.

  `onCompletion` takes one argument: a `DatabankError` object. Null if no error.

* `disconnect(onCompletion)`

  Disconnect from the databank. `onCompletion` takes one argument, a DatabankError.

* `create(type, id, value, onCompletion)`

  Create a databank entry of type `type` with id `id` and content `value`.

  How `type` and `id` are mapped to keys or whatever in the DB is
  unspecified. Don't mix and match.

  `onCompletion` takes two arguments: a `DatabankError` (or null) and the
  created object. That created object may have some extra stuff added on.

  Common error type here is `AlreadyExistsError`.

      store.create('activity', uuid, activity, function(err, value) {
          if (err instanceof AlreadyExistsError) {
              res.writeHead(409, {'Content-Type': 'application/json'});
              res.end(JSON.stringify(err.message));
          } else if (err) {
              res.writeHead(400, {'Content-Type': 'application/json'});
              res.end(JSON.stringify(err.message));
          } else {
              res.writeHead(200, {'Content-Type': 'application/json'});
              res.end(JSON.stringify(value));
          }
      });

* `read(type, id, onCompletion)`

  Read an object of type `type` with id `id` from the databank. `onCompletion` will get
  two arguments: a `DatabankError` (or null) and the object if found.

  Common error type here is `NoSuchThingError` if the databank has no such object.

    bank.read('Book', '978-0141439600', function(err, user) {
        if (err instanceof NoSuchThingError) {
            res.writeHead(404, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(err.message));
        } else if (err) {
            res.writeHead(500, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(err.message));
        } else {
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(user));
        }
    });

* `update(type, id, value, onCompletion)`

  Update the (existing) object of type `type` with id `id` in the databank. `onCompletion`
  will get two arguments: a `DatabankError` (or null) and the object if found.

  Common error type here is `NoSuchThingError` if the databank has no such object.

* `save(type, id, value, onCompletion)`

  Either create a new object, or update an existing object. For when
  you don't care which.

* `del(type, id, onCompletion)`

  Delete the object of type `type` with id `id`. `onCompletion` takes one
  argument, a `DatabankError` (null on success).

  "delete" is a keyword, so I decided not to use that.

* `search(type, criteria, onResult, onCompletion)`

  Finds objects of type `type` which match `criteria`, a map of
  property names to exact value matches. `onResult` is called one time
  for each result, with a single argument, the object that matches the
  criteria. Use a collector array if you want all the results in an array.
  
  Property names can be dotted to indicate deeper structures; for
  example, this object:
  
	{name: {last: "Prodromou", first: "Evan"}, age: 43}

  would match the criteria `{"name.last": "Prodromou"}`.

  `onCompletion` takes one argument, a `DatabankError`. A search with
  no results will get a `NoSuchThingError`. I think this is the method
  most likely to elicit a `NotImplementedError`, since most key-value
  stores don't handle this kind of thing.

  You're also on your own on sorting.

    function getModerators(callback) {
        var results = [];

        bank.search('user', {role: 'moderator'}, function(result) {
                        results.append(result);
                    },
                    function(err) {
                        if (err) {
                            callback(err, null);
                        } else {
                            results.sort(function(a, b) { 
                                return a.created - b.created;
                            });
                            callback(null, results);
                        }
                    });
    }

DatabankError
=============

This is a subclass of `Error` for stuff that went wrong with a
`Databank`. Subclasses include:

* `NotImplementedError`
  
  That doesn't work (yet).

* `NoSuchThingError`

  The type/id pair you were trying to read/update/delete doesn't exist.

* `AlreadyExistsError`

  The type/id pair you were trying to create *does* exist.

* `NotConnectedError`

  You forgot to call `connect` first.

* `AlreadyConnectedError`

  You already called `connect`.

TODO
----

See https://github.com/evanp/databank/issues

