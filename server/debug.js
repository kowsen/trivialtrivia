var IS_DEBUG = false;

module.exports = {
	log: function(str) {
		if (IS_DEBUG) {
			console.log(str);
		}
	}
}