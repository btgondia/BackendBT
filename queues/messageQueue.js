const { Queue, Worker } = require("bullmq")
const { redisConnection } = require("../config/redis")

const fs = require("fs")
const axios = require("axios")
const Details = require("../Models/Details")

let queue
if (process.env?.NODE_ENV !== "development")
	queue = new Queue("Messages", {
		connection: redisConnection,
		defaultJobOptions: {
			attempts: 1
		}
	})

const getRandomBetween = (max = processingGap, min = processingGap - 1000) => ~~(Math.random() * (max - min) + min)

const messageEnque = async doc => {
	const details = await Details.findOne({}, { preferred_xpress_config: 1, xpress_config: 1 })
	if (
		details?.preferred_xpress_config === -1 ||
		!details?.xpress_config?.find(i => i.id === details?.preferred_xpress_config)
	)
		return console.red("ENQUE MESSAGE FAILED. INVALID XPRESS CONFIG.")

	const job_count = (await queue.getJobCounts("delayed"))?.delayed
	const delay = job_count * 2000 + getRandomBetween((job_count + 1) * 100, job_count * 100)
	if (doc?.message) doc.message = await `${doc.message}`.replaceAll("\n", "%0A")
	console.log("MESSAGE ENQUE ", doc)
	console.log("PROCESSING DELAY:", delay, { job_count })
	await queue.add("Message", doc, { delay })
}

const getParams = async _params => {
	const { preferred_xpress_config, xpress_config: configOptions } = await Details.findOne()
	const xpress_config = configOptions.find(i => i.id === preferred_xpress_config)
	_params.access_token = await xpress_config.access_token
	_params.instance_id = await xpress_config.instance_id
	return {
		query:
			"?" +
			Object.keys(_params)
				.filter(key => key !== "qr")
				.map(key => `${key}=${_params[key]}`)
				.join("&"),
		url: xpress_config.url
	}
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
					await queue.remove(job.id)
					return console.magenta(`SKIPPED JOB: ${job.id}. Document: ${filepath} not present.`)
				}

				let init_time = Date.now()
				const { query, url } = await getParams({
					...job.data,
					...(filename ? { media_url: `${process.env.HOST}/${filename}` } : {})
				})

				await axios.get(url + query)
				await queue.remove(job.id)
				console.yellow(`JOB: ${job.id} TOOK ${Date.now() - init_time}ms`)
			} catch (error) {
				await queue.remove(job.id)
				console.log("ERROR IN MESSAGE PROCESSING:", {
					message: error?.message,
					data: job.data,
					error
				})
			}
		},
		{
			connection: redisConnection
		}
	)
}

module.exports = { messageEnque }
