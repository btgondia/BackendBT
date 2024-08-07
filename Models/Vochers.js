const mongoose = require("mongoose")

const itemSchema = new mongoose.Schema({
	type: { type: String },
	voucher_uuid: { type: String },
	vocher_number: { type: String },
	created_at: { type: Number },
	created_by: { type: String },
	from_warehouse: { type: String },
	to_warehouse: { type: String },
	delivered: { type: Number },
	item_details: [
		{
			item_uuid: { type: String },
			b: { type: Number },
			p: { type: Number },
			status: { type: Number },
			remarks: { type: String },
			visible: { type: Number }
		}
	]
})

module.exports = mongoose.model("vouchers", itemSchema)
