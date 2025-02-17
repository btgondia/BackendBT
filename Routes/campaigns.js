const express = require("express")

const router = express.Router()
const { v4: uuid } = require("uuid")
const Campaigns = require("../Models/Campaigns")
const Counters = require("../Models/Counters")
const fs = require("fs")
const { compaignShooter } = require("../modules/messagesHandler")

router.post("/CreateCampaigns", async (req, res) => {
	try {
		let value = req.body
		if (!value) res.json({ success: false, message: "Invalid Data" })
		value = {
			...value,
			campaign_uuid: uuid(),
			created_at: new Date().getTime(),
		}
		if (value.type === "order") {
			let campaign_short_link = uuid().slice(0, 7)
			let verirfyshort_link = await Campaigns.findOne({}, { campaign_uuid: 1 })
			while (verirfyshort_link) {
				campaign_short_link = uuid().slice(0, 7)
				verirfyshort_link = await Campaigns.findOne({ campaign_short_link }, { campaign_uuid: 1 })
			}
			value = { ...value, campaign_short_link }
		}
		
		let response = await Campaigns.create(value)
		if (response) {
			res.json({ success: true, result: response })
		} else
			res.json({
				success: false,
				message: "Campaigns Not created",
			})
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.post("/sendMsg", async (req, res) => {
	try {
		let value = req.body
		if (!value) res.json({ success: false, message: "Invalid Data" })
		let countersData = await Counters.find(
			{
				$or: [
					{
						counter_uuid: {
							$in:
								value.type === "order"
									? value?.counter_status
											.filter(a => value.all || !a.status)
											.map(a => a.counter_uuid)
									: value?.counters,
						},
					},
				].concat(
					value?.counter_groups?.[0] ? { counter_group_uuid: { $in: value?.counter_groups } } : []
				),
			},
			{ mobile: 1, counter_uuid: 1, counter_title: 1, short_link: 1 }
		)

		for (let counterData of countersData) {
			compaignShooter({ counterData, value })
		}
		if (value.type === "order") {
			setTimeout(() => {
				for (let messageobj of value.message) {
					fs.access("uploads/" + (messageobj.uuid || "") + ".png", err => {
						if (err) {
							console.log(err)
							return
						}
						fs.unlink("uploads/" + (messageobj.uuid || "") + ".png", err => {
							if (err) {
								console.log(err)
								return
							}
						})
					})
				}
			}, 5000)
		}
		res.json({ success: true, message: "Message Shooted Successfully" })
	} catch (err) {
		res.status(500).json({ success: false, message: err.message })
	}
})
router.delete("/DeleteCampaigns", async (req, res) => {
	try {
		let value = req.body
		if (!value.campaign_uuid) res.json({ success: false, message: "Invalid Data" })

		
		let data = await Campaigns.findOne({
			campaign_uuid: value.campaign_uuid,
		})
		for (let item of data.message) {
			fs.access("uploads/" + (item.uuid || "") + ".png", err => {
				if (err) {
					console.log(err)
					return
				}
				fs.unlink("uploads/" + (item.uuid || "") + ".png", err => {
					if (err) {
						console.log(err)
						return
					}
				})
			})
		}
		let response = await Campaigns.deleteMany({
			campaign_uuid: value.campaign_uuid,
		})
		if (response) {
			res.json({ success: true, result: response })
		} else
			res.json({
				success: false,
				message: "Campaigns Not Deleted",
			})
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.put("/UpdateCampaigns", async (req, res) => {
	try {
		let value = req.body
		if (!value) res.json({ success: false, message: "Invalid Data" })
		value = Object.keys(value)
			.filter(key => key !== "_id")
			.reduce((obj, key) => {
				obj[key] = value[key]
				return obj
			}, {})
		
		for (let item of value.message.filter(a => a.delete)) {
			fs.access("uploads/" + (item.uuid || "") + ".png", err => {
				if (err) {
					console.log(err)
					return
				}
				fs.unlink("uploads/" + (item.uuid || "") + ".png", err => {
					if (err) {
						console.log(err)
						return
					}
				})
			})
		}
		value = { ...value, message: value.message.filter(a => !a.delete) }
		let response = await Campaigns.updateMany({ campaign_uuid: value.campaign_uuid }, value)
		if (response.acknowledged) {
			res.json({ success: true, result: value })
		} else
			res.json({
				success: false,
				message: "Campaigns Not created",
			})
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.get("/getCampaigns", async (req, res) => {
	try {
		let response = await Campaigns.find({})
		if (response.length) {
			res.json({ success: true, result: response })
		} else res.json({ success: false, message: "Campaigns Not found" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})

module.exports = router
