const { Queue, Worker } = require("bullmq");
const { redisConnection } = require("../config/redis");

const fs = require("fs");
const axios = require("axios");
const host = "https://xpressdigitalservices.com/api";
const params = {
	access_token: process.env.XPRESS_ACCESS_TOKEN,
	instance_id: process.env.XPRESS_INSTANCE_ID,
};

let queue;
if (process.env?.NODE_ENV !== "development")
	queue = new Queue("Messages", {
		connection: redisConnection,
		defaultJobOptions: {
			attempts: 1,
		},
	});

const messageEnque = async doc => {
	if (doc.message) doc.message = await doc.message.replaceAll("\n", "%0A");
	console.log("MESSAGE ENQUE ", doc);
	await queue.add("Message", doc);
};

const getParams = (_params = params) => {
	return (
		"?" +
		Object.keys(_params)
			.filter(key => key !== "qr")
			.map(key => `${key}=${_params[key]}`)
			.join("&")
	);
};

if (process.env?.NODE_ENV !== "development")
	new Worker(
		"Messages",
		async job => {
			try {
				const { filename } = job.data;
				const filepath = `uploads/${filename}`;

				if (filename && !fs.existsSync(filepath)) {
					return console.magenta(`SKIPPED JOB: ${job.id}. Document: ${filepath} not present.`);
				}

				let init_time = Date.now();
				const query = getParams({
					...params,
					...job.data,
					media_url: `${process.env.HOST}/${filename}`,
				});

				const response = await axios({
					method: "post",
					url: host + "/send.php" + query,
				});

				queue.remove(job.id);
				console.yellow(`JOB: ${job.id} TOOK ${Date.now() - init_time}ms`);
				console.log(response.data);
			} catch (error) {
				console.log("ERROR IN MESSAGE PROCESSING:", {
					message: error?.message,
					data: job.data,
					error,
				});
			}
		},
		{
			connection: redisConnection,
		}
	);

module.exports = { messageEnque };
