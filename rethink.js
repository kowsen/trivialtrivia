var r = require('rethinkdb');

var DEFAULT_GUESSES = { guesses: [] };
var MAX_GUESSES = 5;
var DEFAULT_QUESTION = {
	id: id,
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

module.exports = function(conn) {

	function GetTeamQuestion(teamId) {
		return GetTeam(teamId).then((team) => {
			return GetQuestion(team.current).then((question) => {
				return GetGuesses(teamId, team.current, MAX_GUESSES).then((guesses) => {
					delete question.answer;
					question.guesses = guesses;
					return question;
				});
			});
		}).catch(() => {
			return DEFAULT_QUESTION;
		})
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

	function CreateQuestion(payload, answer) {
		return GetMaxQuestionId().then((maxIndex) => {
			return InsertQuestion(parseInt(maxIndex.id) + 1, payload, answer);
		});
	}

	function GetTeam(teamId) {
		return r.table('teams').get(id).run(conn);
	}

	function GetNamedTeams() {
		return r.table('teams').filter((data) => {
			return data.hasFields('name');
		});
	}

	function GetQuestion(questionIndex) {
		return r.table('questions').get(questionIndex).run(conn);
	}

	function GetGuesses(teamId, questionIndex, maxGuesses) {
		var guessKey = [team.id, team.current];
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

	return {};

}