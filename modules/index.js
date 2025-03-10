const Counters = require("../Models/Counters")
const OrderCompleted = require("../Models/OrderCompleted")
const Orders = require("../Models/Orders")
const Receipts = require("../Models/Receipts")
const Routes = require("../Models/Routes")
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
				{ counter_title: 1, counter_uuid: 1,payment_reminder_days:1,route_uuid:1 }
			)
			for (let item1 of modes) {
				let route_title = await Routes.findOne({ route_uuid: counterData.route_uuid }, { route_title: 1 })
				let obj = {
					mode_title: item1.mode_uuid === "c67b5988-d2b6-11ec-9d64-0242ac120002" ? "UPI" : "Cheque",
					mode_uuid: item1.mode_uuid,
					counter_title: (counterData?.counter_title || "")+", "+(route_title?.route_title || ""),
					counter_uuid: counterData?.counter_uuid || "",
					invoice_number: orderData?.invoice_number || "",
					order_date: orderData?.status?.find(a => +a?.stage === 1)?.time,
					payment_date: item?.time,
					order_uuid: item.order_uuid,
					user_title: usersData.find(a => item.user_uuid === a.user_uuid)?.user_title,
					amt: item1?.amt,
					remarks: item1?.remarks,
					payment_reminder_days: counterData?.payment_reminder_days || 0
				}
				data.push(obj)
			}
		}
	}

	return { success: true, result: data }
}

const getRunningOrders = async ({ user_uuid, condition = {}, getCounters }) => {
	try {
		let userData = await Users.findOne({ user_uuid }, { routes: 1 });
		userData = JSON.parse(JSON.stringify(userData));

		let data = [];
		let counterData = [];

		if (userData?.routes?.filter(i => +i !== 1)?.length) {
			const counterQuery = userData.routes.includes("none") ? {} : { route_uuid: { $in: userData.routes } };

			counterData = await Counters.find(counterQuery, { counter_title: 1, counter_uuid: 1, route_uuid: 1 });
			data =await Orders.find({
				order_uuid: { $exists: true, $ne: "" },
				counter_uuid: { $in: counterData.filter(i => i.counter_uuid).map(i => i.counter_uuid) },
				hold: { $ne: "Y" },
				item_details: { $exists: true, $ne: [] },
				status: { $exists: true, $ne: [] },

				...condition
			});
			

		} else {
			data = await Orders.find({order_uuid: { $exists: true, $ne: "" },
				hold: { $ne: "Y" },
				item_details: { $exists: true, $ne: [] },
				status: { $exists: true, $ne: [] }, ...condition });
			const counterUUIDs = data.map(i => i.counter_uuid);
			counterData = await Counters.find(
				{ counter_uuid: { $in: counterUUIDs } },
				{ counter_title: 1, counter_uuid: 1 }
			);
		}

		if (getCounters) {
			return { counterData: counterData.filter(i => data.find(_i => _i.counter_uuid === i.counter_uuid)) };
		}
data=JSON.parse(JSON.stringify(data))
		data = data
			.map(i => ({
				...i,
				counter_title: i.counter_uuid ? counterData.find(_i => _i.counter_uuid === i.counter_uuid)?.counter_title : "",
			}));

		return { success: true, result: data };
	} catch (error) {
		throw new Error(error.message);
	}
};

const getDate = i => {
	const date = new Date(i)
	return [date.getDate(), date.getMonth() + 1, date.getFullYear()].map(i => i.toString().padStart(2, "0")).join("/")
}

module.exports = {
	getDate,
	getReceipts,
	getRunningOrders,
}
