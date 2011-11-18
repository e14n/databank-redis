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

var databank = require('./databank');
var redis = require('redis');

var Databank = databank.Databank;
var DatabankError = databank.DatabankError;
var AlreadyExistsError = databank.AlreadyExistsError;
var NoSuchThingError = databank.NoSuchThingError;

function RedisDatabank(params) {
    // Ignore params
    this.client = null;
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
	} else if (result == 0) {
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
	} else if (value == null) {
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
	    onCompletion(new DatabankError(err));
	} else if (count == 0) {
	    onCompletion(new NoSuchThingError(type, id));
	} else {
	    onCompletion(null);
	}
    });
};

exports.RedisDatabank = RedisDatabank;
