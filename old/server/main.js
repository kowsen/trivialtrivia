var r = require('rethinkdb');

var express = require('express');
var app = express();


r.connect({db: 'game'}, function(err, conn) {

	app.use(function(req, res, next) {
		res.header("Access-Control-Allow-Origin", "*");
		res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
		next();
	});

	app.post('/question/create/:question/:answer', function(req, res, next) {
		var question = JSON.parse(decodeURIComponent(req.params.question));
		var answer = decodeURIComponent(req.params.answer);

		r.table('questions').max('id').default({id: 0}).run(conn).then((maxIndex) => {
			r.table('questions').insert({
				id: parseInt(maxIndex.id) + 1,
				payload: question,
				answer: answer
			}).run(conn).then(() => {
				res.send('Complete');
			});
		});
	});

	app.post('/team/name/:id/:name', function(req, res, next) {
		var id = req.params.id;
		var name = decodeURIComponent(req.params.name);

		r.table('teams').filter(r.row('name').eq(name)).isEmpty().run(conn).then((data) => {
			if (data && name != 'ranking') {
				r.table('teams').get(id).update({
					name: name
				}).run(conn).then(() => {
					res.send('SUCCESS');
				});
			} else {
				res.send('DUPLICATE');
			}
		});
	});

	app.post('/team/create/:id', function(req, res, next) {
		r.table('teams').insert({
			id: req.params.id,
			current: 1,
			lastCorrect: new Date()
		}).run(conn).then(() => {
			res.send('Complete');
		});
	});

	app.get('/team/get/name/:id', function(req, res, next) {
		r.table('teams').get(req.params.id).run(conn).then((teamInfo) => {
			res.send(teamInfo);
		}).catch(() => {
			res.send({});
		});
	});

	app.get('/team/valid/:id', function(req, res, next) {
		r.table('teams').get(req.params.id).run(conn).then((team) => {
			if (team == null) {
				res.send('INVALID');
			}
			else if (typeof(team.name) === "undefined" || team.name === null) {
				res.send('UNNAMED');
			}
			else {
				res.send('VALID');
			}
		})
	})

	app.post('/team/destroy/:id', function(req, res, next) {
		r.table('teams').get(req.params.id).delete().run(conn, () => {
			r.table('guesses').filter((guessKey) => {
				return guessKey('id').contains(req.params.id);
			}).delete().run(conn).then(() => {
				res.send('Complete');
			});
		});
	});

	app.post('/question/destroy/:id', function(req, res, next) {
		r.table('questions').get(parseInt(req.params.id)).delete().run(conn, () => {
			r.table('questions').between(parseInt(req.params.id) + 1, r.maxval).orderBy('id').run(conn).then((data) => {
				data.eachAsync(function (row, rowFinished) {
				    r.table('questions').get(row.id).delete().run(conn).then(() => {
				    	row.id -= 1;
				    	r.table('questions').insert(row).run(conn).then(() => { rowFinished(); });
				    });
				}, function (final) {
				    res.send('Complete');
				});
			});
		});
	});

	app.post('/question/update/:id/:newid/:question/:answer', function(req, res, next) {
		var id = parseInt(req.params.id);
		var newId = parseInt(req.params.newid);
		var question = JSON.parse(decodeURIComponent(req.params.question));
		var answer = decodeURIComponent(req.params.answer);

		function finish() {
			r.table('questions').insert({
				id: newId,
				payload: question,
				answer: answer
			}).run(conn).then(() => { res.send('Complete'); });
		}

		r.table('questions').max('id').default({id: 0}).run(conn).then((maxIndex) => {
			if (newId <= maxIndex.id && newId >= 0) {
				r.table('questions').get(id).delete().run(conn).then(() => {
					if (newId > id) {
						r.table('questions').between(id + 1, newId, {rightBound: 'closed'}).orderBy('id').run(conn).then((data) => {
							data.eachAsync(function(row, rowFinished) {
								r.table('questions').get(row.id).delete().run(conn).then(() => {
									row.id -= 1;
									r.table('questions').insert(row).run(conn).then(() => { rowFinished(); });
								});
							}, function(final) {
								finish();
							});
						})
					}
					else if (newId < id) {
						r.table('questions').between(newId, id).orderBy(r.desc('id')).run(conn).then((data) => {
							data.eachAsync(function(row, rowFinished) {
								r.table('questions').get(row.id).delete().run(conn).then(() => {
									row.id += 1;
									r.table('questions').insert(row).run(conn).then(() => { rowFinished(); });
								});
							}, function(final) {
								finish();
							});
						})
					}
					else {
						finish();
					}
				});
			}
			else {
				res.send('Invalid id');
			}
		});
	});

	app.get('/team/list', function(req, res, next) {
		r.table('teams').filter((data) => {
			return data.hasFields('name');
		}).orderBy(r.desc('current')).run(conn).then((data) => {
			data.sort((a, b) => {
				if (a.current === b.current && typeof(a.lastCorrect) !== "undefined" && a.lastCorrect !== null) {
					return new Date(a.lastCorrect) - new Date(b.lastCorrect);
				}
				return b.current - a.current;
			});
			for (var i = 0; i < data.length; i++) {
				delete data[i].id;
				delete data[i].current;
				delete data[i].lastCorrect;
			}
			res.send(data);
		});
	});

	app.get('/debug/team/list', function(req, res, next) {
		r.table('teams').orderBy('id').run(conn).then((data) => {
			res.send(data);
		});
	});

	app.get('/guesses/:team', function(req, res, next) {
		r.table('guesses').filter((guessKey) => {
			return guessKey('id').contains(req.params.team);
		}).run(conn).then((data) => {
			data.toArray().then((arr) => {
				res.send(arr);
			});
		});
	});

	app.get('/question/list', function(req, res, next) {
		r.table('questions').orderBy('id').run(conn).then((data) => {
			res.send(data);
		});
	});

	app.get('/question/get/:team', function(req, res, next) {
		GetTeamQuestion(conn, req.params.team).then((question) => {
			res.send(question);
		});
	});

	app.post('/question/answer/:team/:answer', function(req, res, next) {
		var input = decodeURIComponent(req.params.answer);
		return GetTeam(conn, req.params.team).then((team) => {
			return GetQuestion(conn, team.current).then((question) => {
				if (question == null) {
					res.send(false);
				} else {
					// add guess
					var guessKey = [team.id, team.current];
					r.table('guesses').get(guessKey).default({id: guessKey, guesses: []}).run(conn).then((guessData) => {
						guessData.guesses.push(input);
						r.table('guesses').get(guessKey).replace(guessData).run(conn).then(() => {
							var isCorrect = MatchAnswer(question.answer, input);
							if (isCorrect) {
								UpdateCurrent(conn, req.params.team, team.current + 1).then(() => {
									res.send(isCorrect);
								});
							} else {
								res.send(isCorrect);
							}
						});
					});				
				}
			});
		});
	});

	app.listen(3001);
});

function GetAllQuestions(conn) {
	return r.table('questions').orderBy('id').run(conn);
}

function GetQuestion(conn, id) {
	return r.table('questions').get(id).run(conn).then((res) => {
		return res;
	});
}

function GetAllTeams(conn) {
	return r.table('teams').orderBy('id').run(conn);
}

function GetTeam(conn, id) {
	return r.table('teams').get(id).run(conn);
}

function GetTeamQuestion(conn, id) {
	return GetTeam(conn, id).then((team) => {
		return GetQuestion(conn, team.current).then((question) => {
			delete question.answer;
			var guessKey = [team.id, team.current];
			return r.table('guesses').get(guessKey).default({id: guessKey, guesses: []}).run(conn).then((guessData) => {
				var guesses = guessData.guesses;
				if (guesses.length > 5) {
					guesses = guesses.slice(guesses.length - 5, guesses.length);
				}
				question.guesses = guesses;
				return question;
			});
		}).catch(() => {
			return {
				id: id,
				payload: {
					type: 'text',
					text: 'OUT OF QUESTIONS'
				},
				guesses: []
			}
		});
	});
}

function GetTeamAnswer(conn, id) {
	return GetTeam(conn, id).then((team) => {
		return GetQuestion(conn, team.current).then((question) => {
			return question.answer;
		});
	});
}

function CheckTeamAnswer(conn, id, input) {
	return GetTeamAnswer(conn, id).then((answer) => {
		return MatchAnswer(answer, input);
	});
}

function MatchAnswer(answers, input) {
	return StripString(input) == StripString(answers);
}

function StripString(str) {
	return str.replace(/[^A-Za-z0-9\s!?]/g,'').split(' ').join('').toLowerCase();
}

function UpdateCurrent(conn, id, current) {
	return r.table('teams').get(id).update({current: current, lastCorrect: new Date()}).run(conn);
}

function UpdateGuesses(conn, id, guesses) {
	return r.table('teams').get(id).update({guesses: guesses}).run(conn);
}
