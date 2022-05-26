const cors = require("cors");
const express = require("express");
const connectDB = require("./config/mongoDb");
const morgan = require("morgan");
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
connectDB();
app = express();
app.use(
  cors({
    origin: ["*", "http://api.btgondia.com/", "http://btgondia.com/"],
    credentials: true,
    optionSuccessStatus: 200,
  })
);
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});
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

module.exports = app;
