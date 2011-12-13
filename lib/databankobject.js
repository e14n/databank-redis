// databankobject.js
//
// abstraction for CRUD'ing an object as JSON to a Databank
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

var Databank = require('./databank').Databank;

var DatabankObject = function(properties) {
    DatabankObject.init(this, properties);
};

DatabankObject.init = function(obj, properties) {
    DatabankObject.copy(obj, properties);
};

DatabankObject.copy = function(obj, properties) {
    var property;
    for (property in properties) {
        obj[property] = properties[property];
    }
};

DatabankObject.driver = null;
DatabankObject.params = {};
DatabankObject.bank = null;

DatabankObject.subClass = function(type, Parent) {

    var Cls;

    if (!Parent) {
        Parent = DatabankObject;
    }

    Cls = function(properties) {
        Cls.init(this, properties);
    };

    Cls.init = function(inst, properties) {
	Parent.init(inst, properties);
    };

    Cls.parent = Parent;

    Cls.bank = function() {
        return DatabankObject.bank;
    };

    Cls.type = type;

    Cls.get = function(id, callback) {
        Cls.bank().read(Cls.type, id, function(err, value) {
            if (err) {
                callback(err, null);
            } else {
                callback(null, new Cls(value));
            }
        });
    };

    Cls.search = function(criteria, callback) {
        var results = [];

        Cls.bank().search(Cls.type,
                          criteria, 
                          function(value) {
                              results.push(new Cls(value));
                          },
                          function(err) {
                              if (err) {
                                  callback(err, null);
                              } else {
                                  callback(null, results);
                              }
                          });
    };

    Cls.pkey = function() {
        var bank = Cls.bank();
        if (bank && bank.schema && bank.schema[Cls.type]) {
            return bank.schema[Cls.type].pkey;
        } else {
            return 'id';
        }
    };

    Cls.create = function(props, callback) {
        Cls.bank().create(Cls.type, props[Cls.pkey()], props, function(err, value) {
            if (err) {
                callback(err, null);
            } else {
                callback(null, new Cls(value));
            }
        });
    };

    Cls.prototype = new Parent({
        update: function(props, callback) {
            var inst = this;
            DatabankObject.copy(this, props);
            Cls.bank().update(Cls.type, this[Cls.pkey()], this, function(err, value) {
                if (err) {
                    callback(err, null);
                } else {
                    DatabankObject.copy(inst, value); // may be updated
                    callback(null, inst);
                }
            });
        },
        del: function(callback) {
            Cls.bank().del(Cls.type, this[Cls.pkey()], callback);
        },
        save: function(callback) {
            var inst = this;
            Cls.bank().save(Cls.type, inst[Cls.pkey()], inst, function(err, value) {
                if (err) {
                    callback(err, null);
                } else {
                    DatabankObject.copy(inst, value); // may be updated
                    callback(null, inst);
                }
            });
        }
    });

    return Cls;
};

exports.DatabankObject = DatabankObject;
