var express = require('express'),
    app = express(),
    compress = require('compression'),
    bodyParser = require('body-parser'),
    redisHelper = require('./helpers/redis'),
    requestHelper = require('./helpers/request');

require('colors');

app.use(bodyParser.json());
app.use(compress());

var port = process.env.PORT || 8181;
var redisClient = redisHelper.getClient(process.env.REDIS_URL || 'redis://localhost:6379');

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();

router.get('/ping', (req, res) => {
    'use strict';

    res.json({
        message: 'hooray! welcome to acidseed!'
    });
});

router.get('/', requestHelper.handle.bind(this, redisClient));

router.post('/', requestHelper.handle.bind(this, redisClient));

// START THE SERVER
// =============================================================================
app.listen(port, () => {
    'use strict';

    console.log(('acidseed: magic is happening on port ' + port).green);
    console.log(('Connected to redis: ' + redisClient.address).green);
});
