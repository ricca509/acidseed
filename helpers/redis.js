var redis = require('redis'),
    sha256 = require('sha256');

var TTL = 24 * 60 * 60 * 1000;

var getClient = (redisUrl) => {
    var rtg = require('url').parse(redisUrl);
    var redisClient = redis.createClient(rtg.port, rtg.hostname);

    if(rtg.auth) {
        redisClient.auth(rtg.auth.split(':')[1]);
    }

    return redisClient;
};

/**
 * Generates a unique key for Redis
 * @param {http.IncomingMessage} request The original request
 */
var generateKey = (request) => {
    'use strict';
    var cacheKeyPrefix = 'cache.';

    var hashValue = request.method === 'POST' ?
        JSON.stringify(request.body) :
        JSON.stringify(request.query.apiUrl);

    return [cacheKeyPrefix, sha256(hashValue)].join('');
};

/**
 * Helper method to store the response in Redis
 * @param {} 				redisClient The Redis client instance
 * @param {String}  key         The redis key
 * @param {String}  val         The API response stringified
 * @param {Number}  ttl         The TTL for the KEY
 */
var storeInRedis = (redisClient, key, val) => {
    'use strict';

    return redisClient.setex(key, TTL, val, redis.print);
};


module.exports = {
    getClient: getClient,
    generateKey: generateKey,
    store: storeInRedis
};
