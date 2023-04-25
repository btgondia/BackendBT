const mongoose = require("mongoose")

const CampaignsSchema = new mongoose.Schema({
	campaign_uuid: {
		type: String,
	},
	form_uuid: {
		type: String,
	},
	campaign_title: {
		type: String,
	},
	created_at: {
		type: Number,
	},
	created_by: {
		type: String,
	},
	type: {
		type: String,
	},

	counters: [
		{
			type: String,
		},
	],
	counter_groups: [
		{
			type: String,
		},
	],
	counter_status: [
		{
			counter_uuid: {
				type: String,
			},
			status: {
				type: Number,
			},
		},
	],
	mobile: [
		{
			type: String,
		},
	],
	message: [
		{
			type: {
				type: String,
			},
			text: {
				type: String,
			},
			uuid: {
				type: String,
			},
			caption: {
				type: String,
			},
		},
	],
	campaign_short_link: {
		type: String,
	},
})

module.exports = mongoose.model("campaigns", CampaignsSchema)
