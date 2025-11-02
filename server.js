require("dotenv").config()
const App = require("./App.js")

let getTime = () => {
	let offset = 330
	if (offset === new Date().getTimezoneOffset()) offset = 0
	let date = new Date(Date.now() - offset * 60 * 1000 - 60 * 60 * 1000)
	return `${date.toDateString()}, ${date.toLocaleTimeString()}`
}

// const originalLog = console.log.bind(console)
// console.log = (...data) => originalLog("[" + getTime() + "] ", ...data)

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

for (const key in colors) console[key] = str => console.log(colors[key], str, colors.white)

const PORT = process.env.PORT || 9000
App.listen(PORT, () => console.green(`Server running on port ${PORT} with ${process.pid}`))
