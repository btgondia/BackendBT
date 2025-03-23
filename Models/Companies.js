const mongoose = require("mongoose")

const loadRates = ["per_unit", "per_box", "per_pack"]

const CompanySchema = new mongoose.Schema({
	company_uuid: { type: String, required: true, unique: true, trim: true },
	company_title: { type: String, required: true, trim: true },
	sort_order: { type: Number, default: 0, index: true },
	status: { type: Number, default: 1 },
	load_rate: { type: String, default: loadRates[0], enum: loadRates },
})

module.exports = mongoose.model("Company", CompanySchema)
