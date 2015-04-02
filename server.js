var express    = require('express');        // call express
var app        = express();                 // define our app using express
var bodyParser = require('body-parser');

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
    var data = req.body;
    res.json(JSON.parse(data));
});

router.get('/request', function (req, res) {
    var data = req.query;
    res.json(data);
})

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/cache', router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);
