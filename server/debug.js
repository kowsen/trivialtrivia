var IS_DEBUG = true;

module.exports = {
	log: function(str) {
		if (IS_DEBUG) {
			console.log(str);
		}
	}
}