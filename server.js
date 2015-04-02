var express     = require('express'),
    app           = express(),
    bodyParser    = require('body-parser'),
    redis         = require("redis"),
    sha256        = require('sha256'),
    http          = require('http');


// var rtg   = require("url").parse('redis://redistogo:3b3bd4d79bc23c76fb5b3f180f7681ae@soapfish.redistogo.com:9335/');
// var redisClient = redis.createClient(rtg.port, rtg.hostname);
//
// redisClient.auth(rtg.auth.split(":")[1]);
var redisClient = redis.createClient();

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.text());
app.use(bodyParser.json());

var port = process.env.PORT || 3131;        // set our port

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();              // get an instance of the express Router

router.get('/ping', function (req, res) {
    res.json({ message: 'hooray! welcome to lastminute.com\'s acidseed!' });
});

router.post('/request', function (req, res) {
    //res.json(JSON.parse(data));
    // Get the request body
    var body = req.body,
        cacheKeyPrefix = 'cache.';
    // Create a string representation of the body
    var key = [cacheKeyPrefix, sha256(body)].join('');
    // Check the redis server for the key
    redisClient.get(key, function(err, reply) {
        // If it exists
        if (!reply) {
          console.log('No Redis cache for', key);
          // - Forward the post request to the endpoint passed in the querystring
          // - Save the data to redis using the generated key
          // - Return the data back
          var url = req.query.requestedUrl.match(/http:\/\/([^\/]+)(.*)/);

          var options = {
              hostname: url[1],
              path: url[2],
              port: 80,
              method: 'POST',
              headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36',
                  'Content-Type': 'application/json'
              }
          };

          var request = http.request(options, function (response) {
            var data = '';
            console.log('STATUS: ' + response.statusCode);

            response.setEncoding('utf8');
            var apiResp = '';
            response.on('data', function(d) {
              apiResp += d;
            });

            response.on('end', function() {
                var parsedApiResp = JSON.parse(apiResp);

                redisClient.set(key, apiResp, redis.print);
                console.log('Response from API');
                res.json(parsedApiResp);
            });
          });

          request.on('error', function(e) {
            console.log('problem with request: ' + e.message);
          });

          // write data to request body
          request.write(body);
          request.end();
        } else {
            console.log('Response from Redis for', key);
            res.json(JSON.parse(reply));
        }
    });

});

router.get('/request', function (req, res) {
    var data = req.query;
    var key = 'cache.' + data.requestedUrl
    redisClient.set(key, 'something', redis.print);
    res.json(data);
})

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/cache', router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);
