// redisdatabank.js
//
// implementation of Databank interface using redis
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

var databank = require('../databank');
var redis = require('redis');

var Databank = databank.Databank;
var DatabankError = databank.DatabankError;
var AlreadyExistsError = databank.AlreadyExistsError;
var NoSuchThingError = databank.NoSuchThingError;

function RedisDatabank(params) {
    // Ignore params
    this.client = null;
    this.schema = params.schema || {};
}

RedisDatabank.prototype = new Databank();

RedisDatabank.prototype.toKey = function(type, id) {
    return type + ':' + id;
};

RedisDatabank.prototype.indexKey = function(type, prop, val) {
    return 'databank:index:' + type + ':' + prop + ':' + val;
};

RedisDatabank.prototype.connect = function(params, onCompletion) {
    this.client = redis.createClient();
    this.client.on('error', function(err) {
        if (onCompletion) {
            onCompletion(new DatabankError(err));
        }
    });
    this.client.on('connect', function() {
        if (onCompletion) {
            onCompletion(null);
        }
    });
};

RedisDatabank.prototype.disconnect = function(onCompletion) {
    this.client.quit(function(err) {
        if (err) {
            onCompletion(new DatabankError());
        } else {
            onCompletion(null);
        }
    });
};

RedisDatabank.prototype.create = function(type, id, value, onCompletion) {
    var bank = this;

    this.client.setnx(this.toKey(type, id), JSON.stringify(value), function(err, result) {
        if (err) {
            onCompletion(new DatabankError(err));
        } else if (result === 0) {
            onCompletion(new AlreadyExistsError(type, id));
        } else {
            bank.index(type, id, value, function(err) {
                if (err) {
                    onCompletion(err, null);
                } else {
                    onCompletion(null, value);
                }
            });
        }
    });
};

RedisDatabank.prototype.read = function(type, id, onCompletion) {
    this.client.get(this.toKey(type, id), function(err, value) {
        if (err) {
            onCompletion(new DatabankError(err), null);
        } else if (value === null) {
            onCompletion(new NoSuchThingError(type, id), null);
        } else {
            onCompletion(null, JSON.parse(value));
        }
    });
};

RedisDatabank.prototype.update = function(type, id, value, onCompletion) {
    bank = this;

    bank.deindex(type, id, function(err) {
        if (err) {
            onCompletion(err, null);
        } else {
            bank.client.set(bank.toKey(type, id), JSON.stringify(value), function(err) {
                if (err) {
                    onCompletion(new DatabankError(err), null);
                } else {
                    bank.index(type, id, value, function(err) {
                        if (err) {
                            onCompletion(err, null);
                        } else {
                            onCompletion(null, value);
                        }
                    });
                }
            });
        }
    });
};

RedisDatabank.prototype.del = function(type, id, onCompletion) {
    var bank = this;

    bank.deindex(type, id, function(err) {
        if (err) {
            onCompletion(err, null);
        } else {
            bank.client.del(bank.toKey(type, id), function(err, count) {
                if (err) {
                    onCompletion(err);
                } else if (count === 0) {
                    onCompletion(new NoSuchThingError(type, id));
                } else {
                    onCompletion(null);
                }
            });
        }
    });
};

RedisDatabank.prototype.readAll = function(type, ids, onCompletion) {

    var keys = [],
        bank = this;

    keys = ids.map(function(id) { return bank.toKey(type, id); } );

    this.client.mget(keys, function(err, values) {
        var results = {}, i = 0, key, id, value;
        
        if (err) {
            onCompletion(new DatabankError(err), null);
        } else {
            for (i = 0; i < values.length; i++) {
                key = keys[i];
                id = ids[i];
                value = JSON.parse(values[i]);
                results[id] = value;
            }
            onCompletion(null, results);
        }
    });
};

RedisDatabank.prototype.search = function(type, criteria, onResult, onCompletion) {
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
                onCompletion(null);
            } else {
                for (i in keys) {
                    bank.client.get(keys[i], function(err, value) {
                        if (err) {
                            hadErr = true;
                            onCompletion(err);
                        } else if (!hadErr) {
                            value = JSON.parse(value);
                            if (bank.matchesCriteria(value, unindexed)) {
                                onResult(value);
                            }
                            cnt++;
                            if (cnt == keys.length) {
                                // last one out turn off the lights
                                onCompletion(null);
                            }
                        }
                    });
                }
            }
        };

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
                onCompletion(err);
            } else {
                scanKeys(keys);
            }
        });
    } else {
        // Get every record of a given type
        bank.client.keys(type + ':*', function(err, keys) {
            if (err) {
                onCompletion(err);
            } else {
                scanKeys(keys);
            }
        });
    }
};

RedisDatabank.prototype.incr = function(type, id, onCompletion) {
    this.client.incr(this.toKey(type, id), onCompletion);
};

RedisDatabank.prototype.decr = function(type, id, onCompletion) {
    this.client.decr(this.toKey(type, id), onCompletion);
};

RedisDatabank.prototype.index = function(type, id, obj, onCompletion) {
    if (!this.schema ||
        !this.schema[type] ||
        !this.schema[type].indices ||
        this.schema[type].indices.length === 0) {
        onCompletion(null);
    } else {
        var indices = this.schema[type].indices,
            key = this.toKey(type, id),
             updated = 0,
            i = 0,
            hadErr = false,
            bank = this,
            addToIndex = function(prop, onCompletion) {
                var val = Databank.deepProperty(obj, prop),
                    indexKey = bank.indexKey(type, prop, val);
                
                bank.client.sadd(indexKey, key, function(err, result) {
                    if (err) {
                        onCompletion(err);
                    } else {
                        // Shouldn't have been there before, but we kind of don't care
                        onCompletion(null);
                    }
                });
            };

        for (i = 0; i < indices.length; i++) {
            addToIndex(indices[i], function(err) {
                if (err) {
                    hadErr = true;
                    onCompletion(err);
                } else if (!hadErr) {
                    updated++;
                    if (updated === indices.length) {
                        onCompletion(null);
                    }
                }
            });
        }
    }
};

RedisDatabank.prototype.deindex = function(type, id, onCompletion) {
    var bank = this;

    if (!this.schema ||
        !this.schema[type] ||
        !this.schema[type].indices ||
        this.schema[type].indices.length === 0) {
        onCompletion(null);
    } else {
        // We have to do an extra read here. :(
        // FIXME: have a path to pass down the "old object" if we've already read it
        this.read(type, id, function(err, obj) {
            var indices = bank.schema[type].indices,
                key = bank.toKey(type, id),
                updated = 0,
                i = 0,
                hadErr = false,
                delFromIndex = function(prop, onCompletion) {
                    var val = Databank.deepProperty(obj, prop),
                        indexKey = bank.indexKey(type, prop, val);
                    
                    bank.client.srem(indexKey, key, function(err, result) {
                        if (err) {
                            onCompletion(err);
                        } else {
                            // Shouldn't have been there before, but we kind of don't care
                            onCompletion(null);
                        }
                    });
                };

            if (err) {
                onCompletion(err);
            } else {
                for (i = 0; i < indices.length; i++) {
                    delFromIndex(indices[i], function(err) {
                        if (err) {
                            hadErr = true;
                            onCompletion(err);
                        } else if (!hadErr) {
                            updated++;
                            if (updated === indices.length) {
                                onCompletion(null);
                            }
                        }
                    });
                }
            }
        });
    }
};

exports.RedisDatabank = RedisDatabank;
