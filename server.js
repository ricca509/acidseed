var express = require('express'),
	app = express(),
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

// Parses body as JSON
app.use(bodyParser.json());

var port = process.env.PORT || 3131;
console.log('port:', port);
/**
 * Handles the cache request
 * @param {http.IncomingMessage}  req The node request
 * @param {http.ServerResponse}   res The node response
 */
var handleRequest = function (req, res) {
  'use strict';
	// Create a string representation of the request for the key
	var noCache = req.query.noCache,
      key = generateKey(req);

	// Check the redis server for the key
	redisClient.get(key, function (err, redisData) {
		if (!redisData || noCache === true) {
			console.log(('No Redis cache for ' + key).yellow);

			proxyRequest(null, req, function onData (data) {
				var parsedApiResp = JSON.parse(data);

				// Save the data to redis using the generated key
				console.log('Saving to Redis'.green);
				redisClient.set(key, data, redis.print);

				// Return the data back
				res.json(parsedApiResp);
			}, function onError () {
				console.log(('problem with request: ' + e.message).red);
			});

		} else {
			console.log(('Response from Redis for ' + key).green);
			res.json(JSON.parse(redisData));
		}
	});
};

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();

router.get('/ping', function (req, res) {
	res.json({
		message: 'hooray! welcome to lastminute.com\'s acidseed!'
	});
});

router.get('/request', handleRequest);

router.post('/request', handleRequest);

// TEMP HELPERS

/**
 * Generates a unique key for Redis
 * @param {http.IncomingMessage} request The original request
 */
var generateKey = function (request) {
	var key, hashValue,
		cacheKeyPrefix = 'cache.';

    hashValue = JSON.stringify(request.query.apiUrl);

    if (request.method === 'POST') {
        hashValue = JSON.stringify(request.body);
    }

	return [cacheKeyPrefix, sha256(hashValue)].join('');
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
// All of our routes will be prefixed with /api
app.use('/cache', router);

// START THE SERVER
// =============================================================================
app.listen(port, function () {
  console.log(('acidseed: Magic happens on port ' + port).green);
});
