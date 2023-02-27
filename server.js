const App = require("./App.js");

console.logCopy = console.log.bind(console);
console.log = function (...data) {
  var currentDate = "[" + new Date().toUTCString() + "] ";
  this.logCopy(currentDate, ...data);
};

App.listen(9000, () => console.log("Server running on port 9000"));
