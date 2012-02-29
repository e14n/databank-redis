// mongodatabank.js
//
// Implementation of Databank interface for MongoDB
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
    NoSuchThingError = databank.NoSuchThingError,
    NotImplementedError = databank.NotImplementedError,
    AlreadyConnectedError = databank.AlreadyConnectedError,
    NotConnectedError = databank.NotConnectedError;

var mongodb = require('mongodb'),
    Db = mongodb.Db,
    Server = mongodb.Server;

var MongoDatabank = function(params) {

    this.db = null;
    this.host = params.host || 'localhost';
    this.port = params.port || 27017;
    this.dbname = params.dbname || 'test';
    this.checkSchema = params.checkSchema || true;
    
    this.schema = params.schema || {};
};

MongoDatabank.prototype = new Databank();
MongoDatabank.prototype.constructor = MongoDatabank;

MongoDatabank.prototype.connect = function(params, onCompletion) {

    var host = params.host || this.host,
        port = params.port || this.port,
        dbname = params.dbname || this.dbname,
        server = new Server(host, port, params),
        checkSchema = params.checkSchema || this.checkSchema,
        bank = this;

    if (this.db) {
        if (onCompletion) {
            onCompletion(new AlreadyConnectedError());
        }
        return;
    }

    this.db = new Db(dbname, server);

    this.db.open(function(err, newDb) {
        if (err) {
            if (onCompletion) {
                onCompletion(err);
            }
        } else {
            if (checkSchema) {
                bank.checkBankSchema(function(err) {
                    if (err) {
                        if (onCompletion) {
                            onCompletion(err);
                        }
                    } else {
                        if (onCompletion) {
                            onCompletion(null);
                        }
                    }
                });
            } else {
                if (onCompletion) {
                    onCompletion(null);
                }
            }
        }
    });
};

// Disconnect yourself.
// onCompletion(err): function to call on completion

MongoDatabank.prototype.disconnect = function(onCompletion) {
    if (!this.db) {
        if (onCompletion) {
            onCompletion(new NotConnectedError());
        }
        return;
    }
    this.db.close(function() {
        this.db     = null;
        this.server = null;
        if (onCompletion) {
            onCompletion(null);
        }
    });
};

MongoDatabank.prototype._valueToRec = function(type, id, value) {

    var pkey = this.getPrimaryKey(type);

    if (typeof value === 'object' && !(value instanceof Array)) {
        value._id = id;
        if (value.hasOwnProperty(pkey)) {
            delete value[pkey];
        }
    } else {
        value = {_v: value, _s: true, _id: id};
    }

    return value;
};

MongoDatabank.prototype._recToValue = function(type, rec) {

    var pkey = this.getPrimaryKey(type), value;

    if (rec._s) {
        value = rec._v;
    } else {
        value = rec;
	if (pkey !== '_id') {
            value[pkey] = rec._id;
	    delete value._id;
	}
    }

    return value;
};

// Create a new thing
// type: string, type of thing, usually 'user' or 'activity'
// id: a unique ID, like a nickname or a UUID
// value: JavaScript value; will be JSONified
// onCompletion(err, value): function to call on completion

MongoDatabank.prototype.create = function(type, id, value, onCompletion) {
    
    var that = this;

    if (!this.db) {
        if (onCompletion) {
            onCompletion(new NotConnectedError());
        }
        return;
    }

    value = this._valueToRec(type, id, value);

    this.db.collection(type, function(err, coll) {
        if (err) {
            if (onCompletion) {
                onCompletion(err, null);
            }
        }
        coll.insert(value, {safe: true}, function(err, newValues) {
            if (err) {
                if (err.name && err.name == 'MongoError' && err.code && err.code == 11000) {
                    if (onCompletion) {
                        onCompletion(new AlreadyExistsError(type, id), null);
                    }
                } else {
                    if (onCompletion) {
                        onCompletion(err, null);
                    }
                }
            } else {
                // Mongo returns an array of values
                value = that._recToValue(type, newValues[0]);
                if (onCompletion) {
                    onCompletion(null, value);
                }
            }
        });
    });
};

// Read an existing thing
// type: the type of thing; 'user', 'activity'
// id: a unique ID -- nickname or UUID or URI
// onCompletion(err, value): function to call on completion

MongoDatabank.prototype.read = function(type, id, onCompletion) {

    var that = this;

    if (!this.db) {
        if (onCompletion) {
            onCompletion(new NotConnectedError());
        }
        return;
    }

    this.db.collection(type, function(err, coll) {
        var sel = {};
        if (err) {
            if (onCompletion) {
                onCompletion(err, null);
            }
        }
        sel._id = id;
        coll.findOne(sel, function(err, value) {
            if (err) {
                // FIXME: find key-miss errors and return a NotExistsError
                if (onCompletion) {
                    onCompletion(err, null);
                }
            } else if (!value) {
                if (onCompletion) {
                    onCompletion(new NoSuchThingError(type, id), null);
                }
            } else {
                value = that._recToValue(type, value);
                if (onCompletion) {
                    onCompletion(null, value);
                }
            }
        });
    });
};

// Update an existing thing
// type: the type of thing; 'user', 'activity'
// id: a unique ID -- nickname or UUID or URI
// value: the new value of the thing
// onCompletion(err, value): function to call on completion

MongoDatabank.prototype.update = function(type, id, value, onCompletion) {

    var that = this;

    if (!this.db) {
        if (onCompletion) {
            onCompletion(new NotConnectedError());
        }
        return;
    }

    value = this._valueToRec(type, id, value);

    this.db.collection(type, function(err, coll) {
        var sel = {};
        if (err) {
            if (onCompletion) {
                onCompletion(err, null);
            }
        }
        sel._id = id;
        coll.findAndModify(sel, [['_id', 'ascending']], value, {safe: true, 'new': true}, function(err, result) {
            if (err) {
                // FIXME: find key-miss errors and return a NotExistsError
                if (onCompletion) {
                    onCompletion(err, null);
                }
            } else {
                result = that._recToValue(type, result);
                if (onCompletion) {
                    onCompletion(null, result);
                }
            }
        });
    });
};

MongoDatabank.prototype.save = function(type, id, value, onCompletion) {

    var that = this;

    if (!this.db) {
        if (onCompletion) {
            onCompletion(new NotConnectedError());
        }
        return;
    }

    value = this._valueToRec(type, id, value);

    this.db.collection(type, function(err, coll) {
        var sel = {};
        if (err) {
            if (onCompletion) {
                onCompletion(err, null);
            }
        }
        sel._id = id;
        coll.update(sel, value, {upsert: true}, function(err) {
            if (err) {
                // FIXME: find key-miss errors and return a NotExistsError
                if (onCompletion) {
                    onCompletion(err, null);
                }
            } else {
                value = that._recToValue(type, value);
                if (onCompletion) {
                    onCompletion(null, value);
                }
            }
        });
    });
};

// Delete an existing thing
// type: the type of thing; 'user', 'activity'
// id: a unique ID -- nickname or UUID or URI
// value: the new value of the thing
// onCompletion(err): function to call on completion

MongoDatabank.prototype.del = function(type, id, onCompletion) {

    if (!this.db) {
        if (onCompletion) {
            onCompletion(new NotConnectedError());
        }
        return;
    }

    this.db.collection(type, function(err, coll) {

        var sel = {};

        if (err) {
            if (onCompletion) {
                onCompletion(err, null);
            }
        }

        sel._id = id;
        coll.remove(sel, {}, function(err) {
            if (err) {
                // FIXME: find key-miss errors and return a NotExistsError
                if (onCompletion) {
                    onCompletion(err);
                }
            } else {
                if (onCompletion) {
                    onCompletion(null);
                }
            }
        });
    });
};

// Search for things
// type: type of thing
// criteria: map of criteria, with exact matches, like {'subject.id':'tag:example.org,2011:evan' }
// onResult(value): called once per result found
// onCompletion(err): called once at the end of results

MongoDatabank.prototype.search = function(type, criteria, onResult, onCompletion) {

    var pkey = this.getPrimaryKey(type), that = this;

    if (!this.db) {
        if (onCompletion) {
            onCompletion(new NotConnectedError());
        }
        return;
    }

    if (criteria.hasOwnProperty(pkey)) {
        criteria._id = criteria[pkey];
        delete criteria[pkey];
    }

    this.db.collection(type, function(err, coll) {
        if (err) {
            if (onCompletion) {
                onCompletion(err, null);
            }
        } else {
            coll.find(criteria, function(err, cursor) {
                if (err) {
                    if (onCompletion) {
                        onCompletion(err);
                    }
                } else {
                    var lastErr = null;

                    cursor.each(function(err, value) {
                        if (err) {
                            lastErr = err;
                        } else if (value && !lastErr) {
                            value = that._recToValue(type, value);
                            onResult(value);
                        } else if (value === null) { // called after last value
                            onCompletion(lastErr);
                        }
                    });
                }
            });
        }
    });
};

MongoDatabank.prototype.incr = function(type, id, onCompletion) {

    var that = this;

    if (!this.db) {
        if (onCompletion) {
            onCompletion(new NotConnectedError());
        }
        return;
    }

    this.db.collection(type, function(err, coll) {
        if (err) {
            if (onCompletion) {
                onCompletion(err, null);
            }
        } else {
            coll.update({_id: id}, {"$inc": {"_v": 1}, "$set": {"_s": true}}, {upsert: true, multi: false}, function(err) {
                if (err) {
                    if (onCompletion) {
                        onCompletion(err, null);
                    }
                } else {
                    that.read(type, id, onCompletion);
                }
            });
        }
    });
};

MongoDatabank.prototype.decr = function(type, id, onCompletion) {

    var that = this;

    if (!this.db) {
        if (onCompletion) {
            onCompletion(new NotConnectedError());
        }
        return;
    }

    this.db.collection(type, function(err, coll) {
        if (err) {
            if (onCompletion) {
                onCompletion(err, null);
            }
        } else {
            coll.update({_id: id}, {"$inc": {"_v": -1}, "$set": {"_s": true}}, {upsert: true, multi: false}, function(err) {
                if (err) {
                    if (onCompletion) {
                        onCompletion(err, null);
                    }
                } else {
                    that.read(type, id, onCompletion);
                }
            });
        }
    });
};

MongoDatabank.prototype.append = function(type, id, toAppend, onCompletion) {
    var that = this;

    if (!this.db) {
        if (onCompletion) {
            onCompletion(new NotConnectedError());
        }
        return;
    }

    this.db.collection(type, function(err, coll) {
        if (err) {
            if (onCompletion) {
                onCompletion(err, null);
            }
        } else {
            coll.update({_id: id}, {"$push": {"_v": toAppend}, "$set": {"_s": true}}, {upsert: true, multi: false}, function(err) {
                if (err) {
                    if (onCompletion) {
                        onCompletion(err, null);
                    }
                } else {
                    that.read(type, id, onCompletion);
                }
            });
        }
    });
};

MongoDatabank.prototype.readAll = function(type, ids, onCompletion) {

    var pkey = this.getPrimaryKey(type), that = this;

    if (!this.db) {
        if (onCompletion) {
            onCompletion(new NotConnectedError());
        }
        return;
    }

    this.db.collection(type, function(err, coll) {
        if (err) {
            if (onCompletion) {
                onCompletion(err, null);
            }
        } else {
            coll.find({'_id': {'$in': ids}}, function(err, cursor) {
                if (err) {
                    if (onCompletion) {
                        onCompletion(err);
                    }
                } else {
                    var lastErr = null,
			results = {}, i, id;

		    // Initialize with nulls

		    for (i in ids) {
			results[ids[i]] = null;
		    }

                    cursor.each(function(err, value) {
                        if (err) {
                            lastErr = err;
                        } else if (value && !lastErr) {
			    id = value._id;
                            value = that._recToValue(type, value);
			    results[id] = value;
                        } else if (value === null) { // called after last value
                            onCompletion(lastErr, results);
                        }
                    });
                }
	    });
	}
    });
};

MongoDatabank.prototype.getPrimaryKey = function(type) {
    return (this.schema && this.schema[type]) ? this.schema[type].pkey : '_id';
};

// XXX: this got weird. Not sure why.

MongoDatabank.prototype.checkBankSchema = function(onCompletion) {

    var pairs = [];
    var pair;
    var type;
    var bank = this;

    var checkType = function(type, schema, next) {
        bank.db.collection(type, function(err, coll) {
            var keys = {},
                total = 0,
                cnt = 0,
                i = 0,
                hadErr = false,
                indexDone = function(err) {
                    if (err) {
                        next(err);
                        hadErr = true;
                    } else {
                        cnt++;
                        if (cnt >= total && !hadErr) {
                            next(null);
                        }
                    }
                };

            if (err) {
                next(err);
            } else {
                if (schema.indices) {
                    total += schema.indices.length;
                }
                if (total === 0) {
                    next(null);
                } else {
                    if (schema.indices) {
                        for (i = 0; i < schema.indices.length; i++) {
                            keys = {};
                            keys[schema.indices[i]] = 1;
                            coll.ensureIndex(keys, {}, indexDone);
                        }
                    }
                }
            }
        });
    };

    var checkNextType = function(pairsLeft, next) {
        var pair;
        if (pairsLeft.length === 0) {
            next(null);
        } else {
            pair = pairsLeft.pop();
            checkType(pair[0], pair[1], function(err) {
                if (err) {
                    next(err);
                } else {
                    checkNextType(pairsLeft, next);
                }
            });
        }
    };

    for (type in this.schema) {
        pair = [type, this.schema[type]];
        pairs.push(pair);
    }

    checkNextType(pairs, onCompletion);
};

exports.MongoDatabank = MongoDatabank;

