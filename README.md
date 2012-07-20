databank-redis
==============

This is the Redis driver for Databank.

License
-------

Copyright 2012, StatusNet Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

> http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Usage
-----

To create a Redis databank, use the `Databank.get()` method:

    var Databank = require('databank').Databank;
    
    var db = Databank.get('redis', {});

The driver takes the following parameters:

* `schema`: the database schema, as described in the Databank README.

See the main databank package for info on its interface.

Under the covers
----------------

Keys in the database have the form "type:id". So a "person" with id
"evanp" is at "person:evanp".

Objects and arrays are stored as JSON-encoded strings in the LevelDB
database. Numbers are stored as numbers.

Indices are implemented as sets. Search uses set intersection to
quickly find keys to matching objects.

