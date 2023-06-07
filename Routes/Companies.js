const express = require("express")
const router = express.Router()
const Companies = require("../Models/Companies")

router.get("/getCompanies", async (req, res) => {
	try {
		const data = await Companies.find({})
		if (data.length) res.json({ success: true, result: data })
		else res.json({ success: false, message: "Companies Not found" })
	} catch (err) {
		res.status(500).json({ message: err?.message })
	}
})

router.put("/", async (req, res) => {
	try {
		const payload = req.body
		delete payload?._id
		const result = await Companies.findOneAndUpdate({ company_uuid: payload?.company_uuid }, payload)
		if (result) res.json({ success: true })
		else res.status(409).json({ message: "Failed to update." })
	} catch (err) {
		res.status(500).json({ message: err?.message })
	}
})

router.post("/", async (req, res) => {
	try {
		const payload = req.body
		const result = await Companies.create(payload)
		if (result) res.json({ success: true })
		else res.status(409).json({ message: "Failed to create." })
	} catch (err) {
		res.status(500).json({ message: err?.message })
	}
})

router.delete("/", async (req, res) => {
	try {
		const { company_uuid } = req.body
		const result = await Companies.findOneAndDelete({ company_uuid })
		if (result) res.json({ success: true })
		else res.status(409).json({ message: "Failed to delete." })
	} catch (err) {
		res.status(500).json({ message: err?.message })
	}
})

module.exports = router
