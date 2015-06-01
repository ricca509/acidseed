var _ = require('underscore'),
    url = require('url'),
    http = require('http'),
    redisHelper = require('./redis');

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

/**
 * Handles the cache request
 * @param {http.IncomingMessage}  req The node request
 * @param {http.ServerResponse}   res The node response
 */
var handleRequest = function (redisClient, req, res) {
    'use strict';
    var noCache = _.isBoolean(req.query.noCache) ? req.query.noCache : req.query.noCache === 'true',
        key = redisHelper.generateKey(req);

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
                redisHelper.store(redisClient, key, JSON.stringify(parsedApiResp));
            }, function onError (e) {
                console.log(('Problem with request: ' + e.message).red);
            });

        } else {
            console.log(('Response from Redis for ' + key).green);
            parsedApiResp = JSON.parse(redisData);

            res.json(parsedApiResp);

            parsedApiResp.cache.hits++;
            console.log('Saving updated key to Redis'.green);
            redisHelper.store(redisClient, key, JSON.stringify(parsedApiResp));
        }
    });
};

module.exports = {
    handle: handleRequest
};
