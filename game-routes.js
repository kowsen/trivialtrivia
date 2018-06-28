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
		db.GetTeamQuestionGame(teamId).then((question) => {
			res.send(question);
		});
	}

	function GetRanking(req, res, next) {
		var teamId = decodeURIComponent(req.params.teamId);
		debug.log('get ranking: ' + teamId);
		db.GetRanking(teamId).then((ranking) => {
			res.send(ranking);
		});
	}

	function GetTeamInfo(req, res, next) {
		var teamId = decodeURIComponent(req.params.teamId);
		debug.log('get info: ' + teamId);
		db.GetTeam(teamId).then((team) => {
			res.send(team);
		});
	}

	function PostAnswer(req, res, next) {
		var teamId = decodeURIComponent(req.params.teamId);
		var answer = req.body.answer;
		debug.log('post answer: ' + teamId + ', ' + answer);
		db.SubmitAnswer(teamId, answer).then((isCorrect) => {
			res.send(isCorrect);
		});
	}

	function PostTeamName(req, res, next) {
		var teamId = decodeURIComponent(req.params.teamId);
		var name = req.body.name;
		debug.log('post name: ' + teamId + ', ' + name);
		db.SubmitName(teamId, name).then((isNameSuccess) => {
			res.send(isNameSuccess);
		});
	}

	return game;
}

