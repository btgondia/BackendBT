const express = require("express");
const router = express.Router();
const { v4: uuid } = require("uuid");
const CounterStockModel = require("../Models/counter_stock");
const Details = require("../Models/Details");
const CompleteOrder = require("../Models/OrderCompleted");
const Item = require("../Models/Item");
const Orders = require("../Models/Orders");
const Counters = require("../Models/Counters");
const Users = require("../Models/Users");
router.post("/add", async (req, res) => {
  try {
    const {
      session_uuid = uuid(),
      counter_uuid,
      user_uuid,
      category_uuid = [],
      details,
    } = req.body;
    let timestamp = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
    let counterStockExists = await CounterStockModel.findOne({
      counter_uuid,
      timestamp: timestamp,
    });
    counterStockExists = JSON.parse(JSON.stringify(counterStockExists));
    if (counterStockExists) {
      let userArray = counterStockExists.user_uuid;
      userArray = userArray.find((a) => a === user_uuid)
        ? userArray
        : [...userArray, user_uuid];
      let category_array = counterStockExists.category_uuid;
      category_array = [...category_array, ...category_uuid];
      category_array = [...new Set(category_array)];
      let detailsArray = counterStockExists.details;
      for (let detail of details) {
        let detailIndex = detailsArray.findIndex(
          (a) => a.item_uuid === detail.item_uuid
        );
        if (detailIndex >= 0) {
          if (detail.pcs !== 0) {
            detailsArray[detailIndex].pcs = detail.pcs;
          }
        } else {
          detailsArray.push(detail);
        }
      }
      await CounterStockModel.updateMany(
        { counter_uuid, timestamp: timestamp },
        {
          user_uuid: userArray,
          details: detailsArray,
          category_uuid: category_array,
        }
      );
      res.json({
        success: true,
        counter_stock: await CounterStockModel.findOne({ counter_uuid }),
      });
    } else {
      const counter_stock = new CounterStockModel({
        session_uuid,
        counter_uuid,
        user_uuid,
        details,
        category_uuid,
        timestamp,
      });
      await counter_stock.save();
      res.json({ success: true, counter_stock });
    }
  } catch (err) {
    console.log(err);
    res.json({ success: false, message: err.message });
  }
});
router.post("/getStocksItem", async (req, res) => {
  try {
    const { counter_uuid = "", category_uuid = [] } = req.body;
    let daysDetails = await Details.find(
      {},
      { counter_stock_maintain_days: 1, counter_compare_stock_days: 1 }
    );
    if (daysDetails.length) daysDetails = daysDetails[0];
    daysDetails = JSON.parse(JSON.stringify(daysDetails));
    let itemsData = await Item.find(
      { category_uuid: { $in: category_uuid }, status: 1 },
      { item_uuid: 1, item_title: 1, item_price: 1, conversion: 1 }
    );
    const counter_stock = await CounterStockModel.find({
      counter_uuid,
      category_uuid: { $in: category_uuid },
    });
    let listItems = [];
    for (let itemData of itemsData) {
      let counter_stock_item = counter_stock.filter((stock) =>
        stock.details.find((detail) => detail.item_uuid === itemData.item_uuid)
      );

      let initialValue = null;
      let finalValue = 0;

      if (counter_stock_item.length) {
        let initialDay = 0;

        do {
          let day = daysDetails.counter_compare_stock_days + initialDay;
          let timestampOfBeforeDay = new Date().setDate(
            new Date().getDate() - day
          );

          let counter_stock_item_day = counter_stock_item.filter((stock) => {
            let data =
              new Date(
                new Date(stock.timestamp).setHours(0, 0, 0, 0)
              ).getTime() ===
              new Date(
                new Date(timestampOfBeforeDay).setHours(0, 0, 0, 0)
              ).getTime();
            // 
            return data;
          });

          if (counter_stock_item_day.length) {
            let greatestTimestamp =
              counter_stock_item_day.length > 1
                ? counter_stock_item_day.reduce((a, b) =>
                    a.timestamp > b.timestamp ? a : b
                  )
                : counter_stock_item_day[0];

            initialValue = greatestTimestamp.details.filter(
              (detail) => detail.item_uuid === itemData.item_uuid
            )[0].pcs;
          } else {
            if (initialDay === 0) {
              initialDay = 1;
            } else if (initialDay > 0) {
              initialDay = -initialDay;
            } else {
              initialDay = -initialDay + 1;
            }
          }
        } while (initialValue === null);

        let timestampOfBeforeDay = new Date(
          new Date().setHours(0, 0, 0, 0)
        ).getTime();

        let counter_stock_item_day = counter_stock_item.filter((stock) => {
          let data =
            new Date(
              new Date(stock.timestamp).setHours(0, 0, 0, 0)
            ).getTime() === timestampOfBeforeDay;

          // 
          return data;
        });

        if (counter_stock_item_day.length) {
          //get greatest tmestamp stock
          let greatestTimestamp =
            counter_stock_item_day.length > 1
              ? counter_stock_item_day.reduce((a, b) =>
                  a.timestamp > b.timestamp ? a : b
                )
              : counter_stock_item_day[0];
          finalValue = greatestTimestamp.details.filter(
            (detail) => detail.item_uuid === itemData.item_uuid
          )[0].pcs;
        }

        let firstDay = +daysDetails.counter_compare_stock_days + initialDay;
        let timestampOfBeforeDayFirst = new Date().setDate(
          new Date().getDate() - firstDay
        );

        let completedOrder = await CompleteOrder.find(
          {
            counter_uuid: counter_uuid,
            "item_details.item_uuid": itemData.item_uuid,
          },
          { item_details: 1, status: 1 }
        );
        completedOrder = JSON.parse(JSON.stringify(completedOrder));
        completedOrder = completedOrder.filter((a) => {
          let data =
            new Date(
              new Date(a.status[a.status.length - 1].time).setHours(0, 0, 0, 0)
            ).getTime() >=
            new Date(
              new Date(timestampOfBeforeDayFirst).setHours(0, 0, 0, 0)
            ).getTime();
          return data;
        });
        let quantityItemInCompleteOrder = 0;
        for (let order of completedOrder) {
          orderItem = order.item_details.filter(
            (a) => a.item_uuid === itemData.item_uuid
          )[0];
          quantityItemInCompleteOrder +=
            orderItem.b * +itemData.conversion + +orderItem.p;
        }

        let deliveredOrder = await Orders.find(
          {
            counter_uuid: counter_uuid,
            "item_details.item_uuid": itemData.item_uuid,
            "status.stage": "3",
          },
          { item_details: 1, status: 1 }
        );
        deliveredOrder = JSON.parse(JSON.stringify(deliveredOrder));
        deliveredOrder = deliveredOrder.filter((a) => {
          let data =
            new Date(
              new Date(a.status?.find((b) => b.stage == 3)?.time).setHours(
                0,
                0,
                0,
                0
              )
            ).getTime() >=
            new Date(
              new Date(timestampOfBeforeDayFirst).setHours(0, 0, 0, 0)
            ).getTime();
          return data;
        });
        let quantityItemInDeliveredOrder = 0;
        for (let order of deliveredOrder) {
          orderItem = order.item_details.filter(
            (a) => a.item_uuid === itemData.item_uuid
          )[0];
          quantityItemInDeliveredOrder +=
            orderItem.b * +itemData.conversion + +orderItem.p;
        }
        let dayDifference =
          +daysDetails.counter_compare_stock_days + initialDay;
        if (dayDifference === 0) dayDifference = 1;

        listItems.push({
          item_uuid: itemData.item_uuid,
          initialValue,
          finalValue,
          projection:
            (((initialValue || 0) -
              (finalValue || 0) +
              quantityItemInCompleteOrder +
              quantityItemInDeliveredOrder) *
              (daysDetails.counter_stock_maintain_days || 0)) /
              dayDifference -
            (finalValue || 0),
        });
      }
    }

    res.json({ success: true, result: listItems });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});
router.post("/getCounterStocksReport", async (req, res) => {
  try {
    const { counter_uuid = 0, startDate, endDate } = req.body;

    const counter_stock = await CounterStockModel.find(counter_uuid?{ counter_uuid, timestamp: {
      $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)).getTime(),
      $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)).getTime(),
    }, }:{ timestamp: {
      $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)).getTime(),
      $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)).getTime(),
    },});
   

    let data = [];
    for (let stock of counter_stock) {
      const userData = await Users.find(
        { user_uuid: stock.user_uuid },
        { user_uuid: 1, user_title: 1 }
      );
      const itemsDetails = await Item.find(
        { item_uuid: { $in: stock.details.map((a) => a.item_uuid) } },
        { item_uuid: 1, item_title: 1, item_price: 1 }
      );
      const counterData = await Counters.findOne(
        { counter_uuid: stock.counter_uuid },
        { counter_uuid: 1, counter_title: 1 }
      );
      let details = [];
      for (let detail of stock.details) {
        const itemData = itemsDetails.find(
          (a) => a.item_uuid === detail.item_uuid
        );
        if (detail.pcs !== 0) {
          details.push({
            item_uuid: detail.item_uuid,
            item_title: itemData.item_title,
            item_price: itemData.item_price,
            pcs: detail.pcs,
          });
        }
      }
      data.push({
        counter_uuid: stock.counter_uuid,
        counter_title: counterData?.counter_title??"",
        user_uuid: stock.user_uuid,
        user_title: userData.map((a) => a.user_title).join(","),
        timestamp: stock.timestamp,
        details: details,
        session_uuid: stock.session_uuid,
      });
    }

    res.json({ success: true, result: data });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

router.post("/deleteCounterStock", async (req, res) => {
  try {
    const { session_uuid = "" } = req.body;
    if (session_uuid === "") {
      throw new Error("Session uuid is required");
    }
    await CounterStockModel.deleteOne({ session_uuid });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: err.message });
  }
});

module.exports = router;
