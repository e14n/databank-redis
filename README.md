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

# License

Copyright 2011, 2012, StatusNet Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

> http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

# Schemata

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

## Dotted notation

In schemata you can use dotted-notation, a la MongoDB, to define
fields that are part of parts of the object. For example, for an
object like this:

    { email: "evan@status.net", name: { last: "Prodromou", first: "Evan" } }

...you may have a schema like this:

    { person: { pkey: "email", indices: ["name.last"] } }

# Databank

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

# DatabankError

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

# DatabankObject

This is a utility class for objects you want to store in a
Databank. To create the class, do this:

    var MyClass = DatabankObject.subClass('mytype');

This will make an object class that stores data in the 'mytype'
type. You can add more stuff to the class, of course.

The class's `type` is stored in `MyClass.type`.

The constructor takes an object as a parameter; it will copy all its
properties from this object. Good for "classifying" JSON. So:

    var json = getSomeJSONfromSomewhere();
    var myInst = new MyClass(json);

Each class has the following class methods:

* `bank()`

Gets the class's databank. Used internally for making queries. By
default, gets the DatabankObject.bank property. If you want to change
how this works, replace this function with... something else.

* `pkey()`

Gets the class's primary key. By default, looks for a class attribute
"schema" and tries to get the "pkey" element of that. Otherwise, it
checks the class's schema, looks for an element that matches the type
name, and tries to get pkey element of that. If that fails, it looks
at the class's databank's "schema", and tries to get that. Otherwise,
it just returns "id". Override if you have a better plan.

* `get(id, callback)`

Get the object with primary key `id` and returns it to the `callback`.

* `search(criteria, callback)`

Does a search for objects matching the criteria, collects them, and
returns an array to `callback`.

* `create(properties, callback)`

Creates a new instance of class with `properties` and returns it to callback. 

* `readAll(ids, callback)`

Reads all objects from the databank with the given array of
primary-key ids, and returns a map of {id: object}.

Each instance has the following methods:

* `update(properties, callback)`

For an existing object, update to the provided properties, and return
the resulting object to `callback`. Note that you can use only a few
properties; note that you can't use this method to _remove_ properties.

* `del(callback)`

Delete the object. `callback` takes a single error arg.

* `save(callback)`

Save the current state of the object, and return it to
`callback`. Will create new objects or update existing ones.

## Hooks

When I started using this library, I found myself overloading the
create(), update(), and save() methods to do extra things, like add an
auto-generated ID or timestamp, or to expand attributes stored by
reference. It was a little tricky, since I had to save off the default
auto-created function, then define a new function that called that
saved one.

To make this easier, I added a hooks mechanism. Now, every
DatabankObject subclass has the option of hooking certain
functionality without having to replicate the core
functionality. Default values are all no-ops.

Class methods:

* `beforeCreate(props, callback)`

Called before `create()`. A chance to add default values
or validate. `callback` takes two args: an err, or the (possibly
modified) props.

* `beforeGet(id, callback)`

Called before `create()`. I don't see a lot of reason to mess with
this, but it's here if you need it. `callback` takes two args: an err,
or the (possibly modified) id.

Instance methods:

* `afterCreate(callback)`

Called after `create()`. Good chance to save references. `callback`
takes one arg: an err.

* `afterGet(callback)`

Called after `get()`. Good chance to expand references. `callback`
takes one arg: an err.

* `beforeUpdate(props, callback)`

Called before `update()`. Validate, preserve immutables, or add
auto-generated properties. `callback` takes two args: an err and the
(possibly modified) props.

* `afterUpdate(callback)`

Called after `update()`. `callback` takes one arg: an err.

* `beforeDel(callback)`

Called before `del()`. Maybe prevent deleting something important?
Referential integrity? `callback` takes one arg: an err.

* `afterDel(callback)`

Called after `del()`. Delete related stuff? `callback` takes one arg:
an err.

* `beforeSave(callback)`

Called before `save()`. Validate, preserve, autogenerate. `callback`
takes one args: an err.

* `afterSave(callback)`

Called after `save()`. `callback` takes one args: an err.

TODO
----

See https://github.com/evanp/databank/issues

