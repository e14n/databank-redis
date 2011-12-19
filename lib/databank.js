// databank.js
//
// abstraction for storing JSON data in some kinda storage
//
// Copyright 2011, StatusNet Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// I'm too much of a wuss to commit to any JSON storage mechanism right
// now, so I'm just going to declare the interface I need and try a few
// different systems to implement it.

// A thing that stores JSON.
// Basically CRUD + Search. Recognizes types of data without
// enforcing a schema.

function Databank(params) {
}

Databank.driverToClassName = function(driver) {
    return driver.substring(0,1).toUpperCase() + driver.substring(1, driver.length).toLowerCase() + "Databank";
};

Databank.driverToModuleName = function(driver) {
    return './drivers/' + driver.toLowerCase();
};

Databank.deepProperty = function(object, property) {
    var i = property.indexOf('.');
    if (!object) {
        return null;
    } else if (i == -1) { // no dots
        return object[property];
    } else {
        return Databank.deepProperty(object[property.substr(0, i)], property.substr(i + 1));
    }
};

Databank.get = function(driver, params) {

    var className = Databank.driverToClassName(driver),
        module = Databank.driverToModuleName(driver),
        mod = require(module),
        cls = mod[className],
        db = new cls(params);

    return db;
};

Databank.prototype = {

    // Connect yourself on up.
    // params: object containing any params you need
    // onCompletion(err): function to call on completion

    connect: function(params, onCompletion)
    {
        if (onCompletion) {
            onCompletion(new NotImplementedError());
        }
    },

    // Disconnect yourself.
    // onCompletion(err): function to call on completion

    disconnect: function(onCompletion)
    {
        if (onCompletion) {
            onCompletion(new NotImplementedError());
        }
    },

    // Create a new thing
    // type: string, type of thing, usually 'user' or 'activity'
    // id: a unique ID, like a nickname or a UUID
    // value: JavaScript value; will be JSONified
    // onCompletion(err, value): function to call on completion

    create: function(type, id, value, onCompletion)
    {
        if (onCompletion) {
            onCompletion(new NotImplementedError(), null);
        }
    },

    // Read an existing thing
    // type: the type of thing; 'user', 'activity'
    // id: a unique ID -- nickname or UUID or URI
    // onCompletion(err, value): function to call on completion

    read: function(type, id, onCompletion)
    {
        if (onCompletion) {
            onCompletion(new NotImplementedError(), null);
        }
    },

    // Update an existing thing
    // type: the type of thing; 'user', 'activity'
    // id: a unique ID -- nickname or UUID or URI
    // value: the new value of the thing
    // onCompletion(err, value): function to call on completion

    update: function(type, id, value, onCompletion)
    {
        if (onCompletion) {
            onCompletion(new NotImplementedError(), null);
        }
    },

    // Delete an existing thing
    // type: the type of thing; 'user', 'activity'
    // id: a unique ID -- nickname or UUID or URI
    // value: the new value of the thing
    // onCompletion(err): function to call on completion

    del: function(type, id, onCompletion)
    {
        if (onCompletion) {
            onCompletion(new NotImplementedError());
        }
    },

    // Search for things
    // type: type of thing
    // criteria: map of criteria, with exact matches,
    //           like {'subject.id':'tag:example.org,2011:evan' }
    // onResult(value): called once per result found
    // onCompletion(err): called once at the end of results

    search: function(type, criteria, onResult, onCompletion)
    {
        if (onCompletion) {
            onCompletion(new NotImplementedError());
        }
    },

    // Update an existing thing
    // type: the type of thing; 'user', 'activity'
    // id: a unique ID -- nickname or UUID or URI
    // value: the new value of the thing
    // onCompletion(err, value): function to call on completion

    save: function(type, id, value, onCompletion)
    {
        var bank = this;

        bank.update(type, id, value, function(err, result) {
            if (err instanceof NoSuchThingError) {
                bank.create(type, id, value, function(err, result) {
                    onCompletion(err, result);
                });
            } else {
                onCompletion(err, result);
            }
        });
    },

    // Read a bunch of things from the db
    // type: the type of thing; 'user', 'activity'
    // id: array of IDs
    // onCompletion(err, results): function to call on completion;
    //    err: an error or null if none
    //    results: map of id (maybe stringified) to value

    readAll: function(type, ids, onCompletion) {
        var results = {},
            cnt = 0,
            i = 0,
            bank = this,
            readOne = function(id) {
                bank.read(type, id, function(err, value) {
                    if (!err || err instanceof NoSuchThingError) {
                        results[id] = value;
                        cnt++;
                        if (cnt === ids.length) {
                            onCompletion(null, results);
                        }
                    } else {
                        onCompletion(err, null);
                    }
                });
            };

        for (i = 0; i < ids.length; i++) {
            readOne(ids[i]);
        }
    },

    readAndModify: function(type, id, def, modify, onCompletion) {
        var bank = this;
        bank.read(type, id, function(err, value) {
            if (err) {
                // Set to def if not exist
                if (err instanceof NoSuchThingError) {
                    bank.create(type, id, def, onCompletion);
                } else {
                    onCompletion(err, null);
                }
            } else {
                bank.update(type, id, modify(value), onCompletion);
            }
        });
    },

    incr: function(type, id, onCompletion) {
        this.readAndModify(type,
                           id,
                           1, 
                           function(value) { return value+1; },
                           onCompletion);
    },

    decr: function(type, id, onCompletion) {
        this.readAndModify(type,
                           id,
                           -1, 
                           function(value) { return value-1; },
                           onCompletion);
    },

    append: function(type, id, toAppend, onCompletion) {
        this.readAndModify(type,
                           id,
                           [toAppend], 
                           function(value) { value.push(toAppend); return value; },
                           onCompletion);
    },

    prepend: function(type, id, toPrepend, onCompletion) {
        this.readAndModify(type,
                           id,
                           [toPrepend], 
                           function(value) { value.unshift(toPrepend); return value; },
                           onCompletion);
    },

    item: function(type, id, index, onCompletion) {
        this.read(type, id, function(err, value) {
            if (err) {
                onCompletion(err, null);
            } else {
                if (typeof value == 'object' && value instanceof Array) {
                    onCompletion(null, value[index]);
                } else {
                    onCompletion(new DatabankError("(" + type + ": " + id + ") is not an array"), null);
                }
            }
        });
    },

    slice: function(type, id, start, length, onCompletion) {
        this.read(type, id, function(err, value) {
            if (err) {
                onCompletion(err, null);
            } else {
                if (typeof value == 'object' && value instanceof Array) {
                    onCompletion(null, value.slice(start, length));
                } else {
                    onCompletion(new DatabankError("(" + type + ": " + id + ") is not an array"), null);
                }
            }
        });
    },

    // utility for searches

    matchesCriteria: function(value, criteria) {
        var property;

        for (property in criteria) {
            if (Databank.deepProperty(value, property) != criteria[property]) {
                return false;
            }
        }
        return true;
    }
};

// A custom error for Databank schtuff.

var DatabankError = function(message) {
    Error.captureStackTrace(this, DatabankError);
    this.name = 'DatabankError';
    this.message = message || "Databank error";
};

DatabankError.prototype = new Error();
DatabankError.prototype.constructor = DatabankError;

var NoSuchThingError = function(type, id) {
    Error.captureStackTrace(this, NoSuchThingError);
    this.name = 'NoSuchThingError';
    this.type = type;
    this.id   = id;
    this.message = "No such '" + type + "' with id '" + id + "'";
};

NoSuchThingError.prototype = new DatabankError();
NoSuchThingError.prototype.constructor = NoSuchThingError;

var AlreadyExistsError = function(type, id) {
    Error.captureStackTrace(this, AlreadyExistsError);
    this.name = 'AlreadyExistsError';
    this.type = type;
    this.id   = id;
    this.message = "Already have a(n) '" + type + "' with id '" + id + "'";
};

AlreadyExistsError.prototype = new DatabankError();
AlreadyExistsError.prototype.constructor = AlreadyExistsError;

var NotImplementedError = function() {
    Error.captureStackTrace(this, NotImplementedError);
    this.name = 'NotImplementedError';
    this.message = "Method not yet implemented.";
};

NotImplementedError.prototype = new DatabankError();
NotImplementedError.prototype.constructor = NotImplementedError;

var NotConnectedError = function() {
    Error.captureStackTrace(this, NotConnectedError);
    this.name = 'NotConnectedError';
    this.message = "Not connected to a server.";
};

NotConnectedError.prototype = new DatabankError();
NotConnectedError.prototype.constructor = NotConnectedError;

var AlreadyConnectedError = function() {
    Error.captureStackTrace(this, AlreadyConnectedError);
    this.name = 'AlreadyConnectedError';
    this.message = "Already connected to a server.";
};

AlreadyConnectedError.prototype = new DatabankError();
AlreadyConnectedError.prototype.constructor = AlreadyConnectedError;

exports.Databank = Databank;
exports.DatabankError = DatabankError;
exports.NotImplementedError = NotImplementedError;
exports.NoSuchThingError = NoSuchThingError;
exports.AlreadyExistsError = AlreadyExistsError;
exports.AlreadyConnectedError = AlreadyConnectedError;
exports.NotConnectedError = NotConnectedError;
