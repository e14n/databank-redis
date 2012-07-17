exports.driverParams = {
    'memory': {
    },
    'disk': {
        mktmp: true
    },
    'redis': {
    },
    'membase': {
        serverLocations: '127.0.0.1:11211',
        options: {}
    },
    'mongo': {
        host: 'localhost',
        port: 27017,
        dbname: 'databanktest'
    },
    'caching': {
	'cache': {driver: 'memory', params: {}},
	'source': {driver: 'disk', params: {mktmp: true}}
    }
};
