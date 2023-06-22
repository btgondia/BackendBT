const express = require("express")

const router = express.Router()
const { v4: uuid } = require("uuid")
const Whatsapp_notifications = require("../Models/whatsapp_notifications")
const fs = require("fs")
const { getRunningOrders, getDate } = require("../modules")
const whatsapp_notifications = require("../Models/whatsapp_notifications")
const { sendMessages } = require("../modules/messagesHandler")
const Counters = require("../Models/Counters")
const Orders = require("../Models/Orders")
router.post("/CreateWhatsapp_notifications", async (req, res) => {
	try {
		let value = req.body
		if (!value) res.json({ success: false, message: "Invalid Data" })
		value = { ...value, notification_uuid: uuid(), status: 1 }

		console.log(value)
		let response = await Whatsapp_notifications.create(value)
		if (response) {
			res.json({ success: true, result: response })
		} else
			res.json({
				success: false,
				message: "whatsapp_notifications Not created",
			})
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.delete("/DeleteWhatsapp_notifications", async (req, res) => {
	try {
		let value = req.body
		if (!value.notification_uuid) res.json({ success: false, message: "Invalid Data" })
		let data = await Whatsapp_notifications.findOne({
			notification_uuid: value.notification_uuid,
		})
		console.log(value)
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
		let response = await Whatsapp_notifications.deleteMany({
			notification_uuid: value.notification_uuid,
		})
		if (response) {
			res.json({ success: true, result: response })
		} else
			res.json({
				success: false,
				message: "whatsapp_notifications Not Deleted",
			})
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.put("/UpdateWhatsapp_notifications", async (req, res) => {
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
		console.log(value)
		let response = await Whatsapp_notifications.updateMany({ notification_uuid: value.notification_uuid }, value)
		if (response.acknowledged) {
			res.json({ success: true, result: value })
		} else
			res.json({
				success: false,
				message: "whatsapp_notifications Not created",
			})
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})
router.get("/getWhatsapp_notifications", async (req, res) => {
	try {
		let response = await Whatsapp_notifications.find({})
		if (response.length) {
			res.json({ success: true, result: response })
		} else res.json({ success: false, message: "whatsapp_notifications Not found" })
	} catch (err) {
		res.status(500).json({ success: false, message: err })
	}
})

router.get("/pending_payments_counters/:user_uuid", async (req, res) => {
	try {
		const { user_uuid } = req.params
		const result = await getRunningOrders({
			user_uuid,
			getCounters: true,
			condition: {
				payment_pending: 1,
			},
		})
		res.json(result?.counterData)
	} catch (error) {}
})

router.post("/send_payment_reminders", async (req, res) => {
	try {
		const { notification_uuid, counter_ids } = req.body
		const getRow = i =>
			`\n${getDate(+i?.time_1)}       ${(i?.order_type === "I" ? "N" : i?.order_type) + i?.invoice_number}       Rs.${
				i?.order_grandtotal
			}`

		let orders = await Orders.find({
			counter_uuid: { $in: counter_ids },
			payment_pending: 1,
		})

		orders = JSON.parse(JSON.stringify(orders))
		const unpaid_counter_orders = orders?.reduce(
			(data, i) => ({
				...data,
				[i.counter_uuid]: (data[i.counter_uuid] || []).concat([i]),
			}),
			{}
		)

		let notification = await whatsapp_notifications.findOne({ notification_uuid })
		notification = JSON.parse(JSON.stringify(notification))

		for (const counter_id in unpaid_counter_orders) {
			const counterData = await Counters.findOne({ counter_uuid: counter_id })
			const orders = unpaid_counter_orders[counter_id]?.sort((a, b) => +a.time_1 - +b.time_1)
			const message = notification.message.map(i => ({
				...i,
				text: i?.text?.replace(
					/{details}/g,
					orders?.map(getRow).join("") + `\n*TOTAL: Rs.${orders.reduce((sum, i) => sum + +i?.order_grandtotal, 0)}*`
				),
			}))

			sendMessages({
				WhatsappNotification: { ...notification, message },
				counterData,
			})
		}

		res.send({ success: true })
	} catch (err) {
		res.status(500).json({ success: false, message: err?.message })
	}
})

module.exports = router
