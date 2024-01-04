const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");
const AutoBill = require("../Models/AutoBill");
const Companies = require("../Models/Companies");
const CounterGroup = require("../Models/CounterGroup");
const Counters = require("../Models/Counters");
const Item = require("../Models/Item");
const ItemCategories = require("../Models/ItemCategories");
const Routes = require("../Models/Routes");
const User = require("../Models/Users");
const PaymentModes = require("../Models/PaymentModes");
const Warehouse = require("../Models/Warehouse");
const OrderCompleted = require("../Models/OrderCompleted");
const CancelOrders = require("../Models/CancelOrders");
const Orders = require("../Models/Orders");
const Users = require("../Models/Users");

router.post("/postUser", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = { ...value, user_uuid: uuid() };

    console.log(value);
    let response = await User.create(value);
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "User Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err?.message });
  }
});

router.put("/putUser", async (req, res) => {
  try {
    let value = req.body;
    if (!value) return res.json({ success: false, message: "Invalid Data" });

    delete value?._id;
    const response = await User.updateOne(
      { user_uuid: value.user_uuid },
      value
    );

    if (response) res.json({ success: true, result: response });
    else res.json({ success: false, message: "User Not updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err?.message });
  }
});

router.get("/GetUserList", async (req, res) => {
  try {
    let data = await User.find({});

    if (data.length) res.json({ success: true, result: data });
    else res.json({ success: false, message: "Users Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err?.message });
  }
});

router.get("/GetActiveUserList", async (req, res) => {
  try {
    let data = await User.find({ status: 1 });

    if (data.length) res.json({ success: true, result: data });
    else res.json({ success: false, message: "Users Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err?.message });
  }
});

router.get("/GetNormalUserList", async (req, res) => {
  try {
    let data = await User.find({ user_type: 1 });

    if (data.length) res.json({ success: true, result: data });
    else res.json({ success: false, message: "Users Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err?.message });
  }
});
router.get("/GetAdminUserList", async (req, res) => {
  try {
    let data = await User.find({ user_type: "0", status: 1 });

    if (data.length) res.json({ success: true, result: data });
    else res.json({ success: false, message: "Users Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err?.message });
  }
});

router.get("/GetUser/:user_uuid", async (req, res) => {
  try {
    let data = await User.findOne({
      user_uuid: req.params.user_uuid,
      status: 1,
    });
    console.log(req.params.user_uuid.data);
    if (data) res.json({ success: true, result: data });
    else res.json({ success: false, message: "Not Authorized to Log-in" });
  } catch (err) {
    res.status(500).json({ success: false, message: err?.message });
  }
});

router.post("/login", async (req, res) => {
  const login_username = req.body.login_username;
  const login_password = req.body.login_password;
  try {
    const result = await User.findOne({ login_username, login_password });
    if (result) {
      if (+result.status === 1) res.json({ success: true, result });
      else res.json({ success: false, message: "Not Authorized to Log-in" });
    } else {
      res.json({ success: false, message: "Invalid User Name and Password" });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err?.message });
  }
});

router.get("/getDetails", async (req, res) => {
  try {
    let user = await Users.findOne({});
    let autobill = await AutoBill.find({});
    autobill = autobill.filter((a) => a.auto_uuid);
    let companies = await Companies.find({ status: 1 });
    companies = companies.filter((a) => a.company_uuid);
    let counter_groups = await CounterGroup.find({});
    counter_groups = counter_groups.filter((a) => a.counter_group_uuid);
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
        location_coords: 1,
      }
    );
    counter = counter.filter((a) => a.counter_uuid);
    let item_category = await ItemCategories.find({});
    item_category = item_category.filter((a) => a.category_uuid);
    let items = await Item.find(
      {},
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
        stock: 1,
        created_at: 1,
      }
    );
    items = items.filter(
      (a) =>
        a.item_uuid &&
        companies?.find((i) => i?.company_uuid === a?.company_uuid)
    );
    let routes = await Routes.find({});
    routes = routes.filter((a) => a.route_uuid);
    let payment_modes = await PaymentModes.find({});
    payment_modes = payment_modes.filter((a) => a.mode_uuid);
    let warehouse = await Warehouse.find({});
    warehouse = warehouse.filter((a) => a.warehouse_uuid);
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
    };
    res.json({
      success: true,
      result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err?.message });
  }
});

router.post("/performance-summary", async (req, res) => {
  try {
    const { from_date, to_date,to,from } = req.body;
   
    console.log({
      from_date,
      to_date,
      from_date_Data: from,
      to_date_Data: to,
    });
    let allUsers = await Users.find({});
    let runningOrders = await Orders.find({
      "status.time": { $gte: from_date, $lte: to_date },
    },{status:1,invoice_number:1,order_grandtotal:1,counter_uuid:1});
    runningOrders = JSON.parse(JSON.stringify(runningOrders));
    let completeOrders = await OrderCompleted.find({
      "status.time": { $gte: from_date, $lte: to_date },
    },{status:1,invoice_number:1,order_grandtotal:1,counter_uuid:1});
    completeOrders = JSON.parse(JSON.stringify(completeOrders));
    let AllOrders = [...runningOrders, ...completeOrders];
    let counter_data = await Counters.find({
      counter_uuid: { $in: AllOrders.map((a) => a.counter_uuid) },
    });

    let result = [];
    for (let user of allUsers) {
      let placedOrders = AllOrders.filter((a) =>
        a.status.find(
          (b) =>
            b.user_uuid === user.user_uuid &&
            +b.stage === 1 &&
            new Date(b.time).getDate() >= from &&
            new Date(b.time).getDate() <= to
        )
      );
      let processedOrders = AllOrders.filter((a) =>
        a.status.filter(
          (b) =>
            b.user_uuid === user.user_uuid &&
            +b.stage === 2 &&
            new Date(b.time).getDate() >= from &&
            new Date(b.time).getDate() <= to
        ).length
      );

      let checkedOrders = AllOrders.filter((a) =>
        a.status.find(
          (b) =>
            b.user_uuid === user.user_uuid &&
            +b.stage === 3 &&
            new Date(b.time).getDate() >= from &&
            new Date(b.time).getDate() <=to
        )
      );
      let deliveredOrders = AllOrders.filter((a) =>
        a.status.find(
          (b) =>
            b.user_uuid === user.user_uuid &&
            +b.stage === 3.5 &&
            new Date(b.time).getDate() >= from &&
            new Date(b.time).getDate() <= to
        )
      );
      let completedOrders = AllOrders.filter((a) =>
        a.status.find(
          (b) =>
            b.user_uuid === user.user_uuid &&
            +b.stage === 4 &&
            new Date(b.time).getDate() >= from &&
            new Date(b.time).getDate() <= to
        )
      );
      let placed = {
        count: placedOrders.length,
        amount: placedOrders.reduce((a, b) => a + +b.order_grandtotal, 0),
        orders: placedOrders.map((a) => {
          let counter = counter_data.find(
            (b) => b.counter_uuid === a.counter_uuid
          );
          return {
            date: a.status.find((b) => +b.stage === 1).time,
            counter_title: counter?.counter_title || "",
            invoice_number: a.invoice_number,
            order_grandtotal: a.order_grandtotal,
          };
        }),
      };
      let processed = {
        count: processedOrders.length,
        amount: processedOrders.reduce((a, b) => a + +b.order_grandtotal, 0),
        orders: processedOrders.map((a) => {
          let counter = counter_data.find(
            (b) => b.counter_uuid === a.counter_uuid
          );
          return {
            date: a.status.find((b) => +b.stage === 2).time,
            counter_title: counter?.counter_title || "",
            invoice_number: a.invoice_number,
            order_grandtotal: a.order_grandtotal,
          };
        }),
      };
      let checked = {
        count: checkedOrders.length,
        amount: checkedOrders.reduce((a, b) => a + +b.order_grandtotal, 0),
        orders: checkedOrders.map((a) => {
          let counter = counter_data.find(
            (b) => b.counter_uuid === a.counter_uuid
          );
          return {
            date: a.status.find((b) => +b.stage === 3).time,
            counter_title: counter?.counter_title || "",
            invoice_number: a.invoice_number,
            order_grandtotal: a.order_grandtotal,
          };
        }),
      };
      let delivered = {
        count: deliveredOrders.length,
        amount: deliveredOrders.reduce((a, b) => a + +b.order_grandtotal, 0),
        orders: deliveredOrders.map((a) => {
          let counter = counter_data.find(
            (b) => b.counter_uuid === a.counter_uuid
          );
          return {
            date: a.status.find((b) => +b.stage === 3.5).time,
            counter_title: counter?.counter_title || "",
            invoice_number: a.invoice_number,
            order_grandtotal: a.order_grandtotal,
          };
        }),
      };
      let completed = {
        count: completedOrders.length,
        amount: completedOrders.reduce((a, b) => a + +b.order_grandtotal, 0),
        orders: completedOrders.map((a) => {
          let counter = counter_data.find(
            (b) => b.counter_uuid === a.counter_uuid
          );
          return {
            date: a.status.find((b) => +b.stage === 4).time,
            counter_title: counter?.counter_title || "",
            invoice_number: a.invoice_number,
            order_grandtotal: a.order_grandtotal,
          };
        }),
      };
      let total = {
        count:
          placed.count +
          processed.count +
          checked.count +
          delivered.count +
          completed.count,
        amount:
          placed.amount +
          processed.amount +
          checked.amount +
          delivered.amount +
          completed.amount,
      };
      if (total.count)
        result.push({
          user_uuid: user.user_uuid,
          user_title: user.user_title,
          placed,
          processed,
          checked,
          delivered,
          completed,
          total,
        });
    }

    if (result.length) res.json({ success: true, result });
    else res.json({ success: false, message: "No Data Found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err?.message?.message });
  }
});

module.exports = router;
