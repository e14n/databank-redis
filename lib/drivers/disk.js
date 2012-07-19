// diskdatabank.js
//
// On-disk implementation of Databank interface
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
    rimraf = require('rimraf'),
    Step = require('step'),
    Databank = databank.Databank,
    DatabankError = databank.DatabankError,
    AlreadyExistsError = databank.AlreadyExistsError,
    NoSuchThingError = databank.NoSuchThingError,
    crypto = require('crypto'),
    fs = require('fs'),
    path = require('path'),
    os = require('os');

var DiskDatabank = function(params) {
    this.mktmp = params.mktmp || false;
    this.dir = params.dir || '/var/lib/diskdatabank/';
    this.mode = params.mode || 0755;
    this.hashDepth = params.hashDepth || 3;
    this.schema = params.schema || {};
};

DiskDatabank.prototype = new Databank();

DiskDatabank.prototype.toFilename = function(type, id) {
    var hash = this.toHash(id);

    return path.join(this.toDirname(type, id), hash + '.json');
};

DiskDatabank.prototype.toHash = function(id) {

    var hash = crypto.createHash('md5'),
        str, data;

    data = "" + id;

    hash.update(data);
    str = hash.digest('base64');

    // Make it a little more FS-safe

    str = str.replace(/\+/g, '-');
    str = str.replace(/\//g, '_');
    str = str.replace(/=/g, '');

    return str;
};

DiskDatabank.prototype.toDirname = function(type, id) {
    var n;
    var dirname = path.join(this.dir, type);
    var hash = this.toHash(id);

    for (n = 0; n < Math.min(this.hashDepth, hash.length); n++) {
        dirname = path.join(dirname, hash.substr(0, n + 1));
    }

    return dirname;
};

DiskDatabank.prototype.connect = function(params, onCompletion) {
    var bank = this;
    if (bank.mktmp) {
        bank.makeTempDir(function(err) {
            bank.ensureDir(bank.dir, onCompletion);
        });
    } else {
        bank.ensureDir(bank.dir, onCompletion);
    }
};

DiskDatabank.prototype.makeTempDir = function(callback) {
    var bank = this,
        tmp = os.tmpDir(),
        tryAgain = function() {
            randomString(16, function(err, rs) {
                var dirname;
                if (err) {
                    callback(err);
                } else {
                    dirname = path.join(tmp, rs);
                    fs.stat(dirname, function(err, stats) {
		        if (err && err.code == 'ENOENT') {
                            bank.dir = dirname;
                            callback(null);
                        } else if (err) {
                            callback(err);
                        } else {
                            // XXX: bounded retries; 10?
                            tryAgain();
                        }
                    });
                }
            });
        },
        randomString = function(bytes, cb) {
            crypto.randomBytes(bytes, function(err, buf) {
                var str;
                if (err) {
                    cb(err, null);
                } else {
                    str = buf.toString("base64");

                    str = str.replace(/\+/g, "-");
                    str = str.replace(/\//g, "_");
                    str = str.replace(/=/g, "");

                    cb(null, str);
                }
            });
        };


    tryAgain();
};

DiskDatabank.prototype.disconnect = function(onCompletion) {
    var bank = this;
    if (bank.mktmp) {
        rimraf(bank.dir, onCompletion);
    } else {
        onCompletion(null);
    }
};

DiskDatabank.prototype.create = function(type, id, value, onCompletion) {
    var dirname = this.toDirname(type, id),
        filename = this.toFilename(type, id);

    this.ensureDir(dirname, function(err) {
	if (err) {
	    onCompletion(err, null);
	} else {
            fs.stat(filename, function(err, stats) {
		if (err && err.code == 'ENOENT') {
                    fs.writeFile(filename, JSON.stringify(value), 'utf8', function(err) {
			if (err) {
                            onCompletion(err, null);
			} else {
                            onCompletion(null, value);
                    }
                    });
		} else {
                    onCompletion(new AlreadyExistsError(type, id), null);
		}
            });
	}
    });
};

DiskDatabank.prototype.update = function(type, id, value, onCompletion) {
    var filename = this.toFilename(type, id);

    fs.stat(filename, function(err, stats) {
        if (err && err.code == 'ENOENT') {
            onCompletion(new NoSuchThingError(type, id), null);
        } else {
            fs.writeFile(filename, JSON.stringify(value), 'utf8', function(err) {
                if (err) {
                    onCompletion(err, null);
                } else {
                    onCompletion(null, value);
                }
            });
        }
    });
};

DiskDatabank.prototype.read = function(type, id, onCompletion) {
    var filename = this.toFilename(type, id);

    fs.stat(filename, function(err, stats) {
        if (err && err.code == 'ENOENT') {
            onCompletion(new NoSuchThingError(type, id), null);
        } else {
            fs.readFile(filename, function(err, data) {
                if (err) {
                    onCompletion(err, null);
                } else {
                    onCompletion(null, JSON.parse(data));
                }
            });
        }
    });
};

DiskDatabank.prototype.del = function(type, id, onCompletion) {
    var filename = this.toFilename(type, id);
    fs.unlink(filename, function(err) {
        if (err) {
            if (err.code == 'ENOENT') {
                onCompletion(new NoSuchThingError(type, id), null);
            } else {
                onCompletion(err, null);
            }
        } else {
            onCompletion(null);
        }
    });
};

DiskDatabank.prototype.ensureDir = function(dir, onCompletion) {

    var lastSlash = dir.lastIndexOf('/'),
        parent = dir.substr(0, lastSlash),
        base = dir.substr(lastSlash + 1),
        bank = this,
        ensureOne = function(dir, onCompletion) {
            fs.stat(dir, function(err, stats) {
                if (err) {
                    if (err.code == 'ENOENT') {
                        fs.mkdir(dir, bank.mode, function(err) {
                            if (err && err.code == 'EEXIST') {
                                onCompletion(null);
                            } else if (err) {
                                onCompletion(err);
                            } else {
                                onCompletion(null);
                            }
                        });
                    } else {
                        onCompletion(err);
                    }
                } else {
                    onCompletion(null);
                }
            });
        };

    if (parent) {
        // recursively ensure parent
        this.ensureDir(parent, function(err) {
            if (err) {
                onCompletion(err);
            } else {
                ensureOne(dir, onCompletion);
            }
        });
    } else {
        ensureOne(dir, onCompletion);
    }
};

DiskDatabank.prototype.search = function(type, criteria, onResult, onCompletion) {
    var bank = this,
	counter = 0,
	walk = function(dirname) { // originally from https://gist.github.com/514983
	    counter += 1;
	    fs.readdir(dirname, function(err, relnames) {
		if(err) {
		    onCompletion(err);
		    return;
		}
		relnames.forEach(function(relname, index, relnames) {
		    var name = path.join(dirname, relname);
		    counter += 1;
		    fs.stat(name, function(err, stat) {
			if(err) {
			    onCompletion(err);
			    return;
			}
			if(stat.isDirectory()) {
			    walk(name);
			} else {
			    fs.readFile(name, function(err, data) {
				var value;
				if (err) {
				    onCompletion(err);
				    return;
				} else {
				    value = JSON.parse(data);
				    if (bank.matchesCriteria(value, criteria)) {
					onResult(value);
				    }
				}
			    });
			}
			counter -= 1;
			if(index === relnames.length - 1) counter -= 1;
			if(counter === 0) {
			    onCompletion(null);
			}
		    });
		});
	    });
	};
    
    walk(path.join(bank.dir, type));
};

exports.DiskDatabank = DiskDatabank;
