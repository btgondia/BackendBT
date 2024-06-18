const mongoose = require("mongoose")

const CompaniesSchema = new mongoose.Schema({
	company_uuid: { type: String },
	company_title: { type: String },
	sort_order: { type: Number },
	company_color: { type: String, default:"#000000" },
	status: { type: Number, default: 1 },
})

module.exports = mongoose.model("companies", CompaniesSchema)
