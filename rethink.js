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
			return GetGuesses(teamId, question.id, MAX_GUESSES).then((guesses) => {
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
		return GetGuesses(teamId, questionIndex, 0).then((guesses) => {
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

	function CreateQuestion(payload, answer) {
		return GetMaxQuestionId().then((maxIndex) => {
			return InsertQuestion(parseInt(maxIndex.id) + 1, payload, answer);
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

	function GetGuesses(teamId, questionIndex, maxGuesses) {
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
		return r.table('questions').max('id').default({id: 0}).run(conn);
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
		SubmitName
	};

}