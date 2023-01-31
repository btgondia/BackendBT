const cors = require("cors");
const express = require("express");
const connectDB = require("./config/mongoDb");
const morgan = require("morgan");
const gTTS = require("gtts");
const Routes = require("./Routes/Routes");
const ItemCategories = require("./Routes/ItemCategories");
const Companies = require("./Routes/Companies");
const CounterGroup = require("./Routes/CounterGroup");
const ItemGroup = require("./Routes/ItemGroup");
const Counter = require("./Routes/Counters");
const Users = require("./Routes/Users");
const Item = require("./Routes/Item");
const ItemModel = require("./Models/Item");
const Vouchers = require("./Routes/Vouchers");
const Warehouse = require("./Routes/Warehouse");
const WarehouseModel = require("./Models/Warehouse");
const Tasks = require("./Routes/Tasks");
const AutoBill = require("./Routes/AutoBill");
const Orders = require("./Routes/Orders");
const Trips = require("./Routes/Trips");
const UserActivity = require("./Routes/UserActivity");
const PaymentModes = require("./Routes/PaymentModes");
const Receipts = require("./Routes/Receipts");
const Outstanding = require("./Routes/Outstanding");
const Details = require("./Routes/Details");
const DetailsModel = require("./Models/Details");
var bodyParser = require("body-parser");
const Incentive = require("./Routes/Incentives");
const IncentiveStatment = require("./Routes/IncentiveStatment");
const OrderCompleted = require("./Models/OrderCompleted");
const CancelOrders = require("./Routes/CancelOrder");
const CancelOrdersModel = require("./Models/CancelOrders");
const Vochers = require("./Models/Vochers");
const CollectionTags = require("./Routes/collectionTag");
const Counter_scheme = require("./Routes/counter_schemes");
connectDB();
app = express();
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

// app.use(express.json());
app.use(bodyParser.json({ limit: "100mb" }));
app.use(
  bodyParser.urlencoded({
    limit: "100mb",
    extended: true,
    parameterLimit: 50000,
  })
);
app.use(morgan("dev"));

app.use("/routes", Routes);
app.use("/itemCategories", ItemCategories);
app.use("/companies", Companies);
app.use("/counterGroup", CounterGroup);
app.use("/itemGroup", ItemGroup);
app.use("/counters", Counter);
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

const MinLevelUpdateAutomation = async () => {
  let itemsList = [];
  console.log("Fuction");

  let warehouseData = await WarehouseModel.find({});
  warehouseData = JSON.parse(JSON.stringify(warehouseData));
  warehouseData = warehouseData.filter((a) => a.warehouse_uuid);
  let itemsData = await ItemModel.find({});
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
    let cancelOrdersData = await CancelOrdersModel.find({
      "status.time": { $gt: FiteenDaysTime },
      warehouse_uuid: warehouseItem.warehouse_uuid,
    });
    let vocherData = await Vochers.find({
      created_at: { $gt: FiteenDaysTime },
      from_warehouse: warehouseItem.warehouse_uuid,
    });
    ordersData = JSON.parse(JSON.stringify(ordersData));
    ordersData = ordersData.filter(
      (a) =>
        a.status.filter((b) => +b.stage === 1 && b.time > FiteenDaysTime).length
    );
    cancelOrdersData = JSON.parse(JSON.stringify(cancelOrdersData));
    cancelOrdersData = cancelOrdersData.filter(
      (a) =>
        a.status.filter((b) => +b.stage === 1 && b.time > FiteenDaysTime).length
    );
    console.log(warehouseItem);
    let items = [
      ...([].concat.apply(
        [],
        ordersData?.map((a) => a.item_details)
      ) || []),
      ...([].concat.apply(
        [],
        ordersData?.map((a) => a.processing_canceled)
      ) || []),
      // ...([].concat.apply(
      //   [],
      //   ordersData?.map((a) => a.delivery_return)
      // ) || []),
      ...([].concat.apply(
        [],
        cancelOrdersData?.map((a) => a.processing_canceled)
      ) || []),
      ...([].concat.apply(
        [],
        ordersData?.map((a) => a.fulfillment)
      ) || []),
      ...([].concat.apply(
        [],
        cancelOrdersData?.map((a) => a.fulfillment)
      ) || []),
      // ...([].concat.apply(
      //   [],
      //   cancelOrdersData?.map((a) => a.delivery_return)
      // ) || []),
      ...([].concat.apply(
        [],
        vocherData?.map((a) => a.item_details)
      ) || []),
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
      const response = await ItemModel.updateOne(
        { item_uuid: item.item_uuid },
        { stock }
      );
      itemsList.push({ item_uuid: item.item_uuid, stock });
    }
  }
  var date = new Date(); // Create a Date object to find out what time it is

  const response = await DetailsModel.updateMany(
    {},
    { timer_run_at: date.getTime() }
  );
  console.log(response);
  return itemsList;
};
// setTimeout(MinLevelUpdateAutomation, 5000);
setInterval(function () {
  // Set interval for checking
  var date = new Date(); // Create a Date object to find out what time it is
  if (date.getHours() === 2) {
    console.log(date.getHours());
    // Check the time
    MinLevelUpdateAutomation();
  }
}, 360000);
module.exports = app;
