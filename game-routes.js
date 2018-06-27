var express = require('express');
var debug = require('./debug');

var bodyParser = require('body-parser');

module.exports = function(db) {
	var game = express.Router();

	game.get('/get/question/:teamId', GetQuestion);
	game.get('/get/ranking/:teamId', GetRanking);
	game.get('/get/info/:teamId', GetTeamInfo);
	game.post('/post/answer/:teamId', bodyParser.json(), PostAnswer);
	game.post('/post/name/:teamId', bodyParser.json(), PostTeamName);

	function GetQuestion(req, res, next) {
		var teamId = decodeURIComponent(req.params.teamId);
		debug.log('get question: ' + teamId);
		res.send("done");
	}

	function GetRanking(req, res, next) {
		var teamId = decodeURIComponent(req.params.teamId);
		debug.log('get ranking: ' + teamId);
		res.send("done");
	}

	function GetTeamInfo(req, res, next) {
		var teamId = decodeURIComponent(req.params.teamId);
		debug.log('get info: ' + teamId);
		res.send("done");
	}

	function PostAnswer(req, res, next) {
		var teamId = decodeURIComponent(req.params.teamId);
		var answer = req.body.answer;
		debug.log('post answer: ' + teamId + ', ' + answer);
		res.send("done");
	}

	function PostTeamName(req, res, next) {
		var teamId = decodeURIComponent(req.params.teamId);
		var name = req.body.name;
		debug.log('post name: ' + teamId + ', ' + name);
		res.send("done");
	}

	return game;
}

