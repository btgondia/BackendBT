const express = require("express");
const router = express.Router();
const Orders = require("../Models/Orders");
const Details = require("../Models/Details");
const Counters = require("../Models/Counters");
const OrderCompleted = require("../Models/OrderCompleted");
const Item = require("../Models/Item");

router.post("/postOrder", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    console.log(value);
    let invoice_number = await Details.findOne({});

    let response = await Orders.create({
      ...value,
      invoice_number: invoice_number.next_invoice_number || 0,
      order_status: "R",
    });
    if (response) {
      await Details.updateMany(
        {},
        { next_invoice_number: +invoice_number.next_invoice_number + 1 }
      );
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Order Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/putOrder", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = Object.keys(value)
      .filter((key) => key !== "_id")
      .reduce((obj, key) => {
        obj[key] = value[key];
        return obj;
      }, {});

    console.log(value);

    let response = await Orders.updateOne(
      { order_uuid: value.order_uuid },
      value
    );

    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Order Not updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/putOrders", async (req, res) => {
  try {
    let response = [];
    for (let value of req.body) {
      if (!value) res.json({ success: false, message: "Invalid Data" });
      value = Object.keys(value)
        .filter((key) => key !== "_id")
        .reduce((obj, key) => {
          obj[key] = value[key];
          return obj;
        }, {});
      let orderStage =
        value.status.length > 1
          ? +value.status.map((c) => +c.stage).reduce((c, d) => Math.max(c, d))
          : +value?.status[0]?.stage;
      console.log(value, orderStage);

      if (+orderStage === 4) {
        await Orders.deleteOne({ order_uuid: value.order_uuid }, value);
        let data = await OrderCompleted.create(value);
        if (data) response.push(data);
      } else {
        let data = await Orders.updateOne(
          { order_uuid: value.order_uuid },
          value
        );
        if (data.acknowledged) response.push(value);
      }
    }
    if (response.length) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Order Not updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.get("/GetOrderRunningList", async (req, res) => {
  try {
    let data = await Orders.find({ order_status: "R" });
    data = JSON.parse(JSON.stringify(data));

    let counterData = await Counters.find({
      counter_uuid: {
        $in: data.filter((a) => a.counter_uuid).map((a) => a.counter_uuid),
      },
    });
    res.json({
      success: true,
      result: data.map((a) => ({
        ...a,
        counter_title: a.counter_uuid
          ? counterData.find((b) => b.counter_uuid === a.counter_uuid)
              ?.counter_title
          : "",
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/GetOrderProcessingList", async (req, res) => {
  try {
    let data = [];
    let { trip_uuid } = req.body;

    data = await Orders.find({});
    data = JSON.parse(JSON.stringify(data));
    if (+trip_uuid === 0) data = data.filter((a) => !a.trip_uuid);
    else data = data.filter((a) => a.trip_uuid === trip_uuid);
    let counterData = await Counters.find({
      counter_uuid: {
        $in: data.filter((a) => a.counter_uuid).map((a) => a.counter_uuid),
      },
    });
    result = data
      .map((a) => ({
        ...a,
        counter_title: a.counter_uuid
          ? counterData.find((b) => b.counter_uuid === a.counter_uuid)
              ?.counter_title
          : "",
      }))
      ?.filter((a) =>
        a.status.length > 1
          ? +a.status.reduce((c, d) => Math.max(+c.stage, +d.stage)) === 1
          : +a?.status[0]?.stage === 1
      );

    res.json({
      success: true,
      result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/GetOrderCheckingList", async (req, res) => {
  try {
    let data = [];
    let { trip_uuid } = req.body;

    data = await Orders.find({});
    data = JSON.parse(JSON.stringify(data));
    if (+trip_uuid === 0) data = data.filter((a) => !a.trip_uuid);
    else data = data.filter((a) => a.trip_uuid === trip_uuid);
    let counterData = await Counters.find({
      counter_uuid: {
        $in: data.filter((a) => a.counter_uuid).map((a) => a.counter_uuid),
      },
    });
    result = data
      .map((a) => ({
        ...a,
        counter_title: a.counter_uuid
          ? counterData.find((b) => b.counter_uuid === a.counter_uuid)
              ?.counter_title
          : "",
      }))
      ?.filter((a) =>
        a.status.length > 1
          ? +a.status.reduce((c, d) => Math.max(+c.stage, +d.stage)) === 2
          : +a?.status[0]?.stage === 2
      );

    res.json({
      success: true,
      result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/GetOrderDeliveryList", async (req, res) => {
  try {
    let data = [];
    let { trip_uuid } = req.body;

    data = await Orders.find({});
    data = JSON.parse(JSON.stringify(data));
    if (+trip_uuid === 0) data = data.filter((a) => !a.trip_uuid);
    else data = data.filter((a) => a.trip_uuid === trip_uuid);
    let counterData = await Counters.find({
      counter_uuid: {
        $in: data.filter((a) => a.counter_uuid).map((a) => a.counter_uuid),
      },
    });
    result = data
      .map((a) => ({
        ...a,
        counter_title: a.counter_uuid
          ? counterData.find((b) => b.counter_uuid === a.counter_uuid)
              ?.counter_title
          : "",
      }))
      ?.filter((a) =>
        a.status.length > 1
          ? +a.status.map((c) => +c.stage).reduce((c, d) => Math.max(c, d)) ===
            3
          : +a?.status[0]?.stage === 3
      );

    res.json({
      success: true,
      result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/getCompleteOrderList", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    console.log(value);
    let endDate = +value.endDate + 86400000;
    console.log(endDate, value.startDate);
    let response = await OrderCompleted.find({});
    response = JSON.parse(JSON.stringify(response));
    response = response.filter(
      (order) =>
        order.status.filter(
          (a) => +a.stage === 1 && a.time > value.startDate && a.time < endDate
        ).length
    );
    let counterData = await Counters.find({
      counter_uuid: { $in: response.map((a) => a.counter_uuid) },
    });

    response = response.map((order) => ({
      ...order,
      invoice_number: order.invoice_number,
      order_date: order.status.find((a) => +a.stage === 1)?.time,
      delivery_date: order.status.find((a) => +a.stage === 4)?.time,
      qty:
        (order?.item_details?.length > 1
          ? order.item_details.map((a) => a.b).reduce((a, b) => +a + b)
          : order?.item_details?.length
          ? order?.item_details[0]?.b
          : 0) +
        ":" +
        (order?.item_details?.length > 1
          ? order.item_details.map((a) => a.p).reduce((a, b) => +a + b)
          : order?.item_details?.length
          ? order?.item_details[0]?.p
          : 0),
      amt: order.order_grandtotal || 0,
      counter_title: counterData.find(
        (a) => a.counter_uuid === order.counter_uuid
      )?.counter_title,
    }));
    console.log(response, endDate);
    if (response.length) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Order Not Found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/getOrderItemReport", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    console.log(value);
    let endDate = +value.endDate + 86400000;
    let response = await OrderCompleted.find({});
    let counterData = await Counters.find({});
    response = JSON.parse(JSON.stringify(response));
    counterData = JSON.parse(JSON.stringify(counterData));
    response = response
      .filter(
        (order) =>
          order.status.filter(
            (a) =>
              +a.stage === 1 && a.time > value.startDate && a.time < endDate
          ).length
      )
      .filter(
        (a) =>
          !value.counter_group_uuid ||
          counterData.filter(
            (b) =>
              a.counter_uuid === b.counter_uuid &&
              b.counter_group_uuid.filter((c) => c === value.counter_group_uuid)
                .length
          ).length
      );
    response = response.map((a) => ({
      ...a,
      auto_added: a.auto_added.map((b) => {
        let item = a?.deliver_return?.find((c) => c.item_uuid === b.item_uuid);
        if (item) {
          return { ...b, b: +b - item.b.b, p: +b.p - item.p };
        } else return b;
      }),
    }));
    let sales = [].concat
      .apply(
        [],
        response.map((a) => a.item_details)
      )
      ?.filter((a) => a?.item_uuid);
    let deliver_return = [].concat
      .apply(
        [],
        response.map((a) => a.delivery_return)
      )
      ?.filter((a) => a?.item_uuid);
    let processing_canceled = [].concat
      .apply(
        [],
        response.map((a) => a.processing_canceled)
      )
      ?.filter((a) => a?.item_uuid);
    let auto_added = [].concat
      .apply(
        [],
        response.map((a) => a.auto_added)
      )
      ?.filter((a) => a?.item_uuid);
    let items = [
      ...sales,
      ...deliver_return,
      ...processing_canceled,
      ...auto_added,
    ];
    let itemsData = await Item.find({
      item_uuid: { $in: items.map((a) => a.item_uuid) },
    });
    itemsData = JSON.parse(JSON.stringify(itemsData));

    let data = [];
    for (let a of itemsData.filter(
      (a) => !value.company_uuid || a.company_uuid === value.company_uuid
    )) {
      let salesData = sales.filter((b) => b.item_uuid === a.item_uuid);
      let deliver_returnData = deliver_return.filter(
        (b) => b.item_uuid === a.item_uuid
      );
      let processing_canceledData = processing_canceled.filter(
        (b) => b.item_uuid === a.item_uuid
      );
      let auto_addedData = auto_added.filter(
        (b) => b.item_uuid === a.item_uuid
      );

      let obj = {
        conversion: a.conversion,
        item_price: a.item_price,
        item_uuid: a.item_uuid,
        item_title: a.item_title,
        sales_amt:
          salesData.length > 1
            ? salesData.map((b) => b.item_total || 0).reduce((a, b) => +a + b)
            : salesData.length
            ? salesData[0].item_total || 0
            : 0,
        salesB:
          salesData.length > 1
            ? salesData.map((b) => b.b || 0).reduce((a, b) => +a + b)
            : salesData.length
            ? salesData[0].b || 0
            : 0,
        salesP:
          salesData.length > 1
            ? salesData.map((b) => b.p || 0).reduce((a, b) => +a + b)
            : salesData.length
            ? salesData[0].p || 0
            : 0,
        deliver_returnB: Math.abs(
          deliver_returnData.length > 1
            ? deliver_returnData.map((b) => b.b || 0).reduce((a, b) => +a + b)
            : deliver_returnData.length
            ? deliver_returnData[0].b || 0
            : 0
        ),
        deliver_returnP: Math.abs(
          deliver_returnData.length > 1
            ? deliver_returnData.map((b) => b.p || 0).reduce((a, b) => +a + b)
            : deliver_returnData.length
            ? deliver_returnData[0].p || 0
            : 0
        ),
        processing_canceledB:
          processing_canceledData.length > 1
            ? processing_canceledData
                .map((b) => b.b || 0)
                .reduce((a, b) => +a + b)
            : processing_canceledData.length
            ? processing_canceledData[0].b || 0
            : 0,
        processing_canceledP:
          processing_canceledData.length > 1
            ? processing_canceledData
                .map((b) => b.p || 0)
                .reduce((a, b) => +a + b)
            : processing_canceledData.length
            ? processing_canceledData[0].p || 0
            : 0,
        auto_addedB:
          auto_addedData.length > 1
            ? auto_addedData.map((b) => b.b || 0).reduce((a, b) => +a + b)
            : auto_addedData.length
            ? auto_addedData[0].b || 0
            : 0,
        auto_addedP:
          auto_addedData.length > 1
            ? auto_addedData.map((b) => b.p || 0).reduce((a, b) => +a + b)
            : auto_addedData.length
            ? auto_addedData[0].p || 0
            : 0,
      };
      console.log(salesData, obj);
      data.push(obj);
    }
    let FinalData = data.map((a) => ({
      ...a,
      sales:
        +a.salesB +
        parseInt(+a.salesP / +a.conversion) +
        ":" +
        (+a.salesP % +a.conversion),
      deliver_return:
        +a.deliver_returnB +
        parseInt(+a.deliver_returnP / +a.conversion) +
        ":" +
        (+a.deliver_returnP % +a.conversion),
      processing_canceled:
        +a.processing_canceledB +
        parseInt(+a.processing_canceledP / +a.conversion) +
        ":" +
        (+a.processing_canceledP % +a.conversion),
      auto_added:
        +a.auto_addedB +
        parseInt(+a.auto_addedP / +a.conversion) +
        ":" +
        (+a.auto_addedP % +a.conversion),
      deliver_return_percentage:
        Math.abs(
          ((+a.deliver_returnB * (+a.conversion || 1) || 0) +
            a.deliver_returnP) *
            100
        ) /
        (+a.salesB * (+a.conversion || 0) +
          a.salesP +
          (a.deliver_returnB * a.conversion + a.deliver_returnP) +
          (a.processing_canceledB * a.conversion + a.processing_canceledP) ||
          1),
      processing_canceled_percentage:
        ((a.processing_canceledB * a.conversion + a.processing_canceledP) *
          100) /
        (a.salesB * a.conversion +
          a.salesP +
          (a.deliver_returnB * a.conversion + a.deliver_returnP) +
          ((+a.processing_canceledB || 0) * (+a.conversion || 1) +
            (+a.processing_canceledP || 0)) || 1),

      auto_added_percentage:
        ((a.auto_addedB * a.conversion + a.auto_addedP) * 100) /
        (a.salesB * a.conversion +
          a.salesP +
          (a.deliver_returnB * a.conversion + a.deliver_returnP) +
          (a.processing_canceledB * a.conversion + a.processing_canceledP) ||
          1),
      deliver_return_amt: Math.abs(
        a.sales_amt * (+a.conversion * +a.deliver_returnB + a.deliver_returnP)
      ),
      processing_canceled_amt:
        a.sales_amt *
        (+a.conversion * +a.processing_canceledB + a.processing_canceledP),
      auto_added_amt:
        a.sales_amt * (+a.conversion * +a.auto_addedB + a.auto_addedP),
    }));
    if (FinalData) {
      res.json({ success: true, result: FinalData });
    } else res.json({ success: false, message: "Items Not Found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

module.exports = router;
