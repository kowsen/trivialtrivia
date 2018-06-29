var r = require('rethinkdb');

var express = require('express');

var app = express();

app.use(function(req, res, next) {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
	next();
});

r.connect({db: 'game'}, function(err, conn) {
	var db = require('./rethink')(r, conn);
	app.use('/game', require('./game-routes')(db));
	app.use('/admin', require('./admin-routes')(db));

	app.listen(3000);

	console.log('Server Running');
});