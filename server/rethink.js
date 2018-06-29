var DEFAULT_GUESSES = { guesses: [] };
var MAX_GUESSES = 5;
var DEFAULT_QUESTION = {
	id: 0,
	payload: {
		type: 'text',
		text: 'OUT OF QUESTIONS'
	},
	guesses: []
};

function RankCompare(a, b) {
	if (a.current === b.current && typeof(a.lastCorrect) !== "undefined" && a.lastCorrect !== null) {
		return new Date(a.lastCorrect) - new Date(b.lastCorrect);
	}
	return b.current - a.current;
}

function MatchAnswer(answers, input) {
	return StripString(input) == StripString(answers);
}

function StripString(str) {
	return str.replace(/[^A-Za-z0-9\s!?]/g,'').split(' ').join('').toLowerCase();
}

function IsValidName(name) {
	return name !== 'ranking';
}

module.exports = function(r, conn) {

	function GetTeamQuestionGame(teamId) {
		return GetTeamQuestion(teamId).then((question) => {
			return GetGuessesForQuestion(teamId, question.id, MAX_GUESSES).then((guesses) => {
				delete question.answer;
				question.guesses = guesses;
				return question;
			});
		}).catch(() => {
			return DEFAULT_QUESTION;
		});
	}

	function GetRanking(teamId) {
		return GetNamedTeams().then((teams) => {
			teams.sort(RankCompare);
			for (var i = 0; i < teams.length; i++) {
				teams[i].isYou = teams[i].id === teamId;
				delete teams[i].id;
				delete teams[i].current;
				delete teams[i].lastCorrect;
			}
			return teams;
		})
	}

	function GetTeam(teamId) {
		return r.table('teams').get(teamId).run(conn);
	}

	function SubmitAnswer(teamId, answer) {
		return GetTeamQuestion(teamId).then((question) => {
			if (!question) {
				return false;
			}
			return InsertGuess(teamId, question.id, answer).then(() => {
				var isCorrect = MatchAnswer(question.answer, answer);
				if (isCorrect) {
					return UpdateCurrent(teamId, question.id + 1).then(() => {
						return true;
					});
				} else {
					return false;
				}
			});
		});
	}

	function SubmitName(teamId, name) {
		return IsNameUnique(name).then((isUnique) => {
			if (isUnique && IsValidName(name)) {
				return UpdateName(teamId, name).then(() => {
					return true;
				});
			} else {
				return false;
			}
		});
	}

	// -----------------------

	function CreateQuestion(payload, answer) {
		return GetMaxQuestionId().then((maxIndex) => {
			return InsertQuestion(maxIndex + 1, payload, answer);
		});
	}

	function DestroyQuestionAndFixOrder(questionIndex) {
		return CheckQuestionIndex(questionIndex).then((isValidIndex) => {
			if (!isValidIndex) {
				return false;
			}
			return DeleteQuestion(questionIndex).then(() => {
				return ShiftQuestionsBack(questionIndex + 1, r.maxval).then(() => {
					return true;
				});
			});
		})
	}

	function GetQuestions() {
		return r.table('questions').orderBy('id').run(conn);
	}

	function MoveQuestion(oldIndex, newIndex) {
		return CheckQuestionIndex([oldIndex, newIndex]).then((isValidIndex) => {
			if (!isValidIndex) {
				return false;
			}
			return GetQuestion(oldIndex).then((question) => {
				return DestroyQuestionAndFixOrder(oldIndex).then(() => {
					return ShiftQuestionsForward(newIndex, r.maxval).then(() => {
						return InsertQuestion(newIndex, question.payload, question.answer);
					}).then(() => {
						return true;
					});
				});
			});
		});
	}

	function UpdateQuestion(questionIndex, payload, answer) {
		return CheckQuestionIndex(questionIndex).then((isValidIndex) => {
			if (!isValidIndex) {
				return false;
			}
			return r.table('questions').get(questionIndex).update({
				payload: payload,
				answer: answer
			}).run(conn).then(() => {
				return true;
			});
		});
	}

	function CreateTeam(teamId) {
		return r.table('teams').get(teamId).run(conn).then((team) => {
			if (team) {
				return false;
			} else {
				return r.table('teams').insert({
					id: teamId,
					current: 1,
					lastCorrect: new Date()
				}).run(conn).then(() => {
					return true;
				});
			}
		})

	}

	function DestroyTeam(teamId) {
		return r.table('teams').get(teamId).delete({returnChanges: true}).run(conn).then((team) => {
			return r.table('guesses').filter((guessKey) => {
				return guessKey('id').contains(teamId);
			}).delete().run(conn).then((changes) => {
				return changes != null;
			});
		});
	}

	function GetTeams() {
		return r.table('teams').orderBy('id').run(conn);
	}

	function GetGuesses(teamId) {
		return r.table('guesses').filter((guessKey) => {
			return guessKey('id').contains(teamId);
		}).run(conn).then((data) => {
			return data.toArray();
		});
	}

	// -----------------------


	function CheckQuestionIndex(questionIndex) {
		return GetMaxQuestionId().then((maxIndex) => {
			if (typeof(questionIndex) === 'number') {
				return questionIndex > 0 && questionIndex <= maxIndex;
			} else if (typeof(questionIndex) === 'object') {
				for (var i = 0; i < questionIndex.length; i++) {
					if (questionIndex[i] < 1 || questionIndex[i] > maxIndex) {
						return false;
					}
				}
				return true;
			} else {
				return false;
			}
		});
	}

	function DeleteQuestion(questionIndex) {
		return r.table('questions').get(questionIndex).delete().run(conn);
	}

	function ShiftQuestionsBack(startIndex, endIndex) {
		return r.table('questions').between(startIndex, endIndex).orderBy('id').run(conn).then((data) => {
			return data.eachAsync(function (row, rowFinished) {
			    DeleteQuestion(row.id).then(() => {
			    	InsertQuestion(row.id - 1, row.payload, row.answer).then(() => { rowFinished(); });
			    });
			});
		});
	}

	function ShiftQuestionsForward(startIndex, endIndex) {
		return r.table('questions').between(startIndex, endIndex).orderBy(r.desc('id')).run(conn).then((data) => {
			return data.eachAsync(function(row, rowFinished) {
				DeleteQuestion(row.id).then(() => {
					InsertQuestion(row.id + 1, row.payload, row.answer).then(() => { rowFinished(); });
				})
			})
		});
	}

	function UpdateName(teamId, name) {
		return r.table('teams').get(teamId).update({
			name: name
		}).run(conn);
	}

	function IsNameUnique(name) {
		return r.table('teams').filter(r.row('name').eq(name)).isEmpty().run(conn);
	}

	function UpdateCurrent(teamId, questionIndex) {
		return r.table('teams').get(teamId).update({current: questionIndex, lastCorrect: new Date()}).run(conn);
	}

	function CheckAnswer(teamId, answer) {
		return GetTeamQuestion(teamId).then((question) => {
			return MatchAnswer(question.answer, answer);
		});
	}

	function InsertGuess(teamId, questionIndex, answer) {
		var guessKey = [teamId, questionIndex];
		return GetGuessesForQuestion(teamId, questionIndex, 0).then((guesses) => {
			guesses.push(answer);
			return r.table('guesses').get(guessKey).replace({
				id: guessKey,
				guesses: guesses
			}).run(conn);
		})
	}

	function GetTeamQuestion(teamId) {
		return GetTeam(teamId).then((team) => {
			if (!team) {
				return false;
			}
			return GetQuestion(team.current);
		});
	}

	function GetNamedTeams() {
		return r.table('teams').filter((data) => {
			return data.hasFields('name');
		}).run(conn).then((cursor) => {
			return cursor.toArray();
		});
	}

	function GetQuestion(questionIndex) {
		return r.table('questions').get(questionIndex).run(conn);
	}

	function GetGuessesForQuestion(teamId, questionIndex, maxGuesses) {
		var guessKey = [teamId, questionIndex];
		return r.table('guesses').get(guessKey).default(DEFAULT_GUESSES).run(conn).then((guessData) => {
			var guesses = guessData.guesses;
			if (maxGuesses > 0 && guesses.length > maxGuesses) {
				guesses = guesses.slice(guesses.length - maxGuesses, guesses.length);
			}
			return guesses;
		});
	}

	function GetQuestions() {
		return r.table('questions').orderBy('id').run(conn);
	}

	function GetMaxQuestionId() {
		return r.table('questions').max('id').default({id: 0}).run(conn).then((data) => {
			return data.id;
		});
	}

	function InsertQuestion(id, payload, answer) {
		return r.table('questions').insert({
			id,
			payload,
			answer
		}).run(conn);
	}

	return {
		GetTeamQuestionGame,
		GetRanking,
		GetTeam,
		SubmitAnswer,
		SubmitName,
		CreateQuestion,
		DestroyQuestionAndFixOrder,
		GetQuestions,
		MoveQuestion,
		UpdateQuestion,
		CreateTeam,
		DestroyTeam,
		GetTeams,
		GetGuesses
	};

}