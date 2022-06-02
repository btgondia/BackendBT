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
const AutoBill = require("./Routes/AutoBill");
const Orders = require("./Routes/Orders");
const Trips = require("./Routes/Trips");
const UserActivity = require("./Routes/UserActivity");
const PaymentModes = require("./Routes/PaymentModes");
const Receipts = require("./Routes/Receipts");
connectDB();
app = express();
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan("dev"));
app.use("/routes", Routes);
app.use("/itemCategories", ItemCategories);
app.use("/companies", Companies);
app.use("/counterGroup", CounterGroup);
app.use("/itemGroup", ItemGroup);
app.use("/counters", Counter);
app.use("/users", Users);
app.use("/items", Item);
app.use("/autoBill", AutoBill);
app.use("/orders", Orders);
app.use("/trips", Trips);
app.use("/userActivity", UserActivity);
app.use("/paymentModes", PaymentModes);
app.use("/receipts", Receipts);

app.get("/stream/:text", async (req, res) => {
  try {
    let { text, } = await req.params;
    let extra = ', extra audio text, extra audio text, extra audio text, extra audio text, extra'
    const gtts = new gTTS(`${text?.replaceAll('_', " ")}` + extra, 'en');
    res.set({ 'Content-Type': 'audio/mpeg' });
    gtts.stream().pipe(res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = app;