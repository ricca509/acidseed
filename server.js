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

var handleRequest = function (req, res) {
    'use strict';
	// Create a string representation of the request for the key
	var key = getKey(req);

	// Check the redis server for the key
	redisClient.get(key, function (err, reply) {
		// If it exists
		if (!reply) {
			console.log(('No Redis cache for ' + key).red);

			proxyRequest(null, req, function onData(data) {
				var parsedApiResp = JSON.parse(data);

				// Save the data to redis using the generated key
				console.log('Saving to Redis'.green);
				redisClient.set(key, data, redis.print);

				// Return the data back
				res.json(parsedApiResp);
			}, function onError() {
				console.log(('problem with request: ' + e.message).red);
			});

		} else {
			console.log('Response from Redis for', key);
			res.json(JSON.parse(reply));
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
 *
 */
var getKey = function (request) {
	var key, hashValue,
		cacheKeyPrefix = 'cache.';

    hashValue = JSON.stringify(request.query.requestedUrl);

    if (request.method === 'POST') {
        hashValue = JSON.stringify(request.body);
    }

	return [cacheKeyPrefix, sha256(hashValue)].join('');
};

/**
 *
 */
var proxyRequest = function (options, originalReq, onData, onError) {
    'use strict';
    console.log('Damn! Calling the API'.green);

    var apiUrl = url.parse(decodeURI(originalReq.query.requestedUrl));

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
		response.on('data', function(data) {
			apiResp += data;
		});

		response.on('end', function() {
			onData(apiResp);
		});
	});

	request.on('error', onError);

	if (originalReq.body) {
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
app.listen(port);
console.log(('acidseed: Magic happens on port ' + port).green);
