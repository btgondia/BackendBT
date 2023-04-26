const { Queue, Worker } = require("bullmq")
const { redisConnection } = require("../config/redis")

const fs = require("fs")
const axios = require("axios")
const host = "https://xpressdigitalservices.com/api"
const params = {
	access_token: process.env.XPRESS_ACCESS_TOKEN,
	instance_id: process.env.XPRESS_INSTANCE_ID,
}

let queue
if (process.env?.NODE_ENV !== "development")
	queue = new Queue("Messages", {
		connection: redisConnection,
		defaultJobOptions: {
			attempts: 1,
		},
	})

const getRandomBetween = (max = processingGap, min = processingGap - 1000) =>
	~~(Math.random() * (max - min) + min)

const messageEnque = async doc => {
	const job_count = (await queue.getJobCounts("delayed"))?.delayed
	const delay = job_count * 2000 + getRandomBetween((job_count + 1) * 100, job_count * 100)
	console.log({ doc })
	if (doc?.message) doc.message = await `${doc.message}`.replaceAll("\n", "%0A")
	console.log("MESSAGE ENQUE ", doc)
	console.log("PROCESSING DELAY:", delay, { job_count })
	await queue.add("Message", doc, { delay })
}

const getParams = (_params = params) => {
	return (
		"?" +
		Object.keys(_params)
			.filter(key => key !== "qr")
			.map(key => `${key}=${_params[key]}`)
			.join("&")
	)
}

let worker
if (process.env?.NODE_ENV !== "development") {
	worker = new Worker(
		"Messages",
		async job => {
			try {
				const { filename } = job.data
				const filepath = `uploads/${filename}`

				if (filename && !fs.existsSync(filepath)) {
					return console.magenta(`SKIPPED JOB: ${job.id}. Document: ${filepath} not present.`)
				}

				let init_time = Date.now()
				const query = getParams({
					...params,
					...job.data,
					media_url: `${process.env.HOST}/${filename}`,
				})

				const response = await axios({
					method: "post",
					url: host + "/send.php" + query,
				})

				queue.remove(job.id)
				console.yellow(`JOB: ${job.id} TOOK ${Date.now() - init_time}ms`)
				console.log(response.data)
			} catch (error) {
				console.log("ERROR IN MESSAGE PROCESSING:", {
					message: error?.message,
					data: job.data,
					error,
				})
			}
		},
		{
			connection: redisConnection,
		}
	)
}

module.exports = { messageEnque }
