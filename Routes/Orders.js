const express = require("express");
const router = express.Router();
const Orders = require("../Models/Orders");
const Details = require("../Models/Details");
const Counters = require("../Models/Counters");
const OrderCompleted = require("../Models/OrderCompleted");
const Item = require("../Models/Item");
const Receipts = require("../Models/Receipts");
const OutStanding = require("../Models/OutStanding");
const Incentive = require("../Models/Incentive");
const Users = require("../Models/Users");
const IncentiveStatment = require("../Models/IncentiveStatment");
const SignedBills = require("../Models/SignedBills");

router.post("/postOrder", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });

    console.log(value);
    let invoice_number = await Details.findOne({});
    let orderStage = value.status
      ? value?.status?.length > 1
        ? +value.status.map((c) => +c.stage).reduce((c, d) => Math.max(c, d))
        : +value?.status[0]?.stage
      : "";
    let response;
    let incentives = 0;
    let counterGroupsData = await Counters.findOne({
      counter_uuid: value.counter_uuid,
    });
    let itemsData = await Item.find({
      $in: {
        item_uuid: value.item_details.map((a) => a.item_uuid),
      },
    });
    let incentiveData = await Incentive.find({ status: 1 });
    incentiveData = JSON.parse(JSON.stringify(incentiveData));
    let user_uuid = value.status.find((c) => +c.stage === 1)?.user_uuid;
    incentiveData = incentiveData
      .filter((a) => a.users.filter((b) => b === user_uuid).length)
      .filter(
        (a) =>
          a.counters.filter((b) => b === value.counter_uuid).length ||
          a.counter_groups.filter((b) =>
            counterGroupsData?.counter_group_uuid?.find((c) => b === c)
          ).length
      );
    for (let incentive_item of incentiveData) {
      let eligibleItems = value.item_details.filter(
        (a) =>
          +a.status !== 3 &&
          (a.b || a.p) &&
          (incentive_item.items.find((b) => b === a.item_uuid) ||
            incentive_item.item_groups.find(
              (b) =>
                itemsData
                  .find((c) => c.item_uuid === a.item_uuid)
                  ?.item_group_uuid.filter((d) => b === d).length
            ))
      );
      if (+incentive_item.min_range <= eligibleItems.length) {
        let amt = eligibleItems.length * incentive_item.amt;

        incentives = +incentives + amt;
      }
    }

    if (+orderStage === 4 || +orderStage === 5) {
      response = await OrderCompleted.create({
        ...value,
        invoice_number: invoice_number.next_invoice_number || 0,
        order_status: "R",
        entry: 0,
      });
    } else
      response = await Orders.create({
        ...value,
        invoice_number: invoice_number.next_invoice_number || 0,
      });
    if (response) {
      await Details.updateMany(
        {},
        { next_invoice_number: +invoice_number.next_invoice_number + 1 }
      );
      res.json({ success: true, result: response, incentives });
    } else res.json({ success: false, message: "Order Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
// router.put("/putOrder", async (req, res) => {
//   try {
//     let value = req.body;
//     if (!value) res.json({ success: false, message: "Invalid Data" });

//     value = Object.keys(value)
//       .filter((key) => key !== "_id")
//       .reduce((obj, key) => {
//         obj[key] = value[key];
//         return obj;
//       }, {});

//     console.log(value, value.orderStatus === "edit");
//     let response = {};
//     if (value.orderStatus === "edit") {
//       response = await OrderCompleted.updateOne(
//         { order_uuid: value.order_uuid },
//         { ...value }
//       );
//     } else {
//       response = await Orders.updateOne(
//         { order_uuid: value.order_uuid },
//         { ...value }
//       );
//     }
//     if (response.acknowledged) {
//       res.json({ success: true, result: value });
//     } else res.json({ success: false, message: "Order Not updated" });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err });
//   }
// });
// router.put("/reCalculation", async (req, res) => {
//   try {
//     let value = req.body;
//     if (!value) res.json({ success: false, message: "Invalid Data" });
//     let result = [];
//     let orderData = await OrderCompleted.find(
//       value.order_uuid ? { order_uuid: value.order_uuid } : {}
//     );
//     for (let order of orderData) {
//       let item_details = [];
//       for (let item of order.item_details) {
//         let price = 0;
//         let itemData = await Item.findOne({ item_uuid: item.item_uuid });
//         let qty = +itemData.conversion * (+item.b || 0) + (item.p||0) + (item.free||0);
//         let desc =
//           +item.charges_discount.length > 1
//             ? +item.charges_discount
//                 .map((a) => a.value)
//                 .reduce((a, b) => a * (100 / (100 - b) || 0))
//             : +item.charges_discount.length
//             ? 100 / (100 - item.charges_discount[0].value)
//             : 1;
//         price = (+item.item_total * desc) / qty;

//         item.price = (price||0).toFixed(2);
//         item_details.push(item);
//       }
//       // console.log(item_details);
//       let response = await OrderCompleted.updateMany(
//         { order_uuid: order.order_uuid },
//         { item_details }
//       );
//       if (response.acknowledged)
//       result.push(order);
//     }

//     if (result.length) {
//       res.json({ success: true, result: "Success" });
//     } else res.json({ success: false, message: "Order Not updated" });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err });
//   }
// });
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
      let orderStage = value.status
        ? value?.status?.length > 1
          ? +value.status.map((c) => +c.stage).reduce((c, d) => Math.max(c, d))
          : +value?.status[0]?.stage
        : "";

      console.log(value, orderStage);

      if (
        +orderStage === 4 ||
        +orderStage === 5 ||
        value?.item_details?.length === 0
      ) {
        // console.log("length", value?.item_details?.length);
        //  data = await OrderCompleted.findOne({ order_uuid: value.order_uuid });
        // console.log("Old Data",data)

        let data = await OrderCompleted.create({ ...value, entry: 0 });
        await Orders.deleteOne({ order_uuid: value.order_uuid });
        // console.log("New DAta", data);
        if (+orderStage === 4) {
          let counterGroupsData = await Counters.findOne({
            counter_uuid: value.counter_uuid,
          });
          let itemsData = await Item.find({
            $in: {
              item_uuid: value.item_details.map((a) => a.item_uuid),
            },
          });
          let incentiveData = await Incentive.find({ status: 1 });
          incentiveData = JSON.parse(JSON.stringify(incentiveData));
          let user_uuid = value.status.find((c) => +c.stage === 1)?.user_uuid;
          incentiveData = incentiveData
            .filter((a) => a.users.filter((b) => b === user_uuid).length)
            .filter(
              (a) =>
                a.counters.filter((b) => b === value.counter_uuid).length ||
                a.counter_groups.filter((b) =>
                  counterGroupsData?.counter_group_uuid?.find((c) => b === c)
                ).length
            );
          for (let incentive_item of incentiveData) {
            let eligibleItems = value.item_details.filter(
              (a) =>
                +a.status !== 3 &&
                (a.b || a.p) &&
                (incentive_item.items.find((b) => b === a.item_uuid) ||
                  incentive_item.item_groups.find(
                    (b) =>
                      itemsData
                        .find((c) => c.item_uuid === a.item_uuid)
                        ?.item_group_uuid.filter((d) => b === d).length
                  ))
            );
            if (+incentive_item.min_range <= eligibleItems.length) {
              let userData = await Users.findOne({ user_uuid });
              userData = JSON.parse(JSON.stringify(userData));
              let amt = eligibleItems.length * incentive_item.amt;
              let incentive_balance = +(userData.incentive_balance || 0) + amt;

              await Users.updateMany({ user_uuid }, { incentive_balance });
              let time = new Date();
              let statment = await IncentiveStatment.create({
                user_uuid,
                order_uuid: value.order_uuid,
                counter_uuid: value.counter_uuid,
                incentive_uuid: incentive_item.incentive_uuid,
                time: time.getTime(),
                amt,
              });
              console.log(statment);
            }
          }
        }

        if (data) response.push(data);
      } else {
        let data = await Orders.updateOne(
          { order_uuid: value.order_uuid },
          value
        );
        if (data.acknowledged) response.push(value);
        else{
          data = await OrderCompleted.updateOne(
            { order_uuid: value.order_uuid },
            value
          );
          if (data.acknowledged) response.push(value);
        }
      }
    }
    if (response.length) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Order Not updated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.get("/getSignedBills", async (req, res) => {
  try {
    let data = await SignedBills.find({ status: 0 });
    data = JSON.parse(JSON.stringify(data));
    data = data.filter((a) => a.order_uuid);
    let response = [];
    for (let item of data) {
      let orderData = await OrderCompleted.findOne({
        order_uuid: item.order_uuid,
      });
      orderData = JSON.parse(JSON.stringify(orderData));

      let userData = await Users.findOne({
        user_uuid: item.user_uuid === "240522" ? 0 : item.user_uuid,
      });
      userData = JSON.parse(JSON.stringify(userData));

      let counterData = await Counters.findOne({
        counter_uuid: orderData?.counter_uuid || 0,
      });
      counterData = JSON.parse(JSON.stringify(counterData));

      let user_title =
        item.user_uuid === "240522" ? "Admin" : userData.user_title;
      let order_grandtotal = orderData?.orderData_grandtotal || 0;
      let invoice_number = orderData?.invoice_number || 0;
      let counter_title = counterData?.counter_title || "";
      response.push({
        ...item,
        user_title,
        order_grandtotal,
        counter_title,
        invoice_number,
      });
    }

    res.json({
      success: true,
      result: response,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.get("/getPendingEntry", async (req, res) => {
  try {
    let data = await OrderCompleted.find({ entry: 0 });
    data = JSON.parse(JSON.stringify(data));
    let receiptData = await Receipts.find({
      order_uuid: { $in: data.map((a) => a.order_uuid) },
    });
    receiptData = JSON.parse(JSON.stringify(receiptData));
    let outstandindData = await OutStanding.find({
      order_uuid: { $in: data.map((a) => a.order_uuid) },
    });
    outstandindData = JSON.parse(JSON.stringify(outstandindData));

    res.json({
      success: true,
      result: data.map((order) => ({
        ...order,
        modes:
          receiptData?.find((b) => b.order_uuid === order.order_uuid)?.modes ||
          [],
        unpaid:
          outstandindData?.find((b) => b.order_uuid === order.order_uuid)
            ?.amount || 0,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/putCompleteSignedBills", async (req, res) => {
  try {
    let value = req.body;
    console.log(value);
    let time = new Date();
    let data = await SignedBills.updateOne(
      { order_uuid: value.order_uuid },
      { status: value.status, received_time: time.getTime() }
    );
    if (data.acknowledged) {
      res.json({
        success: true,
        result: data,
      });
    } else
      res.status(404).json({
        success: false,
        result: data,
      });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/putCompleteOrder", async (req, res) => {
  try {
    let value = req.body;
    console.log(value);
    let data = await OrderCompleted.updateOne(
      { order_uuid: value.order_uuid },
      value
    );
    if (data.acknowledged) {
      res.json({
        success: true,
        result: data,
      });
    } else
      res.status(404).json({
        success: false,
        result: data,
      });
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
      result: data
        .filter((a) => a.item_details.length)
        .map((a) => ({
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
router.get("/GetOrderAllRunningList", async (req, res) => {
  try {
    let data = await Orders.find({});
    data = JSON.parse(JSON.stringify(data));
    data = data.filter((a) => a.order_uuid && a.hold !== "Y");
    let counterData = await Counters.find({
      counter_uuid: {
        $in: data.filter((a) => a.counter_uuid).map((a) => a.counter_uuid),
      },
    });
    res.json({
      success: true,
      result: data
        .filter((a) => a.item_details.length)
        .map((a) => ({
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
router.get("/GetOrderHoldRunningList", async (req, res) => {
  try {
    let data = await Orders.find({});
    data = JSON.parse(JSON.stringify(data));
    data = data.filter((a) => a.order_uuid && a.hold === "Y");
    let counterData = await Counters.find({
      counter_uuid: {
        $in: data.filter((a) => a.counter_uuid).map((a) => a.counter_uuid),
      },
    });
    res.json({
      success: true,
      result: data
        .filter((a) => a.item_details.length)
        .map((a) => ({
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
router.get("/GetOrder/:order_uuid", async (req, res) => {
  try {
    let data = await Orders.findOne({ order_uuid: req.params.order_uuid });
    data = JSON.parse(JSON.stringify(data));

    res.json({
      success: true,
      result: data,
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
      .map((a) => {
        let counter =
          counterData?.find((b) => b?.counter_uuid === a?.counter_uuid) || {};
        return {
          ...a,
          counter_title: a.counter_uuid ? counter?.counter_title : "",
          sort_order: a.counter_uuid ? counter?.sort_order : "",
        };
      })
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
      .map((a) => {
        let counter =
          counterData?.find((b) => b?.counter_uuid === a?.counter_uuid) || {};
        return {
          ...a,
          counter_title: a.counter_uuid ? counter?.counter_title : "",
          sort_order: a.counter_uuid ? counter?.sort_order : "",
        };
      })
      ?.filter(
        (a) =>
          (a.status.length > 1
            ? +a.status.reduce((c, d) => Math.max(+c.stage, +d.stage)) === 2
            : +a?.status[0]?.stage === 2) && a.item_details.length
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
      .map((a) => {
        let counter =
          counterData?.find((b) => b?.counter_uuid === a?.counter_uuid) || {};
        return {
          ...a,
          counter_title: a.counter_uuid ? counter?.counter_title : "",
          credit_allowed: a.counter_uuid ? counter?.credit_allowed : "",
          sort_order: a.counter_uuid ? counter?.sort_order : "",
        };
      })
      ?.filter(
        (a) =>
          (a.status.length > 1
            ? +a.status
                .map((c) => +c.stage)
                .reduce((c, d) => Math.max(c, d)) === 3
            : +a?.status[0]?.stage === 3) && a.item_details.length
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
        (!req.body.counter_uuid ||
          order.counter_uuid === req.body.counter_uuid) &&
        order.status.filter(
          (a) => +a.stage === 1 && a.time > value.startDate && a.time < endDate
        ).length
    );

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
    }));
    console.log(response, endDate);
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Order Not Found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/getTripCompletedOrderList", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    console.log(value);

    let response = await OrderCompleted.find({ trip_uuid: value.trip_uuid });
    console.log(response);
    response = JSON.parse(JSON.stringify(response));
    let receiptData = await Receipts.find({
      order_uuid: response.map((a) => a.order_uuid),
    });

    receiptData = JSON.parse(JSON.stringify(receiptData));
    let outstandindData = await OutStanding.find({
      order_uuid: response.map((a) => a.order_uuid),
    });

    outstandindData = JSON.parse(JSON.stringify(outstandindData));
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
      modes:
        receiptData.find((b) => b.order_uuid === order.order_uuid)?.modes || [],
      unpaid:
        outstandindData.find((b) => b.order_uuid === order.order_uuid)
          ?.amount || 0,
    }));

    if (response.length) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Order Not Found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.post("/getCounterLedger", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    console.log(value);
    let endDate = +value.endDate + 86400000;
    console.log(endDate, value.startDate);
    let receiptsData = await Receipts.find({
      counter_uuid: req.body.counter_uuid,
    });
    receiptsData = JSON.parse(JSON.stringify(receiptsData));
    receiptsData = receiptsData.filter(
      (a) => a.time > value.startDate && a.time < endDate
    );
    let response = await OrderCompleted.find({
      counter_uuid: req.body.counter_uuid,
    });
    response = JSON.parse(JSON.stringify(response));
    response = response.filter(
      (order) =>
        order.status.filter(
          (a) => +a.stage === 1 && a.time > value.startDate && a.time < endDate
        ).length
    );
    response = [...receiptsData, ...response];
    response = response.map((order) => ({
      ...order,
      reference_number: order?.invoice_number || order.receipt_number || "-",
      order_date:
        order?.status?.find((a) => +a.stage === 1)?.time || order?.time || "",

      amt1: order?.order_grandtotal || "",
      amt2: order?.modes?.length
        ? order?.modes?.map((a) => a.amt || 0).reduce((a, b) => a + b)
        : "",
    }));
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
      )
      .filter(
        (a) => !value.counter_uuid || a.counter_uuid === value.counter_uuid
      );
    response = response.map((a) => ({
      ...a,
      auto_added: a.auto_added.map((b) => {
        let item = a.delivery_return?.find((c) => c.item_uuid === b.item_uuid);

        if (item) {
          return { ...b, b: +b + item.b, p: +b.p + item.p };
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
        mrp: a.mrp,
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
      deliver_return_percentage: (
        Math.abs(
          ((+a.deliver_returnB * (+a.conversion || 1) || 0) +
            a.deliver_returnP) *
            100
        ) /
          (+a.salesB * (+a.conversion || 0) +
            a.salesP +
            (a.deliver_returnB * a.conversion + a.deliver_returnP) +
            (a.processing_canceledB * a.conversion + a.processing_canceledP) ||
            1) || 0
      ).toFixed(2),
      processing_canceled_percentage: (
        ((a.processing_canceledB * a.conversion + a.processing_canceledP) *
          100) /
          (a.salesB * a.conversion +
            a.salesP +
            (a.deliver_returnB * a.conversion + a.deliver_returnP) +
            ((+a.processing_canceledB || 0) * (+a.conversion || 1) +
              (+a.processing_canceledP || 0)) || 1) || 0
      ).toFixed(2),

      auto_added_percentage: (
        ((a.auto_addedB * a.conversion + a.auto_addedP) * 100) /
          (a.salesB * a.conversion + a.salesP || 1) || 0
      ).toFixed(2),
      deliver_return_amt: (
        Math.abs(
          a.sales_amt * (+a.conversion * +a.deliver_returnB + a.deliver_returnP)
        ) || 0
      ).toFixed(2),
      processing_canceled_amt: (
        a.sales_amt *
          (+a.conversion *
            (+a.processing_canceledB + a.processing_canceledP)) || 0
      ).toFixed(2),
      auto_added_amt: (
        a.sales_amt * (+a.conversion * +a.auto_addedB + a.auto_addedP) || 0
      ).toFixed(2),
    }));
    if (FinalData) {
      res.json({ success: true, result: FinalData });
    } else res.json({ success: false, message: "Items Not Found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

module.exports = router;
