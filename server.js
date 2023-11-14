require("dotenv").config()
const App = require("./App.js")

const getTime = () => {
	const offset = -(new Date().getTimezoneOffset() || 330) * 60 * 1000
	const date = new Date(Date.now() + offset)
	return `${date.toDateString()} ${date.toLocaleTimeString()}`
}
console.logCopy = console.log.bind(console)
console.log = function (...data) {
	let currentDate = "[" + getTime() + "] "
	this.logCopy(currentDate, ...data)
}

const colors = {
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	white: "\x1b[37m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
	gray: "\x1b[90m"
}

console.red = str => console.log(colors.red, str, colors.white)
console.green = str => console.log(colors.green, str, colors.white)
console.yellow = str => console.log(colors.yellow, str, colors.white)
console.blue = str => console.log(colors.blue, str, colors.white)
console.magenta = str => console.log(colors.magenta, str, colors.white)
console.cyan = str => console.log(colors.cyan, str, colors.white)
console.gray = str => console.log(colors.gray, str, colors.white)

const PORT = process.env.PORT || 9000
App.listen(PORT, () => console.green(`Server running on port ${PORT}`))
