var express = require('express'),
    app = express(),
    compress = require('compression'),
    bodyParser = require('body-parser'),
    redis = require('redis'),
    sha256 = require('sha256'),
    colors = require('colors'),
    _ = require('underscore'),
    url = require('url'),
    http = require('http');

var rtg = require('url').parse('redis://redistogo:3b3bd4d79bc23c76fb5b3f180f7681ae@soapfish.redistogo.com:9335/');
var redisClient = redis.createClient(rtg.port, rtg.hostname);
redisClient.auth(rtg.auth.split(':')[1]);

//var redisClient = redis.createClient();

app.use(bodyParser.json());
app.use(compress());

var port = process.env.PORT || 3131,
    TTL = 24 * 60 * 60 * 1000;

/**
 * Handles the cache request
 * @param {http.IncomingMessage}  req The node request
 * @param {http.ServerResponse}   res The node response
 */
var handleRequest = function (req, res) {
    'use strict';
    var noCache = _.isBoolean(req.query.noCache) ? req.query.noCache : req.query.noCache === 'true',
        key = generateKey(req);

    // Check the redis server for the key
    redisClient.get(key, function (err, redisData) {
        var parsedApiResp;

        if (!redisData || noCache) {
            console.log(('No Redis cache for ' + key).yellow);

            proxyRequest(null, req, function onData (data) {
                parsedApiResp = JSON.parse(data);

                // Return the data back
                res.json(parsedApiResp);

                _.extend(parsedApiResp, {
                    cache: {
                        date: new Date().toISOString(),
                        hits: 0
                    }
                });

                console.log('Saving to Redis'.green);
                storeInRedis(redisClient, key, JSON.stringify(parsedApiResp), TTL);
            }, function onError (e) {
                console.log(('problem with request: ' + e.message).red);
            });

        } else {
            console.log(('Response from Redis for ' + key).green);
            parsedApiResp = JSON.parse(redisData);

            res.json(parsedApiResp);

            parsedApiResp.cache.hits++;
            console.log('Saving to Redis'.green);
            storeInRedis(redisClient, key, JSON.stringify(parsedApiResp), TTL);
        }
    });
};

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();

router.get('/ping', function (req, res) {
    'use strict';

    res.json({
        message: 'hooray! welcome to lastminute.com\'s acidseed!'
    });
});

router.get('/', handleRequest);

router.post('/', handleRequest);

// TEMP HELPERS

/**
 * Generates a unique key for Redis
 * @param {http.IncomingMessage} request The original request
 */
var generateKey = function (request) {
    'use strict';

    var hashValue,
        cacheKeyPrefix = 'cache.';

    hashValue = JSON.stringify(request.query.apiUrl);

    if (request.method === 'POST') {
        hashValue = JSON.stringify(request.body);
    }

    return [cacheKeyPrefix, sha256(hashValue)].join('');
};

/**
 * Helper method to store the response in Redis
 * @param {} 				redisClient The Redis client instance
 * @param {String}  key         The redis key
 * @param {String}  val         The API response stringified
 * @param {Number}  ttl         The TTL for the KEY
 */
var storeInRedis = function (redisClient, key, val, ttl) {
    'use strict';

    return redisClient.setex(key, TTL, val, redis.print);
};

/**
 * Proxies the request to the original API
 * @param {Object} options        Options to pass to the http.request
 * @param {http.IncomingMessage} originalReq    The original request object
 * @param {Function} onData       Callback to call when data is coming back from the API
 * @param {Function} onError      Callback to call in case of any error
 */
var proxyRequest = function (options, originalReq, onData, onError) {
    'use strict';
    console.log('Damn! Calling the API'.yellow);

    var apiUrl = url.parse(decodeURI(originalReq.query.apiUrl));

    var defOptions = {
        hostname: apiUrl.hostname,
        path: apiUrl.path,
        port: apiUrl.port,
        method: originalReq.method,
        headers: _.pick(originalReq.headers, 'user-agent', 'content-type')
    };

    _.extend(defOptions, options);

    // Forward the request to the endpoint passed in the querystring
    var request = http.request(defOptions, function (response) {
        var apiResp = '';
        console.log('STATUS: ' + response.statusCode);

        response.setEncoding('utf8');
        response.on('data', function (data) {
            apiResp += data;
        });

        response.on('end', function () {
            onData(apiResp);
        });
    });

    request.on('error', onError);

    if (originalReq.method === 'POST') {
        // write data to request body
        request.write(JSON.stringify(originalReq.body));
    }

    request.end();
};

// REGISTER OUR ROUTES -------------------------------
// All of our routes will be prefixed with /cache
app.use('/cache', router);

// START THE SERVER
// =============================================================================
app.listen(port, function () {
    'use strict';

    console.log(('acidseed: Magic happens on port ' + port).green);
});
