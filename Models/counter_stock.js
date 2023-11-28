const mongoose = require("mongoose")

const CounterSStocks = new mongoose.Schema({
	session_uuid: { type: String, required: true },
	counter_uuid: { type: String, required: true },
	user_uuid: [{ type: String}],
	category_uuid: [{ type: String}],
	timestamp: { type: Number, default: new Date(new Date().setHours(0, 0, 0, 0)).getTime() },
    details: [
        {
            item_uuid: { type: String, required: true },
            pcs: { type: Number, required: true },
        }
    ],
})

module.exports = mongoose.model("counter_stock", CounterSStocks)
