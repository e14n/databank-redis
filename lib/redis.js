// redisdatabank.js
//
// implementation of Databank interface using redis
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

var databank = require('databank'),
    redis = require('redis'),
    Databank = databank.Databank,
    DatabankError = databank.DatabankError,
    AlreadyExistsError = databank.AlreadyExistsError,
    NoSuchThingError = databank.NoSuchThingError,
    NotConnectedError = databank.NotConnectedError,
    AlreadyConnectedError = databank.AlreadyConnectedError;

function RedisDatabank(params) {
    // Ignore params
    this.client = null;
    this.host   = params.host || '127.0.0.1';
    this.port   = params.port || 6379;
    this.schema = params.schema || {};
}

RedisDatabank.prototype = new Databank();

RedisDatabank.prototype.toKey = function(type, id) {
    return type + ':' + id;
};

RedisDatabank.prototype.indexKey = function(type, prop, val) {
    return 'databank:index:' + type + ':' + prop + ':' + val;
};

RedisDatabank.prototype.connect = function(params, callback) {

    var onConnectionError = function(err) {
        if (callback) {
            callback(new DatabankError(err));
        }
    }, that = this;

    if (this.client) {
        callback(new AlreadyConnectedError());
        return;
    }

    this.client = redis.createClient(this.port, this.host);

    this.client.on('error', onConnectionError);

    this.client.once('connect', function() {
        // Only want this once
        that.client.removeListener('error', onConnectionError);
        if (callback) {
            callback(null);
        }
    });
};

RedisDatabank.prototype.disconnect = function(callback) {

    var bank = this;

    if (!this.client) {
        callback(new NotConnectedError());
        return;
    }

    this.client.quit(function(err) {
        if (err) {
            callback(err);
        } else {
            bank.client = null;
            callback(null);
        }
    });
};

RedisDatabank.prototype.create = function(type, id, value, callback) {
    var bank = this;

    if (!this.client) {
        callback(new NotConnectedError(), null);
        return;
    }

    this.client.setnx(this.toKey(type, id), JSON.stringify(value), function(err, result) {
        if (err) {
            callback(new DatabankError(err));
        } else if (result === 0) {
            callback(new AlreadyExistsError(type, id));
        } else {
            bank.index(type, id, value, function(err) {
                if (err) {
                    callback(err, null);
                } else {
                    callback(null, value);
                }
            });
        }
    });
};

RedisDatabank.prototype.read = function(type, id, callback) {

    if (!this.client) {
        callback(new NotConnectedError(), null);
        return;
    }

    this.client.get(this.toKey(type, id), function(err, value) {
        if (err) {
            callback(new DatabankError(err), null);
        } else if (value === null) {
            callback(new NoSuchThingError(type, id), null);
        } else {
            callback(null, JSON.parse(value));
        }
    });
};

RedisDatabank.prototype.update = function(type, id, value, callback) {
    var bank = this;

    if (!this.client) {
        callback(new NotConnectedError(), null);
        return;
    }

    bank.deindex(type, id, function(err) {
        if (err) {
            callback(err, null);
        } else {
            bank.client.set(bank.toKey(type, id), JSON.stringify(value), function(err) {
                if (err) {
                    callback(new DatabankError(err), null);
                } else {
                    bank.index(type, id, value, function(err) {
                        if (err) {
                            callback(err, null);
                        } else {
                            callback(null, value);
                        }
                    });
                }
            });
        }
    });
};

RedisDatabank.prototype.del = function(type, id, callback) {
    var bank = this;

    if (!this.client) {
        callback(new NotConnectedError());
        return;
    }

    bank.deindex(type, id, function(err) {
        if (err) {
            callback(err, null);
        } else {
            bank.client.del(bank.toKey(type, id), function(err, count) {
                if (err) {
                    callback(err);
                } else if (count === 0) {
                    callback(new NoSuchThingError(type, id));
                } else {
                    callback(null);
                }
            });
        }
    });
};

RedisDatabank.prototype.readAll = function(type, ids, callback) {

    var keys = [],
        bank = this;

    if (!this.client) {
        callback(new NotConnectedError(), null);
        return;
    }

    keys = ids.map(function(id) { return bank.toKey(type, id); } );

    this.client.mget(keys, function(err, values) {
        var results = {}, i = 0, key, id, value;
        
        if (err) {
            callback(new DatabankError(err), null);
        } else {
            for (i = 0; i < values.length; i++) {
                key = keys[i];
                id = ids[i];
                value = JSON.parse(values[i]);
                results[id] = value;
            }
            callback(null, results);
        }
    });
};

RedisDatabank.prototype.search = function(type, criteria, onResult, callback) {
    var bank = this,
        indices = [],
        property,
        indexed = {},
        unindexed = {},
        haveIndexed = false,
        indexKeys = [],
        scanKeys = function(keys) {
            var i, cnt = 0, hadErr;
            if (keys.length === 0) {
                // not an error, just no results
                callback(null);
            } else {
                for (i in keys) {
                    bank.client.get(keys[i], function(err, value) {
                        if (err) {
                            hadErr = true;
                            callback(err);
                        } else if (!hadErr) {
                            value = JSON.parse(value);
                            if (bank.matchesCriteria(value, unindexed)) {
                                onResult(value);
                            }
                            cnt++;
                            if (cnt == keys.length) {
                                // last one out turn off the lights
                                callback(null);
                            }
                        }
                    });
                }
            }
        };

    if (!bank.client) {
        callback(new NotConnectedError(), null);
        return;
    }

    // Determine which criteria, if any, are on an indexed property

    if (bank.schema && bank.schema[type] && bank.schema[type].indices) {
        indices = bank.schema[type].indices;
        for (property in criteria) {
            if (indices.indexOf(property) == -1) {
                unindexed[property] = criteria[property];
            } else {
                haveIndexed = true;
                indexed[property] = criteria[property];
            }
        }
    } else {
        unindexed = criteria;
    }

    // If there are any indexed properties, use set intersection to get candidate keys
    if (haveIndexed) {
        for (property in indexed) {
            indexKeys.push(bank.indexKey(type, property, indexed[property]));
        }
        // intersection of all keys. note: with just one arg, sinter returns all
        // values under that key
        bank.client.sinter(indexKeys, function(err, keys) {
            if (err) {
                callback(err);
            } else {
                scanKeys(keys);
            }
        });
    } else {
        // Get every record of a given type
        bank.client.keys(type + ':*', function(err, keys) {
            if (err) {
                callback(err);
            } else {
                scanKeys(keys);
            }
        });
    }
};

RedisDatabank.prototype.incr = function(type, id, callback) {
    if (!this.client) {
        callback(new NotConnectedError(), null);
        return;
    }
    this.client.incr(this.toKey(type, id), callback);
};

RedisDatabank.prototype.decr = function(type, id, callback) {
    if (!this.client) {
        callback(new NotConnectedError(), null);
        return;
    }
    this.client.decr(this.toKey(type, id), callback);
};

RedisDatabank.prototype.index = function(type, id, obj, callback) {
    if (!this.schema ||
        !this.schema[type] ||
        !this.schema[type].indices ||
        this.schema[type].indices.length === 0) {
        callback(null);
    } else {
        var indices = this.schema[type].indices,
            key = this.toKey(type, id),
            updated = 0,
            i = 0,
            hadErr = false,
            bank = this,
            addToIndex = function(prop, callback) {
                var val = Databank.deepProperty(obj, prop),
                    indexKey = bank.indexKey(type, prop, val);
                
                bank.client.sadd(indexKey, key, function(err, result) {
                    if (err) {
                        callback(err);
                    } else {
                        // Shouldn't have been there before, but we kind of don't care
                        callback(null);
                    }
                });
            };

        for (i = 0; i < indices.length; i++) {
            addToIndex(indices[i], function(err) {
                if (err) {
                    hadErr = true;
                    callback(err);
                } else if (!hadErr) {
                    updated++;
                    if (updated === indices.length) {
                        callback(null);
                    }
                }
            });
        }
    }
};

RedisDatabank.prototype.deindex = function(type, id, callback) {
    var bank = this;

    if (!this.schema ||
        !this.schema[type] ||
        !this.schema[type].indices ||
        this.schema[type].indices.length === 0) {
        callback(null);
    } else {
        // We have to do an extra read here. :(
        // FIXME: have a path to pass down the "old object" if we've already read it
        this.read(type, id, function(err, obj) {
            var indices = bank.schema[type].indices,
                key = bank.toKey(type, id),
                updated = 0,
                i = 0,
                hadErr = false,
                delFromIndex = function(prop, callback) {
                    var val = Databank.deepProperty(obj, prop),
                        indexKey = bank.indexKey(type, prop, val);
                    
                    bank.client.srem(indexKey, key, function(err, result) {
                        if (err) {
                            callback(err);
                        } else {
                            // Shouldn't have been there before, but we kind of don't care
                            callback(null);
                        }
                    });
                };

            if (err) {
                callback(err);
            } else {
                for (i = 0; i < indices.length; i++) {
                    delFromIndex(indices[i], function(err) {
                        if (err) {
                            hadErr = true;
                            callback(err);
                        } else if (!hadErr) {
                            updated++;
                            if (updated === indices.length) {
                                callback(null);
                            }
                        }
                    });
                }
            }
        });
    }
};

module.exports = RedisDatabank;
