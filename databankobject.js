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
        Parent.init(this, properties);
    };

    Cls.parent = Parent;

    Cls.bank = function() {
        return Parent.bank;
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

    Cls.prototype = new Parent({
        del: function(callback) {
            Cls.bank().del(Cls.type, this[Cls.pkey()], callback);
        },
        save: function(callback) {
            Cls.bank().save(Cls.type, this[Cls.pkey()], this, callback);
        }
    });

    return Cls;
};

exports.DatabankObject = DatabankObject;
