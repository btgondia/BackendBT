const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");
const Counter = require("../Models/TestCounter");
const OrderCompleted = require("../Models/OrderCompleted");
const Orders = require("../Models/Orders");
const Routes = require("../Models/Routes");
const Companies = require("../Models/Companies");
const Item = require("../Models/Item");
const ItemCategories = require("../Models/ItemCategories");

router.post("/postCounter", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = { ...value, counter_uuid: uuid() };
    if (!value.sort_order) {
      let response = await Counter.find({});
      response = JSON.parse(JSON.stringify(response));
      value.sort_order =
        Math.max(...response.map((o) => o?.sort_order || 0)) + 1 || 0;
    }
    
    let response = await Counter.create(value);
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Counter Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.delete("/deleteCounter", async (req, res) => {
  try {
    let { counter_uuid } = req.body;
    if (!counter_uuid) res.json({ success: false, message: "Invalid Data" });
    let response = { acknowledged: false };
    let orderData = await Orders.find({
      counter_uuid,
    });
    let CompleteOrderData = await OrderCompleted.find({
      counter_uuid,
    });
    if (!(orderData.length || CompleteOrderData.length))
      response = await Counter.deleteOne({ counter_uuid });
    if (response.acknowledged) {
      res.json({ success: true, result: response });
    } else
      res.status(404).json({ success: false, message: "Counter Not Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.get("/GetCounterList", async (req, res) => {
  try {
    let data = await Counter.find({});
    data = JSON.parse(JSON.stringify(data));
    let RoutesData = await Routes.find({
      route_uuid: { $in: data.map((a) => a.route_uuid) },
    });
    data = data.map((a) => ({
      ...a,
      route_title:
        RoutesData.find((b) => b.route_uuid === a.route_uuid)?.route_title ||
        "",
    }));
    if (data.length) res.json({ success: true, result: data });
    else res.json({ success: false, message: "Counters Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.get("/GetCounterData", async (req, res) => {
  try {
    let data = await Counter.find({});
   
    if (data.length) res.json({ success: true, result: data });
    else res.json({ success: false, message: "Counters Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.get("/getCounterSales/:days", async (req, res) => {
  try {
    let days = req.params.days;
    let time = new Date();
    time.setHours(12);
    time = new Date(time.setDate(time.getDate() - +days)).getTime();
    // time= time.getTime()
    let orderData = await OrderCompleted.find(
      !req.body.counter_uuid ? {} : { counter_uuid: req.body.counter_uuid }
    );

    orderData = JSON.parse(JSON.stringify(orderData));
    orderData = orderData?.filter(
      (order) =>
        order.status.filter((a) => +a.stage === 1 && a.time > time).length
    );
    let data = await Counter.find({});
    data = JSON.parse(JSON.stringify(data));

    let RoutesData = await Routes.find({
      route_uuid: { $in: data.map((a) => a.route_uuid) },
    });
    let CompaniesData = await Companies.find({});
    CompaniesData = JSON.parse(JSON.stringify(CompaniesData));
    let ItemsData = await Item.find({}, { item_uuid: 1, company_uuid: 1,conversion:1 });
    ItemsData = JSON.parse(JSON.stringify(ItemsData));
    let result = [];
    for (let item of data) {
      let counterOrders = orderData.filter(
        (a) => a.counter_uuid === item.counter_uuid
      );
      let sales = [];
      for (let Company of CompaniesData) {
        let orderItems = [].concat
          .apply(
            [],
            counterOrders?.map((a) => a.item_details)
          )
          ?.filter(
            (a) =>
              Company.company_uuid ===
              ItemsData?.find((b) => b.item_uuid === a.item_uuid)?.company_uuid
          )
          ?.map(
            (a) =>
              +(
                +a.b +
                +(
                  ItemsData?.find((b) => b.item_uuid === a.item_uuid)
                    ?.conversion || 0
                ) +
                +a.p
              ) * +a.price
          );
        let value =
          orderItems.length > 1
            ? orderItems.reduce((a, b) => a + b)
            : orderItems?.length
            ? orderItems[0]
            : 0;
        value =
          value - Math.floor(value) !== 0
            ? value
                .toString()
                .match(new RegExp("^-?\\d+(?:.\\d{0," + (2 || -1) + "})?"))[0]
            : value;
        sales.push({ company_uuid: Company?.company_uuid, value });
      }
      let obj = {
        ...item,
        route_title:
          RoutesData.find((b) => b.route_uuid === item.route_uuid)
            ?.route_title || "",
        sales,
      };
      result.push(obj);
    }

    if (result.length) res.json({ success: true, result });
    else res.json({ success: false, message: "Counters Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/GetCounter", async (req, res) => {
  try {
    let data = await Counter.findOne({ counter_uuid: req.body.counter_uuid });

    if (data) res.json({ success: true, result: data });
    else res.json({ success: false, message: "Counter Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.put("/putCounter", async (req, res) => {
  try {
    let result = [];
    for (let value of req.body) {
      if (!value) res.json({ success: false, message: "Invalid Data" });

      value = Object.keys(value)
        .filter((key) => key !== "_id")
        .reduce((obj, key) => {
          obj[key] = value[key];
          return obj;
        }, {});
      
      let response = await Counter.updateOne(
        { counter_uuid: value.counter_uuid },
        value
      );
      if (response.acknowledged) {
        result.push({ success: true, result: value });
      } else result.push({ success: false, message: "Counter Not created" });
    }
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/CalculateLines", async (req, res) => {
  try {
    let { days, type } = req.body;
    var today = new Date();
    var priorDate = new Date(
      new Date().setDate(today.getDate() - (days || 0))
    ).getTime();

    let orderData = await OrderCompleted.find({
      "status.time": { $gt: priorDate },
    });
    orderData = JSON.parse(JSON.stringify(orderData));
    orderData = orderData.filter((a) =>
      a.status.find((b) => +b.stage === 1 && +b.time > priorDate)
    );
    let itemsJsons = [].concat.apply(
      [],
      orderData.map((a) => a.item_details)
    );
    let ItemsData = await Item.find({
      item_uuid: { $in: itemsJsons.map((a) => a.item_uuid) },
    }, { item_uuid: 1, company_uuid: 1, category_uuid: 1,conversion:1 });
    ItemsData = JSON.parse(JSON.stringify(ItemsData));

    let counterData = await Counter.find({});
    counterData = JSON.parse(JSON.stringify(counterData));
    let CompaniesData =
      type === "company"
        ? await Companies.find({})
        : await ItemCategories.find({});
    CompaniesData = JSON.parse(JSON.stringify(CompaniesData));
    let index = 0;
    for (let counter of counterData) {
      let counterorder = orderData.filter(
        (a) => a.counter_uuid === counter.counter_uuid
      );

      let average_lines = [];
      for (let company of CompaniesData) {
        let data = [];
        for (let order of counterorder) {
          let count = 0;
          for (let item of order.item_details) {
            let ItemData = ItemsData.find(
              (a) =>
                a.item_uuid === item.item_uuid &&
                (type === "company"
                  ? a.company_uuid === company.company_uuid
                  : a.category_uuid === company.category_uuid)
            );

            if (ItemData) {
              count = count + 1;
            }
          }
          if (count) {
            data = [...data, count];
          }
        }
        if (data.length) {
          average_lines = [
            ...average_lines,
            {
              [type === "company" ? "company_uuid" : "category_uuid"]:
                company[type === "company" ? "company_uuid" : "category_uuid"],
              lines:
                data.length > 1
                  ? data.reduce((a, b) => a + b) / data.length
                  : data[0],
            },
          ];
        } else {
          average_lines = [
            ...average_lines,
            {
              [type === "company" ? "company_uuid" : "category_uuid"]:
                company[type === "company" ? "company_uuid" : "category_uuid"],
              lines: 0,
            },
          ];
        }
      }
      if (average_lines.length) {
        await Counter.updateMany(
          { counter_uuid: counter.counter_uuid },
          {
            [type === "company"
              ? "average_lines_company"
              : "average_lines_category"]: average_lines,
          }
        );
      }
      if (counter.counter_code === "5043.2") {
      }
      index = index + 1;
      if (index === counterData.length) {
        res.json({ success: true, result: "" });
      }
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.put("/putCounter/sortOrder", async (req, res) => {
  try {
    const counters = await req.body;
    if (!counters?.[0])
      return res.status(204).json({ message: "Empty Payload" });
    const result = { succeed: [], failed: [] };
    let count = 0;
    const respond = () =>
      ++count === counters?.length ? res.json(result) : "";

    counters?.forEach(async (counter) => {
      try {
        const res = await Counter.findOneAndUpdate(
          { counter_uuid: counter.counter_uuid },
          counter
        );
        if (res) result.succeed.push(counter.counter_uuid);
        else result.failed.push({ failed: counter.counter_uuid });
        respond();
      } catch (error) {
        result.failed.push({
          failed: counter.counter_uuid,
          error: error.message,
        });
        respond();
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
