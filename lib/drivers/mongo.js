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
    this.host = params.host || 'localhost',
    this.port = params.port || 27017,
    this.dbname = params.dbname || 'test',
    this.checkSchema = params.checkSchema || true,
        
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

// Create a new thing
// type: string, type of thing, usually 'user' or 'activity'
// id: a unique ID, like a nickname or a UUID
// value: JavaScript value; will be JSONified
// onCompletion(err, value): function to call on completion

MongoDatabank.prototype.create = function(type, id, value, onCompletion) {

    var wrapper, pkey;

    if (!this.db) {
        if (onCompletion) {
            onCompletion(new NotConnectedError());
        }
        return;
    }

    pkey = this.getPrimaryKey(type);

    if (typeof value === 'object' && !(value instanceof Array)) {
        if (!value[pkey] || value[pkey] !== id) {
            value[pkey] = id;
        }
    } else {
	wrapper = {value: value, mongodatabankshim: true};
	wrapper[pkey] = id;
	value = wrapper;
    }

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
		value = newValues[0];
		if (value.mongodatabankshim) {
		    value = value.value;
		}
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

    if (!this.db) {
        if (onCompletion) {
            onCompletion(new NotConnectedError());
        }
        return;
    }

    var pkey = this.getPrimaryKey(type);

    this.db.collection(type, function(err, coll) {
        var sel = {};
        if (err) {
            if (onCompletion) {
                onCompletion(err, null);
            }
        }
        sel[pkey] = id;
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
		if (value.mongodatabankshim) {
		    value = value.value;
		}
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

    var wrapper, pkey;

    if (!this.db) {
        if (onCompletion) {
            onCompletion(new NotConnectedError());
        }
        return;
    }

    pkey = this.getPrimaryKey(type);

    if (typeof value === 'object' && !(value instanceof Array)) {
        if (!value[pkey] || value[pkey] !== id) {
            value[pkey] = id;
        }
    } else {
	wrapper = {value: value, mongodatabankshim: true};
	wrapper[pkey] = id;
	value = wrapper;
    }

    this.db.collection(type, function(err, coll) {
        var sel = {};
        if (err) {
            if (onCompletion) {
                onCompletion(err, null);
            }
        }
        sel[pkey] = id;
        coll.findAndModify(sel, [['_id', 'ascending']], value, {safe: true, new: true}, function(err, result) {
            if (err) {
                // FIXME: find key-miss errors and return a NotExistsError
                if (onCompletion) {
                    onCompletion(err, null);
                }
            } else {
		if (result.mongodatabankshim) {
		    result = result.value;
		}
                if (onCompletion) {
                    onCompletion(null, result);
                }
            }
        });
    });
};

MongoDatabank.prototype.save = function(type, id, value, onCompletion) {

    var wrapper, pkey;

    if (!this.db) {
        if (onCompletion) {
            onCompletion(new NotConnectedError());
        }
        return;
    }

    pkey = this.getPrimaryKey(type);

    if (typeof value === 'object' && !(value instanceof Array)) {
        if (!value[pkey] || value[pkey] !== id) {
            value[pkey] = id;
        }
    } else {
	wrapper = {value: value, mongodatabankshim: true};
	wrapper[pkey] = id;
	value = wrapper;
    }

    this.db.collection(type, function(err, coll) {
        var sel = {};
        if (err) {
            if (onCompletion) {
                onCompletion(err, null);
            }
        }
        sel[pkey] = id;
        coll.update(sel, value, {upsert: true}, function(err) {
            if (err) {
                // FIXME: find key-miss errors and return a NotExistsError
                if (onCompletion) {
                    onCompletion(err, null);
                }
            } else {
		if (value.mongodatabankshim) {
		    value = value.value;
		}
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

    var pkey = this.getPrimaryKey(type);

    this.db.collection(type, function(err, coll) {

        var sel = {};

        if (err) {
            if (onCompletion) {
                onCompletion(err, null);
            }
        }

        sel[pkey] = id;
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
			    if (value.mongodatabankshim) {
			        value = value.value;
			    }
                            if (onResult) {
                                onResult(value);
                            }
                        }
                    });

                    onCompletion(lastErr);
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
                if (schema.pkey) {
                    total++;
                }
                if (schema.indices) {
                    total += schema.indices.length;
                }
                if (total === 0) {
                    next(null);
                } else {
                    if (schema.pkey) {
                        keys[schema.pkey] = 1;
                        coll.ensureIndex(keys, {unique: true}, indexDone);
                    }
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

