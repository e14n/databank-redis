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
    this.client.setnx(this.toKey(type, id), JSON.stringify(value), function(err, result) {
        if (err) {
            onCompletion(new DatabankError(err));
        } else if (result === 0) {
            onCompletion(new AlreadyExistsError(type, id));
        } else {
            onCompletion(null, value);
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
    this.client.set(this.toKey(type, id), JSON.stringify(value), function(err) {
        if (err) {
            onCompletion(new DatabankError(err), null);
        } else {
            onCompletion(null, value);
        }
    });
};

RedisDatabank.prototype.del = function(type, id, onCompletion) {
    this.client.del(this.toKey(type, id), function(err, count) {
        if (err) {
            onCompletion(err);
        } else if (count === 0) {
            onCompletion(new NoSuchThingError(type, id));
        } else {
            onCompletion(null);
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
    var bank = this;
    // FIXME: use indices to make this less horrific
    bank.client.keys(type + ':*', function(err, keys) {
        var i, cnt = 0, hadErr;
        if (err) {
            onCompletion(err);
        } else {
            for (i in keys) {
                bank.client.get(keys[i], function(err, value) {
                    if (err) {
                        hadErr = true;
                        onCompletion(err);
                    } else if (!hadErr) {
                        if (bank.matchesCriteria(value, criteria)) {
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
    });
};

RedisDatabank.prototype.incr = function(type, id, onCompletion) {
    this.client.incr(this.toKey(type, id), onCompletion);
};

RedisDatabank.prototype.decr = function(type, id, onCompletion) {
    this.client.decr(this.toKey(type, id), onCompletion);
};

exports.RedisDatabank = RedisDatabank;
