require("./config/mongo")()

const cors = require("cors")
const express = require("express")
const morgan = require("morgan")
const gTTS = require("gtts")
const multer = require("multer")
const fs = require("fs")
const bodyParser = require("body-parser")

const WarehouseModel = require("./Models/Warehouse")
const ItemModel = require("./Models/Item")
const DetailsModel = require("./Models/Details")
const OrderCompleted = require("./Models/OrderCompleted")
const CancelOrdersModel = require("./Models/CancelOrders")
const Vochers = require("./Models/Vochers")

const Routes = require("./routes/Routes")
const ItemCategories = require("./routes/ItemCategories")
const Companies = require("./routes/Companies")
const CounterGroup = require("./routes/CounterGroup")
const ItemGroup = require("./routes/ItemGroup")
const Counter = require("./routes/Counters")
const TestCounter = require("./routes/TestCounter")
const Users = require("./routes/Users")
const Item = require("./routes/Item")
const Vouchers = require("./routes/Vouchers")
const Warehouse = require("./routes/Warehouse")
const Tasks = require("./routes/Tasks")
const AutoBill = require("./routes/AutoBill")
const Orders = require("./routes/Orders")
const Trips = require("./routes/Trips")
const UserActivity = require("./routes/UserActivity")
const PaymentModes = require("./routes/PaymentModes")
const Receipts = require("./routes/Receipts")
const Outstanding = require("./routes/Outstanding")
const Details = require("./routes/Details")
const Incentive = require("./routes/Incentives")
const IncentiveStatment = require("./routes/IncentiveStatment")
const CancelOrders = require("./routes/CancelOrder")
const CollectionTags = require("./routes/collectionTag")
const Counter_scheme = require("./routes/counter_schemes")
const whatsapp_notifications = require("./routes/whatsapp_notifications")
const campaigns = require("./routes/campaigns")
const OrderForm = require("./routes/OrderForm")
const CashRegister = require("./routes/cash_regiterations")
const xpressRoutes = require("./routes/xpress")
const CounterCharges = require("./routes/counterCharges")
const CounterStock = require("./routes/counter_stock")
const Expense = require("./routes/Expense")
const StockTracker = require("./routes/StockTracker")


if (!fs.existsSync("uploads")) fs.mkdirSync("uploads")

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, "uploads")
	},
	filename: function (req, file, cb) {
		console.log(file)
		cb(null, file.originalname)
	}
})

const upload = multer({ storage })

app = express()
app.use(
	cors({
		origin: "*",
		credentials: true
	})
)

app.use(bodyParser.json({ limit: "100mb" }))
app.use(
	bodyParser.urlencoded({
		limit: "100mb",
		extended: true,
		parameterLimit: 50000
	})
)
app.use(morgan("dev"))
app.post("/uploadImage", upload.single("file"), (req, res) => {
	res.json({ success: true })
})

app.use("/xpress", xpressRoutes)
app.use("/routes", Routes)
app.use("/itemCategories", ItemCategories)
app.use("/companies", Companies)
app.use("/counterGroup", CounterGroup)
app.use("/counterCharges", CounterCharges)
app.use("/itemGroup", ItemGroup)
app.use("/counters", Counter)
app.use("/testCounters", TestCounter)
app.use("/users", Users)
app.use("/items", Item)
app.use("/vouchers", Vouchers)
app.use("/warehouse", Warehouse)
app.use("/tasks", Tasks)
app.use("/autoBill", AutoBill)
app.use("/incentive", Incentive)
app.use("/orders", Orders)
app.use("/trips", Trips)
app.use("/userActivity", UserActivity)
app.use("/paymentModes", PaymentModes)
app.use("/receipts", Receipts)
app.use("/Outstanding", Outstanding)
app.use("/details", Details)
app.use("/incentiveStatment", IncentiveStatment)
app.use("/cancelOrders", CancelOrders)
app.use("/collectionTags", CollectionTags)
app.use("/counter_scheme", Counter_scheme)
app.use("/whatsapp_notifications", whatsapp_notifications)
app.use("/campaigns", campaigns)
app.use("/orderForm", OrderForm)
app.use("/cashRegistrations", CashRegister)
app.use("/counterStock", CounterStock)
app.use("/expense", Expense)
app.use("/stockTracker", StockTracker)
app.get("/MinLevelUpdate", async (req, res, next) => {
	const response = await MinLevelUpdateAutomation()
	res.json({ success: true, message: "Updated", result: response })
})
app.get("/stream/:text", async (req, res) => {
	try {
		let { text } = await req.params
		let extra = ", extra audio text, extra audio text, extra audio text, extra audio text, extra"
		const gtts = new gTTS(`${text?.replaceAll("_", " ")}` + extra, "en")
		res.set({ "Content-Type": "audio/mpeg" })
		gtts.stream().pipe(res)
	} catch (err) {
		res.status(500).json({ success: false, message: err.message })
	}
})

const MinLevelUpdateAutomation = async () => {
	let itemsList = []
	console.log("Fuction")

	let warehouseData = await WarehouseModel.find({})
	warehouseData = JSON.parse(JSON.stringify(warehouseData))
	warehouseData = warehouseData.filter(a => a.warehouse_uuid)
	let itemsData = await ItemModel.find({})
	itemsData = JSON.parse(JSON.stringify(itemsData))

	for (let warehouseItem of warehouseData) {
		let time = new Date().getTime()
		let FiteenDaysTime = new Date(time - 86400000 * (warehouseItem?.compare_stock_level || 0)).toDateString()
		FiteenDaysTime = new Date(FiteenDaysTime + " 00:00:00 AM").getTime()
		let ordersData = await OrderCompleted.find({
			"status.time": { $gt: FiteenDaysTime },
			"warehouse_uuid": warehouseItem.warehouse_uuid
		})
		// let cancelOrdersData = await CancelOrdersModel.find({
		// 	"status.time": { $gt: FiteenDaysTime },
		// 	"warehouse_uuid": warehouseItem.warehouse_uuid,
		// });
		let vocherData = await Vochers.find({
			created_at: { $gt: FiteenDaysTime },
			from_warehouse: warehouseItem.warehouse_uuid
		})
		ordersData = JSON.parse(JSON.stringify(ordersData))
		ordersData = ordersData.filter(a => a.status.filter(b => +b.stage === 1 && b.time > FiteenDaysTime).length)
		// cancelOrdersData = JSON.parse(JSON.stringify(cancelOrdersData));
		// cancelOrdersData = cancelOrdersData.filter(
		// 	a => a.status.filter(b => +b.stage === 1 && b.time > FiteenDaysTime).length
		// );
		console.log(warehouseItem)
		let items = [
			...([].concat.apply(
				[],
				ordersData?.map(a => a.item_details)
			) || []),
			...([].concat.apply(
				[],
				ordersData?.map(a => a.processing_canceled)
			) || []),
			...([].concat.apply(
				[],
				ordersData?.map(a => a.fulfillment)
			) || []),
			...([].concat.apply(
				[],
				vocherData?.map(a => a.item_details)
			) || [])
			// ...([].concat.apply(
			// 	[],
			// 	cancelOrdersData?.map(a => a.processing_canceled)
			// ) || []),
			// ...([].concat.apply(
			// 	[],
			// 	cancelOrdersData?.map(a => a.fulfillment)
			// ) || []),
			// ! DELVERY RETURN IS NOT INCLUDED IN QUERY
			// ...([].concat.apply(
			//   [],
			//   ordersData?.map((a) => a.delivery_return)
			// ) || []),
			// ...([].concat.apply(
			//   [],
			//   cancelOrdersData?.map((a) => a.delivery_return)
			// ) || []),
		]

		let result = []
		for (let item of items) {
			let itemData = itemsData.find(a => a.item_uuid === item.item_uuid)
			var existing = result.filter(function (v, i) {
				return v.item_uuid === item.item_uuid
			})

			if (existing.length === 0 && itemData) {
				let itemsFilteredData = items.filter(a => a.item_uuid === item.item_uuid)
				let b =
					itemsFilteredData.length > 1
						? itemsFilteredData?.map(c => +c.b || 0).reduce((c, d) => c + d)
						: +itemsFilteredData[0]?.b || 0
				let p =
					itemsFilteredData.length > 1
						? itemsFilteredData?.map(c => +c.p || 0).reduce((c, d) => c + d)
						: +itemsFilteredData[0]?.p || 0

				let obj = {
					...item,
					stock: itemData?.stock || [],
					conversion: itemData?.conversion,
					b: parseInt(+b + +p / +itemData?.conversion),
					p: parseInt(+p % +itemData?.conversion)
				}
				result.push(obj)
			}
		}
		for (let item of result) {
			let min_level = +item.b * +item.conversion + +item.p
			min_level = Math.floor(min_level * ((warehouseItem?.maintain_stock_days || 0) / (warehouseItem?.compare_stock_level || 1)))
			let stock = item.stock
			stock = stock?.filter(a => a.warehouse_uuid === warehouseItem.warehouse_uuid)?.length
				? stock.map(a => (a.warehouse_uuid === warehouseItem.warehouse_uuid ? { ...a, min_level } : a))
				: stock?.length
				? [
						...stock,
						{
							warehouse_uuid: warehouseItem.warehouse_uuid,
							min_level,
							qty: 0
						}
				  ]
				: [
						{
							warehouse_uuid: warehouseItem.warehouse_uuid,
							min_level,
							qty: 0
						}
				  ]
			await ItemModel.updateOne({ item_uuid: item.item_uuid }, { stock })
			itemsList.push({ item_uuid: item.item_uuid, stock })
		}
	}

	const date = new Date()
	await DetailsModel.updateMany({}, { timer_run_at: date.getTime() })
	return itemsList
}

// MinLevelUpdateAutomation().then(i => console.log(i.find(i => i.item_uuid === "70715926-1762-4eef-a890-d9ee70494329").stock))
// setTimeout(MinLevelUpdateAutomation, 5000);
setInterval(function () {
	// Set interval for checking
	var date = new Date() // Create a Date object to find out what time it is
	if (date.getHours() === 2) {
		console.log(date.getHours())
		// Check the time
		MinLevelUpdateAutomation()
	}
}, 360000)
app.use(express.static("uploads"))
module.exports = app
