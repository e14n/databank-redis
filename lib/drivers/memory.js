// memory.js
//
// In-memory storage of data
//
// Copyright 2011,2012 StatusNet Inc.
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

var databank = require('../databank'),
    Databank = databank.Databank,
    DatabankError = databank.DatabankError,
    AlreadyExistsError = databank.AlreadyExistsError,
    NoSuchThingError = databank.NoSuchThingError;

var MemoryDatabank = function(params) {
    this.schema = params.schema || {};
};

MemoryDatabank.prototype = new Databank();

MemoryDatabank.prototype.freeze = function(value) {
    var dup, i;

    switch (typeof value) {
    case 'number':
        return value;
        break;
    case 'object':
        if (value instanceof Array) {
            dup = new Array(value.length);
            for (i = 0; i < value.length; i++) {
                dup[i] = this.freeze(value[i]);
            }
            return dup;
        }
        // FALL THROUGH
    default:
        return JSON.stringify(value);
    }
};

MemoryDatabank.prototype.melt = function(value) {
    var dup, i;

    switch (typeof value) {
    case 'number':
        return value;
        break;
    case 'object':
        if (value instanceof Array) {
            dup = new Array(value.length);
            for (i = 0; i < value.length; i++) {
                dup[i] = this.melt(value[i]);
            }
            return dup;
        }
        // FALL THROUGH
    default:
        return JSON.parse(value);
    }
};

MemoryDatabank.prototype.connect = function(params, onCompletion) {
    var bank = this;
    process.nextTick(function() {
        var type;
        bank.types = {};
        for (type in bank.schema) {
            bank.types[type] = {};
        }
        onCompletion(null);
    });
};

MemoryDatabank.prototype.disconnect = function(onCompletion) {
    var bank = this;
    process.nextTick(function() {
        delete bank.types;
        // Always succeed
        onCompletion(null);
    });
};

MemoryDatabank.prototype.create = function(type, id, value, onCompletion) {
    var bank = this;
    process.nextTick(function() {
        if (!(type in bank.types)) {
            bank.types[type] = {};
        }
        if (id in bank.types[type]) {
            onCompletion(new AlreadyExistsError(type, id), null);
        } else {
            bank.types[type][id] = bank.freeze(value);
            onCompletion(null, value);
        }
    });
};

MemoryDatabank.prototype.update = function(type, id, value, onCompletion) {
    var bank = this;
    process.nextTick(function() {
        if (!(type in bank.types)) {
            bank.types[type] = {};
        }
        if (!(id in bank.types[type])) {
            onCompletion(new NoSuchThingError(type, id), null);
        } else {
            bank.types[type][id] = bank.freeze(value);
            onCompletion(null, value);
        }
    });
};

MemoryDatabank.prototype.read = function(type, id, onCompletion) {
    var bank = this;
    process.nextTick(function() {
        var value;
        
        if (!(type in bank.types)) {
            bank.types[type] = {};
        }
        if (!(id in bank.types[type])) {
            onCompletion(new NoSuchThingError(type, id), null);
        } else {
            value = bank.melt(bank.types[type][id]);
            onCompletion(null, value);
        }
    });
};

MemoryDatabank.prototype.del = function(type, id, onCompletion) {
    var bank = this;
    process.nextTick(function() {
        if (!(type in bank.types)) {
            bank.types[type] = {};
        }
        if (!(id in bank.types[type])) {
            onCompletion(new NoSuchThingError(type, id));
        } else {
            delete bank.types[type][id];
            onCompletion(null);
        }
    });
};

MemoryDatabank.prototype.save = function(type, id, value, onCompletion) {
    var bank = this;
    process.nextTick(function() {
        if (!(type in bank.types)) {
            bank.types[type] = {};
        }
        bank.types[type][id] = bank.freeze(value);
        onCompletion(null, value);
    });
};

MemoryDatabank.prototype.search = function(type, criteria, onResult, onCompletion) {
    var bank = this;
    process.nextTick(function() {

        var id, value;

        if (!(type in bank.types)) {
            bank.types[type] = {};
        }

        // FIXME: maybe scanning each and every item isn't
        // the most efficient way to search...?

        for (id in bank.types[type]) {
            value = bank.melt(bank.types[type][id]);
            if (bank.matchesCriteria(value, criteria)) {
                onResult(value);
            }
        }

        onCompletion(null);
    });
};

MemoryDatabank.prototype.incr = function(type, id, onCompletion) {
    var bank = this;
    process.nextTick(function() {
        if (!(type in bank.types)) {
            bank.types[type] = {};
        }

        if (!(id in bank.types[type])) {
            bank.types[type][id] = 1;
            onCompletion(null, 1);
        } else {
            bank.types[type][id]++;
            onCompletion(null, bank.types[type][id]);
        }
    });
};

MemoryDatabank.prototype.decr = function(type, id, onCompletion) {
    var bank = this;
    process.nextTick(function() {
        if (!(type in bank.types)) {
            bank.types[type] = {};
        }
        if (!(id in bank.types[type])) {
            bank.types[type][id] = -1;
            onCompletion(null, -1);
        } else {
            bank.types[type][id]--;
            onCompletion(null, bank.types[type][id]);
        }
    });
};

exports.MemoryDatabank = MemoryDatabank;
