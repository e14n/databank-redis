This package is an abstraction tool for NoSQL databases in Node.js.

At development time, I don't really know or care which server I'm
using; I'm just making JSON objects and CRUD'ing them. I figure if I
stick to this simple interface, I won't get in trouble when I move
between servers.

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

Interface
---------

Rather than build a lot of factory-schmactory overhead, the interface
is pretty remedial.

    var RedisDatabank = require('./redisdatabank').RedisDatabank;

    var bank = new RedisDatabank();

    bank.connect({}, function(err) {
        if (err) {
            console.log("Couldn't connect to databank: " + err.message);
        } else {
       	    // ...       	  
        }
    });

So, you actually have to code your implementation decision in when
constructing a bank object. Probably that could be corrected in the
future to be more data-driven.

Databank
========

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
  
  That doesn't work.

* `NoSuchThingError`

  The type/id pair you were trying to read/update/delete doesn't exist.

* `AlreadyExistsError`

  The type/id pair you were trying to create *does* exist.

TODO
----

* MongoDB driver
* Riak driver
* LevelDB driver
* Cassandra driver
* CouchDB driver
* Factory interface
