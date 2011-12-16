// memory.js
//
// In-memory storage of data
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

var databank = require('../databank'),
    Databank = databank.Databank,
    DatabankError = databank.DatabankError,
    AlreadyExistsError = databank.AlreadyExistsError,
    NoSuchThingError = databank.NoSuchThingError;

var MemoryDatabank = function(params) {
    this.schema = params.schema || {};
};

MemoryDatabank.prototype = new Databank();

MemoryDatabank.prototype.toKey = function(type, id) {
    return type + ":" + id;
};

MemoryDatabank.prototype.connect = function(params, onCompletion) {
    this.items = {};
    onCompletion(null);
};

MemoryDatabank.prototype.disconnect = function(onCompletion) {
    delete this.items;
    // Always succeed
    onCompletion(null);
};

MemoryDatabank.prototype.create = function(type, id, value, onCompletion) {
    var key = this.toKey(type, id);
    
    if (key in this.items) {
        onCompletion(new AlreadyExistsError(type, id), null);
    } else {
        this.items[key] = JSON.stringify(value);
        onCompletion(null, value);
    }
};

MemoryDatabank.prototype.update = function(type, id, value, onCompletion) {
    var key = this.toKey(type, id);
    
    if (!(key in this.items)) {
        onCompletion(new NoSuchThingError(type, id), null);
    } else {
        this.items[key] = JSON.stringify(value);
        onCompletion(null, value);
    }
};

MemoryDatabank.prototype.read = function(type, id, onCompletion) {
    var key = this.toKey(type, id),
        value;
    
    if (!(key in this.items)) {
        onCompletion(new NoSuchThingError(type, id), null);
    } else {
        value = JSON.parse(this.items[key]);
        onCompletion(null, value);
    }
};

MemoryDatabank.prototype.del = function(type, id, onCompletion) {
    var key = this.toKey(type, id);
    
    if (!(key in this.items)) {
        onCompletion(new NoSuchThingError(type, id));
    } else {
        delete this.items[key];
        onCompletion(null);
    }
};

MemoryDatabank.prototype.search = function(type, criteria, onResult, onCompletion) {

    var property, value;

    // FIXME: maybe scanning each and every item isn't
    // the most efficient way to search...?

    for (property in this.items) {
        if (property.substr(0, type.length + 1) === type + ':') {
            value = JSON.parse(this.items[property]);
            if (this.matchesCriteria(value, criteria)) {
                onResult(value);
            }
        }
    }

    onCompletion(null);
};

exports.MemoryDatabank = MemoryDatabank;
