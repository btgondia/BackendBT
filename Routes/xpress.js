const express = require("express");
const router = express.Router();
const { messageEnque } = require("../queues/messageQueue");

router.post("/sendmessage", async (req, res) => {
	try {
		let messages = req.body;
		for (const message of messages) {
			await messageEnque(message);
		}
		res.json({ success: true });
	} catch (err) {
		res.status(500).json({ success: false, message: err });
	}
});

module.exports = router;
