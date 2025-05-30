require("./config/mongo")();

const cors = require("cors");
const express = require("express");
const morgan = require("morgan");
const gTTS = require("gtts");
const multer = require("multer");
const fs = require("fs");
const bodyParser = require("body-parser");
const path = require("path");

const WarehouseModel = require("./Models/Warehouse");
const ItemModel = require("./Models/Item");
const DetailsModel = require("./Models/Details");
const OrderCompleted = require("./Models/OrderCompleted");
const Vochers = require("./Models/Vochers");

const Routes = require("./Routes/Routes");
const ItemCategories = require("./Routes/ItemCategories");
const Companies = require("./Routes/Companies");
const CounterGroup = require("./Routes/CounterGroup");
const ItemGroup = require("./Routes/ItemGroup");
const Counter = require("./Routes/Counters");
const TestCounter = require("./Routes/TestCounter");
const Users = require("./Routes/Users");
const Item = require("./Routes/Item");
const Vouchers = require("./Routes/Vouchers");
const Warehouse = require("./Routes/Warehouse");
const Tasks = require("./Routes/Tasks");
const AutoBill = require("./Routes/AutoBill");
const Orders = require("./Routes/Orders");
const Trips = require("./Routes/Trips");
const UserActivity = require("./Routes/UserActivity");
const PaymentModes = require("./Routes/PaymentModes");
const Receipts = require("./Routes/Receipts");
const Outstanding = require("./Routes/Outstanding");
const Details = require("./Routes/Details");
const Incentive = require("./Routes/Incentives");
const IncentiveStatment = require("./Routes/IncentiveStatment");
const CancelOrders = require("./Routes/CancelOrder");
const CollectionTags = require("./Routes/collectionTag");
const Counter_scheme = require("./Routes/counter_schemes");
const OrderForm = require("./Routes/OrderForm");
const CashRegister = require("./Routes/cash_regiterations");
const CounterCharges = require("./Routes/counterCharges");
const CounterStock = require("./Routes/counter_stock");
const Expense = require("./Routes/Expense");
const StockTracker = require("./Routes/StockTracker");
const SoundApp = require("./Routes/SoundApp");
const Ledger = require("./Routes/Ledger");
const LedgerGroup = require("./Routes/LedgerGroups");
const PurchaseINvoice = require("./Routes/PurchaseInvoice");
const CreditNotes = require("./Routes/CreditNote");
const loggerMiddleware = require("./loggerMiddleware");
const GSTReturns = require("./Routes/GSTReturns");
const HSNCode = require("./Routes/hsn_code");
const baseRouter = require("./Routes/_base");

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

app = express();
app.use(cors({ origin: "*", credentials: true }));
// app.use(loggerMiddleware);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb', parameterLimit: 10000 }));
app.use(morgan("dev"));

app.post("/uploadImage", upload.single("file"), (req, res) => {
  res.json({ success: true });
});

app.use("/routes", Routes);
app.use("/itemCategories", ItemCategories);
app.use("/companies", Companies);
app.use("/counterGroup", CounterGroup);
app.use("/counterCharges", CounterCharges);
app.use("/itemGroup", ItemGroup);
app.use("/counters", Counter);
app.use("/testCounters", TestCounter);
app.use("/users", Users);
app.use("/items", Item);
app.use("/vouchers", Vouchers);
app.use("/warehouse", Warehouse);
app.use("/tasks", Tasks);
app.use("/autoBill", AutoBill);
app.use("/incentive", Incentive);
app.use("/orders", Orders);
app.use("/trips", Trips);
app.use("/userActivity", UserActivity);
app.use("/paymentModes", PaymentModes);
app.use("/receipts", Receipts);
app.use("/Outstanding", Outstanding);
app.use("/details", Details);
app.use("/incentiveStatment", IncentiveStatment);
app.use("/cancelOrders", CancelOrders);
app.use("/collectionTags", CollectionTags);
app.use("/counter_scheme", Counter_scheme);
app.use("/orderForm", OrderForm);
app.use("/cashRegistrations", CashRegister);
app.use("/counterStock", CounterStock);
app.use("/expense", Expense);
app.use("/stockTracker", StockTracker);
app.use("/soundApp", SoundApp);
app.use("/ledger", Ledger);
app.use("/ledgerGroup", LedgerGroup);
app.use("/purchaseInvoice", PurchaseINvoice);
app.use("/creditNote",CreditNotes)
app.use("/gstReturns", GSTReturns);
app.use("/hsn_code",HSNCode)
app.use("/", baseRouter)
app.get("/MinLevelUpdate", async (req, res, next) => {
  const response = await MinLevelUpdateAutomation();
  res.json({ success: true, message: "Updated", result: response });
});
app.get("/stream/:text", async (req, res) => {
  try {
    let { text } = await req.params;
    let extra =
      ", extra audio text, extra audio text, extra audio text, extra audio text, extra";
    const gtts = new gTTS(`${text?.replaceAll("_", " ")}` + extra, "en");
    res.set({ "Content-Type": "audio/mpeg" });
    gtts.stream().pipe(res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
app.get('/DeleteMyData-2/:anystring', (req, res) => {
  res.json({ success: true });
});

const MinLevelUpdateAutomation = async () => {
  let itemsList = [];

  let warehouseData = await WarehouseModel.find({});
  warehouseData = JSON.parse(JSON.stringify(warehouseData));
  warehouseData = warehouseData.filter((a) => a.warehouse_uuid);
  let itemsData = await ItemModel.find({}, { stock: 1, conversion: 1,item_uuid:1 });
  itemsData = JSON.parse(JSON.stringify(itemsData));

  for (let warehouseItem of warehouseData) {
    let time = new Date().getTime();
    let FiteenDaysTime = new Date(
      time - 86400000 * (warehouseItem?.compare_stock_level || 0)
    ).toDateString();
    FiteenDaysTime = new Date(FiteenDaysTime + " 00:00:00 AM").getTime();
    let ordersData = await OrderCompleted.find({
      "status.time": { $gt: FiteenDaysTime },
      warehouse_uuid: warehouseItem.warehouse_uuid,
    });
    // let cancelOrdersData = await CancelOrdersModel.find({
    // 	"status.time": { $gt: FiteenDaysTime },
    // 	"warehouse_uuid": warehouseItem.warehouse_uuid,
    // });
    let vocherData = await Vochers.find({
      created_at: { $gt: FiteenDaysTime },
      from_warehouse: warehouseItem.warehouse_uuid,
    });
    ordersData = JSON.parse(JSON.stringify(ordersData));
    ordersData = ordersData.filter(
      (a) =>
        a.status.filter((b) => +b.stage === 1 && b.time > FiteenDaysTime).length
    );
    // cancelOrdersData = JSON.parse(JSON.stringify(cancelOrdersData));
    // cancelOrdersData = cancelOrdersData.filter(
    // 	a => a.status.filter(b => +b.stage === 1 && b.time > FiteenDaysTime).length
    // );
    let items = [
      ...([].concat.apply(
        [],
        ordersData?.map((a) => a.item_details)
      ) || []),
      ...([].concat.apply(
        [],
        ordersData?.map((a) => a.processing_canceled)
      ) || []),
      ...([].concat.apply(
        [],
        ordersData?.map((a) => a.fulfillment)
      ) || []),
      ...([].concat.apply(
        [],
        vocherData?.map((a) => a.item_details)
      ) || []),
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
    ];

    let result = [];
    for (let item of items) {
      let itemData = itemsData.find((a) => a.item_uuid === item.item_uuid);
      var existing = result.filter(function (v, i) {
        return v.item_uuid === item.item_uuid;
      });

      if (existing.length === 0 && itemData) {
        let itemsFilteredData = items.filter(
          (a) => a.item_uuid === item.item_uuid
        );
        let b =
          itemsFilteredData.length > 1
            ? itemsFilteredData?.map((c) => +c.b || 0).reduce((c, d) => c + d)
            : +itemsFilteredData[0]?.b || 0;
        let p =
          itemsFilteredData.length > 1
            ? itemsFilteredData?.map((c) => +c.p || 0).reduce((c, d) => c + d)
            : +itemsFilteredData[0]?.p || 0;

        let obj = {
          ...item,
          stock: itemData?.stock || [],
          conversion: itemData?.conversion,
          b: parseInt(+b + +p / +itemData?.conversion),
          p: parseInt(+p % +itemData?.conversion),
        };
        result.push(obj);
      }
    }
    for (let item of result) {
      let min_level = +item.b * +item.conversion + +item.p;
      min_level = Math.floor(
        min_level *
          ((warehouseItem?.maintain_stock_days || 0) /
            (warehouseItem?.compare_stock_level || 1))
      );
      let stock = item.stock;
      stock = stock?.filter(
        (a) => a.warehouse_uuid === warehouseItem.warehouse_uuid
      )?.length
        ? stock.map((a) =>
            a.warehouse_uuid === warehouseItem.warehouse_uuid
              ? { ...a, min_level }
              : a
          )
        : stock?.length
        ? [
            ...stock,
            {
              warehouse_uuid: warehouseItem.warehouse_uuid,
              min_level,
              qty: 0,
            },
          ]
        : [
            {
              warehouse_uuid: warehouseItem.warehouse_uuid,
              min_level,
              qty: 0,
            },
          ];
      await ItemModel.updateOne({ item_uuid: item.item_uuid }, { stock });
      itemsList.push({ item_uuid: item.item_uuid, stock });
    }
  }

  const date = new Date();
  await DetailsModel.updateMany({}, { timer_run_at: date.getTime() });
  return itemsList;
};

// setTimeout(MinLevelUpdateAutomation, 5000);
setInterval(function () {
  // Set interval for checking
  var date = new Date(); // Create a Date object to find out what time it is
  if (date.getHours() === 2) {
    // Check the time
    MinLevelUpdateAutomation();
  }
}, 360000);
app.use(express.static("uploads"));
app.use("/soundApp/getFile", express.static(path.join(__dirname, "files")));

module.exports = app;

// let count = 0

// const main = async () => {
// 	try {
// 		const Stages = [1, 2, 3, 3.5, 4]
// 		console.log("starting")
// 		const collection = Orders

// 		const cursor = collection.find()

// 		for await (const doc of cursor) {
// 			console.log(count++)

// 			let stages = doc.status.map((s) => parseInt(s.stage)).sort((a, b) => a - b)
// 			if (stages.includes(5)) continue

// 			let filledStages = []

// 			for (let i = Stages.indexOf(stages[0]); i <= Stages.indexOf(stages.at(-1)); i++) {
// 				filledStages.push({
// 					stage: Stages[i].toString(),
// 					user_uuid: doc.status.at(-1).user_uuid,
// 					time: doc.status.at(-1).time
// 				})
// 			}

// 			if (JSON.stringify(filledStages) !== JSON.stringify(doc.status)) {
// 				await collection.updateOne({ _id: doc._id }, { $set: { status: filledStages } })
// 			}
// 		}
// 		console.log("ended")
// 	} catch (error) {
// 		console.error(error)
// 	}
// }