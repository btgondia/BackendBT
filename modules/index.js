const Counters = require("../Models/Counters")
const OrderCompleted = require("../Models/OrderCompleted")
const Orders = require("../Models/Orders")
const Receipts = require("../Models/Receipts")
const Users = require("../Models/Users")

const getReceipts = async () => {
	let response = await Receipts.find({ pending: 0 })
	response = await JSON.parse(JSON.stringify(response))
	let usersData = await Users.find(
		{ user_uuid: { $in: response.map(a => a.user_uuid).filter(a => a) } },
		{ user_uuid: 1, user_title: 1 }
	)
	response = response.filter(a => a.modes.filter(b => b.status === 0 && b.amt).length)
	if (!response?.length) return { success: false, message: "Receipts Not created" }

	let data = []
	for (let item of response) {
		let modes = item.modes.filter(
			a =>
				(a.mode_uuid === "c67b5988-d2b6-11ec-9d64-0242ac120002" ||
					a.mode_uuid === "c67b5794-d2b6-11ec-9d64-0242ac120002") &&
				a.amt &&
				a.status === 0
		)
		let orderData = await OrderCompleted.findOne({ order_uuid: item.order_uuid })
		if (!orderData) orderData = await Orders.findOne({ order_uuid: item.order_uuid })

		if (orderData) {
			let counterData = await Counters.findOne(
				{ counter_uuid: orderData.counter_uuid || item.counter_uuid },
				{ counter_title: 1, counter_uuid: 1 }
			)
			for (let item1 of modes) {
				let obj = {
					mode_title: item1.mode_uuid === "c67b5988-d2b6-11ec-9d64-0242ac120002" ? "UPI" : "Cheque",
					mode_uuid: item1.mode_uuid,
					counter_title: counterData?.counter_title || "",
					counter_uuid: counterData?.counter_uuid || "",
					invoice_number: orderData?.invoice_number || "",
					order_date: orderData?.status?.find(a => +a?.stage === 1)?.time,
					payment_date: item?.time,
					order_uuid: item.order_uuid,
					user_title: usersData.find(a => item.user_uuid === a.user_uuid)?.user_title,
					amt: item1?.amt,
					remarks: item1?.remarks,
				}
				data.push(obj)
			}
		}
	}

	return { success: true, result: data }
}

module.exports = {
	getReceipts,
}
