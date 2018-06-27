var express = require('express');
var btoa = require('btoa');
var debug = require('./debug');

var bodyParser = require('body-parser');

var pass = btoa('testpass');

module.exports = function(db) {
	var admin = express.Router();

	function Auth(req, res, next) {
		if (req.method !== 'OPTIONS' && req.get('authorization') !== pass) {
			debug.log('auth fail');
			res.status(401).send('Authentication required.');
			return;
		}
		next();
	}

	admin.use(Auth);

	admin.post('/question/create', bodyParser.json(), CreateQuestion);
	admin.post('/question/destroy/:questionIndex', DestroyQuestion);
	admin.get('/question/list', ListQuestions);
	admin.post('/question/move/:questionIndex', bodyParser.json(), MoveQuestion);
	admin.post('/question/update/:questionIndex', bodyParser.json(), UpdateQuestion);

	admin.post('/team/create', CreateTeam);
	admin.post('/team/destroy/:teamId', DestroyTeam);
	admin.get('/team/list', ListTeams);
	admin.get('/team/guesses/:teamId', GetGuesses);

	function CreateQuestion(req, res, next) {
		var payload = req.body.payload;
		var answer = req.body.answer;
		debug.log('create question: ' + payload + ', ' + answer);
		res.send("done");
	}

	function DestroyQuestion(req, res, next) {
		var questionIndex = parseInt(req.params.questionIndex);
		debug.log('destroy question: ' + questionIndex);
		res.send("done");
	}

	function ListQuestions(req, res, next) {
		debug.log('list questions');
		res.send("done");
	}

	function MoveQuestion(req, res, next) {
		var questionIndex = parseInt(req.params.questionIndex);
		var newIndex = req.body.index;
		debug.log('move question: ' + questionIndex + ', ' + JSON.stringify(newIndex));
		res.send("done");
	}

	function UpdateQuestion(req, res, next) {
		var questionIndex = parseInt(req.params.questionIndex);
		var payload = req.body.payload;
		var answer = req.body.answer;
		debug.log('update question: ' + questionIndex + ', ' + payload + ', ' + answer);
		res.send("done");
	}

	function CreateTeam(req, res, next) {
		debug.log('create team')
		res.send("done");
	}

	function DestroyTeam(req, res, next) {
		var teamId = decodeURIComponent(req.params.teamId);
		debug.log('destroy team: ' + teamId)
		res.send("done");
	}

	function ListTeams(req, res, next) {
		debug.log('list teams');
		res.send("done");
	}

	function GetGuesses(req, res, next) {
		var teamId = decodeURIComponent(req.params.teamId);
		debug.log('get guesses: ' + teamId);
		res.send("done");
	}

	return admin;
}