const express = require("express")

const router = express.Router()
const { v4: uuid } = require("uuid")
const AutoBill = require("../Models/AutoBill")
const Companies = require("../Models/Companies")
const CounterGroup = require("../Models/CounterGroup")
const Counters = require("../Models/Counters")
const Item = require("../Models/Item")
const ItemCategories = require("../Models/ItemCategories")
const Routes = require("../Models/Routes")
const User = require("../Models/Users")
const PaymentModes = require("../Models/PaymentModes")
const Warehouse = require("../Models/Warehouse")

router.post("/postUser", async (req, res) => {
	try {
		let value = req.body
		if (!value) res.json({ success: false, message: "Invalid Data" })
		value = { ...value, user_uuid: uuid() }

		console.log(value)
		let response = await User.create(value)
		if (response) {
			res.json({ success: true, result: response })
		} else res.json({ success: false, message: "User Not created" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.put("/putUser", async (req, res) => {
	try {
		let value = req.body
		console.log(value)
		if (!value) res.json({ success: false, message: "Invalid Data" })
		value = Object.keys(value)
			.filter(key => key !== "_id")
			.reduce((obj, key) => {
				obj[key] = value[key]
				return obj
			}, {})

		let response = await User.updateOne({ user_uuid: value.user_uuid }, value)
		console.log(response)
		if (response) {
			res.json({ success: true, result: response })
		} else res.json({ success: false, message: "User Not updated" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})

router.get("/GetUserList", async (req, res) => {
	try {
		let data = await User.find({})

		if (data.length) res.json({ success: true, result: data })
		else res.json({ success: false, message: "Users Not found" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.get("/GetActiveUserList", async (req, res) => {
	try {
		let data = await User.find({ status: 1 })

		if (data.length) res.json({ success: true, result: data })
		else res.json({ success: false, message: "Users Not found" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.get("/GetNormalUserList", async (req, res) => {
	try {
		let data = await User.find({ user_type: 1 })

		if (data.length) res.json({ success: true, result: data })
		else res.json({ success: false, message: "Users Not found" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.get("/GetUser/:user_uuid", async (req, res) => {
	try {
		let data = await User.findOne({
			user_uuid: req.params.user_uuid,
			status: 1,
		})
		console.log(req.params.user_uuid.data)
		if (data) res.json({ success: true, result: data })
		else res.json({ success: false, message: "Not Authorized to Log-in" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})

router.post("/login", async (req, res) => {
	console.log(req.body)
	const login_username = req.body.login_username
	const login_password = req.body.login_password
	try {
		const result = await User.findOne({ login_username, login_password })
		if (result) {
			if (+result.status === 1) res.json({ success: true, result })
			else res.json({ success: false, message: "Not Authorized to Log-in" })
		} else {
			res.json({ success: false, message: "Invalid User Name and Password" })
		}
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.get("/getDetails", async (req, res) => {
	try {
		let autobill = await AutoBill.find({})
		autobill = autobill.filter(a => a.auto_uuid)
		let companies = await Companies.find({ status: 1 })
		companies = companies.filter(a => a.company_uuid)
		let counter_groups = await CounterGroup.find({})
		counter_groups = counter_groups.filter(a => a.counter_group_uuid)
		let counter = await Counters.find(
			{},
			{
				counter_title: 1,
				counter_code: 1,
				sort_order: 1,
				payment_reminder_days: 1,
				outstanding_type: 1,
				credit_allowed: 1,
				gst: 1,
				food_license: 1,
				counter_uuid: 1,
				remarks: 1,
				status: 1,
				route_uuid: 1,
				address: 1,
				mobile: 1,
				company_discount: 1,
				item_special_price: 1,
				item_special_discount: 1,
				counter_group_uuid: 1,
				payment_modes: 1,
			}
		)
		counter = counter.filter(a => a.counter_uuid)
		let item_category = await ItemCategories.find({})
		item_category = item_category.filter(a => a.category_uuid)
		let items = await Item.find(
			{ status: 1 },
			{
				item_title: 1,
				item_discount: 1,
				exclude_discount: 1,
				status: 1,
				sort_order: 1,
				item_code: 1,
				free_issue: 1,
				item_uuid: 1,
				one_pack: 1,
				company_uuid: 1,
				category_uuid: 1,
				pronounce: 1,
				mrp: 1,
				item_price: 1,
				item_gst: 1,
				conversion: 1,
				barcode: 1,
				item_group_uuid: 1,
				// stock: 1,
				created_at: 1,
			}
		)
		items = items.filter(a => a.item_uuid && companies?.find(i => i?.company_uuid === a?.company_uuid))
		let routes = await Routes.find({})
		routes = routes.filter(a => a.route_uuid)
		let payment_modes = await PaymentModes.find({})
		payment_modes = payment_modes.filter(a => a.mode_uuid)
		let warehouse = await Warehouse.find({})
		warehouse = warehouse.filter(a => a.warehouse_uuid)
		// const payment_modes= await Item.find({  })
		let result = {
			autobill,
			companies,
			counter_groups,
			counter,
			item_category,
			items,
			routes,
			payment_modes,
			warehouse,
		}
		res.json({
			success: true,
			result,
		})
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})

module.exports = router
