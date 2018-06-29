var express = require('express');
var btoa = require('btoa');
var debug = require('./debug');

var bodyParser = require('body-parser');

var pass = btoa('testpass');

var possible = "abcdefghijklmnprsuvwxyz23456789";
function GenerateTeamId(len) {
	var str = '';
	for (var i = 0; i < len; i++) {
		str += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return str;
}

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

	admin.get('/authcheck', AuthCheck);

	admin.post('/question/create', bodyParser.json(), CreateQuestion);
	admin.post('/question/destroy/:questionIndex', DestroyQuestion);
	admin.get('/question/list', ListQuestions);
	admin.post('/question/move/:questionIndex', bodyParser.json(), MoveQuestion);
	admin.post('/question/update/:questionIndex', bodyParser.json(), UpdateQuestion);

	admin.post('/team/create', CreateTeam);
	admin.post('/team/destroy/:teamId', DestroyTeam);
	admin.get('/team/list', ListTeams);
	admin.get('/team/guesses/:teamId', GetGuesses);

	function AuthCheck(req, res, next) {
		res.send({success: true});
	}

	function CreateQuestion(req, res, next) {
		var payload = req.body.payload;
		var answer = req.body.answer;
		debug.log('create question: ' + payload + ', ' + answer);
		db.CreateQuestion(payload, answer).then(() => {
			res.send('done');
		});
	}

	function DestroyQuestion(req, res, next) {
		var questionIndex = parseInt(req.params.questionIndex);
		debug.log('destroy question: ' + questionIndex);
		db.DestroyQuestionAndFixOrder(questionIndex).then((didDelete) => {
			res.send(didDelete);
		});
	}

	function ListQuestions(req, res, next) {
		debug.log('list questions');
		db.GetQuestions().then((questions) => {
			res.send(questions);
		});
	}

	function MoveQuestion(req, res, next) {
		var questionIndex = parseInt(req.params.questionIndex);
		var newIndex = req.body.index;
		debug.log('move question: ' + questionIndex + ', ' + JSON.stringify(newIndex));
		db.MoveQuestion(questionIndex, newIndex).then((didMove) => {
			res.send(didMove);
		});
	}

	function UpdateQuestion(req, res, next) {
		var questionIndex = parseInt(req.params.questionIndex);
		var payload = req.body.payload;
		var answer = req.body.answer;
		debug.log('update question: ' + questionIndex + ', ' + JSON.stringify(payload) + ', ' + answer);
		db.UpdateQuestion(questionIndex, payload, answer).then((didUpdate) => {
			res.send(didUpdate);
		});
	}

	function CreateTeam(req, res, next) {
		debug.log('create team')
		db.CreateTeam(GenerateTeamId(5)).then((didCreate) => {
			res.send(didCreate);
		});
	}

	function DestroyTeam(req, res, next) {
		var teamId = decodeURIComponent(req.params.teamId);
		debug.log('destroy team: ' + teamId)
		db.DestroyTeam(teamId).then((didDestroy) => {
			res.send(didDestroy);
		});
	}

	function ListTeams(req, res, next) {
		debug.log('list teams');
		db.GetTeams().then((teams) => {
			res.send(teams);
		});
	}

	function GetGuesses(req, res, next) {
		var teamId = decodeURIComponent(req.params.teamId);
		debug.log('get guesses: ' + teamId);
		db.GetGuesses(teamId).then((guesses) => {
			res.send(guesses);
		});
	}

	return admin;
}