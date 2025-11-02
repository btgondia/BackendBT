const Counters = require("../Models/Counters")
const Orders = require("../Models/Orders")
const Users = require("../Models/Users");
const chunkifyDBCall = require("../utils/chunkifyDBCall");

const getRunningOrders = async ({ user_uuid, condition = {}, getCounters }) => {
	try {
		let userData = await Users.findOne({ user_uuid }, { routes: 1 });
		userData = JSON.parse(JSON.stringify(userData));

		let data = [];
		let counterData = [];

		if (userData?.routes?.filter(i => +i !== 1)?.length) {
			const counterQuery = userData.routes.includes("none") ? {} : { route_uuid: { $in: userData.routes } };

			counterData = await Counters.find(counterQuery, { counter_title: 1, counter_uuid: 1, route_uuid: 1 });
			
			data = await chunkifyDBCall(Orders, 20, {
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
	getRunningOrders,
}
