const { Queue } = require("bullmq")
const { redisConnection } = require("../config/redis")

let queue
if (process.env?.NODE_ENV !== "development")
	queue = new Queue("PDFGeneration", {
		connection: redisConnection,
		defaultJobOptions: {
			attempts: 1
		}
	})

const processEnque = async collection => {
	for (const doc of collection) {
		await queue?.add("PDF", doc)
	}
}

const processDeque = async id => {
	await queue?.remove(id)
}

module.exports = { processEnque, processDeque }
