var express = require('express'),
    app = express(),
    compress = require('compression'),
    bodyParser = require('body-parser'),
    redisHelper = require('./helpers/redis'),
    requestHelper = require('./helpers/request'),
    colors = require('colors');

var redisClient = redisHelper.getClient('redis://redistogo:3b3bd4d79bc23c76fb5b3f180f7681ae@soapfish.redistogo.com:9335/');
//var redisClient = redis.createClient();

app.use(bodyParser.json());
app.use(compress());

var port = process.env.PORT || 3131;

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();

router.get('/ping', function (req, res) {
    'use strict';

    res.json({
        message: 'hooray! welcome to lastminute.com\'s acidseed!'
    });
});

router.get('/', requestHelper.handle.bind(this, redisClient));

router.post('/', requestHelper.handle.bind(this, redisClient));

// REGISTER OUR ROUTES -------------------------------
// All of our routes will be prefixed with /cache
app.use('/cache', router);

// START THE SERVER
// =============================================================================
app.listen(port, function () {
    'use strict';

    console.log(('acidseed: Magic happens on port ' + port).green);
});
