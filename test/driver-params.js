exports.driverParams = {
    'mongo': {
        host: 'localhost',
        port: 27017,
        dbname: 'test'
    },
    'redis': {
    },
    'disk': {
        dir: '/tmp/diskdatabank/'
    },
    'membase': {
        serverLocations: '127.0.0.1:11211',
        options: {}
    }
};
