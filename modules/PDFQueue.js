const { Queue } = require("bullmq");
const redisConnection = {
	host: "localhost",
	port: 6379,
};

const queue = new Queue("PDFGeneration", {
	connection: redisConnection,
	defaultJobOptions: {
		attempts: 1,
	},
});

const processEnque = async collection => {
	for (const doc of collection) {
		await queue.add("PDF", doc);
	}
};

const processDeque = async id => {
	await queue.remove(id);
};

module.exports = { redisConnection, processEnque, processDeque };
