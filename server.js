const App = require("./App.js");

console.logEscape = console.log.bind(console);
console.logCopy = console.log.bind(console);
console.log = function (...data) {
	var currentDate = "[" + new Date().toUTCString() + "] ";
	this.logCopy(currentDate, ...data);
};

const colors = {
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	white: "\x1b[37m",
};

console.red = str => console.log(colors.red, str, colors.white);
console.green = str => console.log(colors.green, str, colors.white);
console.yellow = str => console.log(colors.yellow, str, colors.white);
console._time = str => {
	console.time(colors.yellow + str);
	console.logEscape(colors.white);
};
console._timeEnd = str => {
	console.timeEnd(colors.yellow + str);
	console.logEscape(colors.white);
};

App.listen(9000, () => console.log("Server running on port 9000"));
