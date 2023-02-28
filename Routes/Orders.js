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
const { v4: uuid } = require("uuid");
const Trips = require("../Models/Trips");
const Routes = require("../Models/Routes");
const CancelOrders = require("../Models/CancelOrders");
const Voucher = require("../Models/Vochers");
const WarehouseModel = require("../Models/Warehouse");
const Vochers = require("../Models/Vochers");
const whatsapp_notifications = require("../Models/whatsapp_notifications");
const Notification_logs = require("../Models/notification_log");
const axios = require("axios");
const Campaigns = require("../Models/Campaigns");
const fs = require("fs");
const puppeteer = require("puppeteer");
var FormData = require("form-data");
const ItemCategories = require("../Models/ItemCategories");
// const browser = puppeteer.launch({ args: ["--no-sandbox"] });
const CallMsg = async ({
  counterData = {},
  WhatsappNotification = {},
  value = {},
}) => {
  try {
    let data = [];
    let file = [];
    if (WhatsappNotification.checkbox && value?.order_uuid) {
      if (value.order_uuid) {
        try {
          let orderpdf = await fs.promises.access(
            "./uploads/N" +
              (value.invoice_number || "") +
              "-" +
              (value?.order_uuid || "") +
              ".pdf"
          );
        } catch (err) {
          // Create a browser instance
          try {
            const browser = await puppeteer.launch({ args: ["--no-sandbox"] });

            // Create a new page
            const page = await browser.newPage();

            // Website URL to export as pdf
            const website_url = "https://btgondia.com/pdf/" + value.order_uuid;
            await page.goto(website_url, { waitUntil: "networkidle0" });
            await page.emulateMediaType("screen");

            const pdf = await page.pdf({
              path:
                "./uploads/N" +
                (value.invoice_number || "") +
                "-" +
                (value?.order_uuid || "") +
                ".pdf",
              margin: {
                top: "100px",
                right: "50px",
                bottom: "100px",
                left: "50px",
              },
              printBackground: true,
              format: "A4",
            });
          } catch (err) {
            console.log(err);
          }
        }
      }
    }
    for (let contact of counterData?.mobile) {
      if (
        contact.mobile &&
        contact?.lable?.find((a) => a.type === "wa" && +a.varification)
      ) {
        let messages = [];
        for (let messageobj of WhatsappNotification.message) {
          let message = "";
          if (messageobj?.type === "text") {
            message = messageobj.text
              ?.replace(/{counter_title}/g, counterData?.counter_title || "")
              ?.replace(
                /{short_link}/g,
                "https://btgondia.com/counter/" + counterData?.short_link || ""
              )
              ?.replace(/{invoice_number}/g, value?.invoice_number || "")
              ?.replace(
                /{amount}/g,
                value.order_grandtotal || value?.amount || value?.amt || ""
              );
            messages.push({ text: message });
          } else {
            fs.access(
              "./uploads/" + (messageobj.uuid || "") + ".png",
              (err) => {
                if (err) {
                  console.log(err);
                  return;
                }
                file.push(messageobj.uuid + ".png");

                messages.push({
                  file: messageobj.uuid + ".png",
                  sendAsDocument: false,
                  caption: messageobj?.caption || "",
                });
              }
            );

            // messages.push({ file: messageobj.uuid + ".png" });
          }
        }
        if (WhatsappNotification.checkbox && value?.order_uuid) {
          fs.access(
            "./uploads/N" +
              (value.invoice_number || "") +
              "-" +
              (value?.order_uuid || "") +
              ".pdf",
            (err) => {
              if (err) {
                console.log(err);
                return;
              }
              file.push(
                "N" +
                  (value.invoice_number || "") +
                  "-" +
                  (value?.order_uuid || "") +
                  ".pdf"
              );

              messages.push({
                file:
                  "N" +
                  (value.invoice_number || "") +
                  "-" +
                  (value?.order_uuid || "") +
                  ".pdf",
                sendAsDocument: true,
                caption: value.invoice_number || "",
              });
            }
          );
        }
        data.push({
          contact: contact.mobile,
          messages,
        });
        await Notification_logs.create({
          contact: contact.mobile,
          notification_uuid: value.notifiacation_uuid,
          messages,
          invoice_number: value.invoice_number,
          created_at: new Date().getTime(),
        });
      }
    }
    // FileSystem.writeFile(
    //   "remote-test.json",
    //   JSON.stringify(data),
    //   (error, data) => {
    //     if (error) throw error;
    //   }
    // );
    // let filedata = await FileSystem.promises.readFile("./remote-test.json");
    // let Imagedata = await FileSystem.promises.readFile("./uploads/images.jpg");
    // let formData=new FormData()
    // formData.append("file",filedata)
    // formData.append("file",Imagedata)
    // console.log(formData)

    if (file.length) {
      const form = new FormData();
      form.append("instructions", JSON.stringify(data));
      for (let item of file) {
        form.append("file", fs.createReadStream("./uploads/" + (item || "")));
      }
      const result = await axios.post(
        "http://15.207.39.69:2000/send",
        form,
        form.getHeaders()
      );
      console.log(result.data, data);
    } else {
      let msgResponse = await axios({
        url: "http://15.207.39.69:2000/sendMessage",
        method: "post",
        data,
      });
      console.log(data, msgResponse);
    }
  } catch (err) {
    console.log(err);
  }
};
const CheckPdf = async (data) => {
  console.log(data.length);
  // for (let order of data) {
  //   if (order.order_uuid) {
  //     try {
  //       let orderpdf = await fs.promises.access(
  //         "./uploads/N" +
  //           (order.invoice_number || "") +
  //           "-{" +
  //           (order?.order_uuid || "") +
  //           "}.pdf"
  //       );
  //     } catch (err) {
  //       // Create a browser instance
  //       try {

  //         // Create a new page
  //         const page = await browser.newPage();
  //         // Website URL to export as pdf
  //         const website_url = "https://btgondia.com/pdf/" + order.order_uuid;
  //         await page.goto(website_url, { waitUntil: "networkidle0" });
  //         await page.emulateMediaType("screen");
  //         console.log(
  //           "./uploads/N" +
  //             (order.invoice_number || "") +
  //             "-{" +
  //             (order?.order_uuid || "") +
  //             "}.pdf"
  //         );
  //         const pdf = await page.pdf({
  //           path:
  //             "./uploads/N" +
  //             (order.invoice_number || "") +
  //             "-{" +
  //             (order?.order_uuid || "") +
  //             "}.pdf",
  //           margin: {
  //             top: "100px",
  //             right: "50px",
  //             bottom: "100px",
  //             left: "50px",
  //           },
  //           printBackground: true,
  //           format: "A4",
  //         });
  //       } catch (err) {
  //         console.log(err);
  //       }
  //     }
  //   }
  // }
};
router.post("/postOrder", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });

    value = { ...value, order_uuid: uuid() };

    if (!value.warehouse_uuid) {
      let counterData = await Counters.findOne(
        {
          counter_uuid: value.counter_uuid,
        },
        { route_uuid: 1 }
      );
      if (counterData?.route_uuid) {
        let routeData = await Routes.findOne({ route_uuid: value.route_uuid });
        if (routeData?.warehouse_uuid) {
          value = { ...value, warehouse_uuid: routeData?.warehouse_uuid };
        }
      }
    }
    console.log(value);
    let invoice_number = await Details.findOne({});
    let orderStage = value.status
      ? value?.status?.length > 1
        ? +value.status.map((c) => +c.stage).reduce((c, d) => Math.max(c, d))
        : +value?.status[0]?.stage
      : "";
    let response;
    let incentives = 0;
    let counterGroupsData = await Counters.findOne(
      {
        counter_uuid: value.counter_uuid,
      },
      { counter_group_uuid: 1 }
    );
    let itemsData = await Item.find({
      item_uuid: {
        $in: value.item_details.map((a) => a.item_uuid),
      },
    });
    let incentiveData = await Incentive.find({
      status: 1,
    });
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
    let rangeOrderIncentive = incentiveData.filter(
      (a) =>
        a.users.filter((b) => b === user_uuid).length &&
        a.type === "range-order"
    );

    let rangeItemIntensive = incentiveData.filter(
      (a) =>
        a.users.filter((b) => b === user_uuid).length &&
        a.type === "item-incentive"
    );
    for (let incentive_item of rangeOrderIncentive) {
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
    for (let incentive_item of rangeItemIntensive) {
      if (incentive_item.value) {
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

        let amt = 0;

        if (incentive_item.calculation === "amt" && incentive_item.value) {
          for (let item of eligibleItems) {
            amt = +amt + (incentive_item.value / 100) * item.item_total;
          }
        }
        if (incentive_item.calculation === "qty" && incentive_item.value) {
          for (let item of eligibleItems) {
            let itemData = await Item.findOne({
              item_uuid: item.item_uuid,
            });
            amt =
              +amt +
              ((+item.b * +itemData.conversion || 0) + item.p) *
                +incentive_item.value;
          }
        }

        incentives = +incentives + +amt.toFixed(2);
      }
    }
    if (+orderStage === 4 || +orderStage === 5) {
      let next_receipt_number = await Details.find({});
      console.log(next_receipt_number[0].next_receipt_number);
      next_receipt_number = next_receipt_number[0].next_receipt_number;
      let time = new Date();
      await Receipts.create({
        ...value,
        time: time.getTime(),
        receipt_number: next_receipt_number,
        invoice_number: invoice_number.next_invoice_number || 0,
      });
      next_receipt_number = "R" + (+next_receipt_number.match(/\d+/)[0] + 1);
      await Details.updateMany({}, { next_receipt_number });

      if (value.OutStanding) {
        let time = new Date();
        let outstandingObj = {
          time: time.getTime(),
          counter_uuid: value.counter_uuid,
          user_uuid: value.user_uuid,
          order_uuid: value.order_uuid,
          invoice_number: invoice_number.next_invoice_number || 0,
          status: 0,
          amount: value.OutStanding,
        };
        await OutStanding.create(outstandingObj);
        await SignedBills.create({
          ...outstandingObj,
          time_stamp: outstandingObj.time,
        });
      }
      if (value.warehouse_uuid) {
        let warehouse_uuid = value.warehouse_uuid;
        console.log(warehouse_uuid);
        for (let item of value.item_details) {
          let itemData = await Item.findOne({
            item_uuid: item.item_uuid,
          });
          itemData = JSON.parse(JSON.stringify(itemData));
          let stock = itemData.stock;
          console.log("Stock", stock);
          let qty =
            +item.b * +itemData.conversion + +item.p + (+item.free || 0);
          stock = stock?.filter((a) => a.warehouse_uuid === warehouse_uuid)
            ?.length
            ? stock.map((a) =>
                a.warehouse_uuid === warehouse_uuid
                  ? { ...a, qty: a.qty - qty }
                  : a
              )
            : stock?.length
            ? [
                ...stock,
                {
                  warehouse_uuid: warehouse_uuid,
                  min_level: 0,
                  qty: -qty,
                },
              ]
            : [
                {
                  warehouse_uuid: warehouse_uuid,
                  min_level: 0,
                  qty: -qty,
                },
              ];
          console.log("Stock", stock);
          await Item.updateOne(
            {
              item_uuid: item.item_uuid,
            },
            { stock }
          );
        }
      }
      console.log(+orderStage);
      response = await OrderCompleted.create({
        ...value,
        invoice_number: invoice_number.next_invoice_number || 0,
        order_status: "R",
        entry: +orderStage === 5 ? 1 : 0,
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
      if (+orderStage === 2) {
        let WhatsappNotification = await whatsapp_notifications.findOne({
          notification_uuid: "out-for-delivery",
        });
        let counterData = await Counters.findOne(
          {
            counter_uuid: value.counter_uuid,
          },
          { mobile: 1, counter_title: 1, short_link: 1 }
        );

        if (WhatsappNotification?.status && counterData?.mobile?.length) {
          CallMsg({ counterData, WhatsappNotification, value });
        }
      }
      console.log(value.campaign_short_link);
      if (value?.campaign_short_link) {
        let campaignData = await Campaigns.findOne(
          {
            campaign_short_link: value.campaign_short_link,
          },
          {
            campaign_uuid: 1,
            counter_status: 1,
          }
        );
        console.log(campaignData, value.counter_uuid);
        campaignData = JSON.parse(JSON.stringify(campaignData));
        if (campaignData?.counter_status?.length) {
          let counter_status = campaignData.counter_status.map((a) =>
            a.counter_uuid === value.counter_uuid ? { ...a, status: 1 } : a
          );
          console.log(counter_status);
          await Campaigns.updateOne(
            {
              campaign_uuid: campaignData.campaign_uuid,
            },
            {
              counter_status,
            }
          );
        }
      }
      res.json({ success: true, result: response, incentives });
    } else res.json({ success: false, message: "Order Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/sendMsg", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });

    let WhatsappNotification = await whatsapp_notifications.findOne({
      notification_uuid: value.notification_uuid,
    });
    let counterData = await Counters.findOne(
      {
        counter_uuid: value.counter_uuid,
      },
      { mobile: 1, counter_title: 1, short_link: 1 }
    );

    let mobile = counterData.mobile.filter(
      (a) => a.mobile && a.lable.find((b) => b.type === "wa" && +b.varification)
    );
    if (WhatsappNotification?.status && mobile?.length) {
      CallMsg({ value, WhatsappNotification, counterData });
      res.json({ success: true, message: "Message Sent Successfully" });
    } else {
      res.json({
        success: false,
        message: "No Verified Number for this Counter ",
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/sendPdf", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });

    let counterData = await Counters.findOne(
      {
        counter_uuid: value.counter_uuid,
      },
      { mobile: 1, counter_title: 1, short_link: 1 }
    );

    let mobile = counterData.mobile.filter(
      (a) => a.mobile && a.lable.find((b) => b.type === "wa" && +b.varification)
    );
    if (mobile?.length) {
      let data = [];
      let file = [];

      if (value.order_uuid) {
        try {
          let orderpdf = await fs.promises.access(
            "./uploads/N" +
              (value.invoice_number || "") +
              "-" +
              (value?.order_uuid || "") +
              ".pdf"
          );
        } catch (err) {
          // Create a browser instance
          try {
            const browser = await puppeteer.launch({
              args: ["--no-sandbox"],
            });

            // Create a new page
            const page = await browser.newPage();

            // Website URL to export as pdf
            const website_url = "https://btgondia.com/pdf/" + value.order_uuid;
            await page.goto(website_url, { waitUntil: "networkidle0" });
            await page.emulateMediaType("screen");

            const pdf = await page.pdf({
              path:
                "./uploads/N" +
                (value.invoice_number || "") +
                "-" +
                (value?.order_uuid || "") +
                ".pdf",
              margin: {
                top: "100px",
                right: "50px",
                bottom: "100px",
                left: "50px",
              },
              printBackground: true,
              format: "A4",
            });
          } catch (err) {
            console.log(err);
          }
        }
      }

      for (let contact of counterData?.mobile) {
        if (
          contact.mobile &&
          contact?.lable?.find((a) => a.type === "wa" && +a.varification)
        ) {
          let messages = [];

          if (value?.order_uuid) {
            fs.access(
              "./uploads/N" +
                (value.invoice_number || "") +
                "-" +
                (value?.order_uuid || "") +
                ".pdf",
              (err) => {
                if (err) {
                  console.log(err);
                  return;
                }
                file.push(
                  "N" +
                    (value.invoice_number || "") +
                    "-" +
                    (value?.order_uuid || "") +
                    ".pdf"
                );

                messages.push({
                  file:
                    "N" +
                    (value.invoice_number || "") +
                    "-" +
                    (value?.order_uuid || "") +
                    ".pdf",
                  sendAsDocument: true,
                  caption: value.caption || "",
                });
              }
            );
          }
          data.push({
            contact: contact.mobile,
            messages,
          });
          await Notification_logs.create({
            contact: contact.mobile,
            notification_uuid: value.notifiacation_uuid || "",
            messages,
            invoice_number: value.invoice_number,
            created_at: new Date().getTime(),
          });
        }
      }
      // FileSystem.writeFile(
      //   "remote-test.json",
      //   JSON.stringify(data),
      //   (error, data) => {
      //     if (error) throw error;
      //   }
      // );
      // let filedata = await FileSystem.promises.readFile("./remote-test.json");
      // let Imagedata = await FileSystem.promises.readFile("./uploads/images.jpg");
      // let formData=new FormData()
      // formData.append("file",filedata)
      // formData.append("file",Imagedata)
      // console.log(formData)

      if (file.length) {
        const form = new FormData();
        form.append("instructions", JSON.stringify(data));
        for (let item of file) {
          form.append("file", fs.createReadStream("./uploads/" + (item || "")));
        }
        const result = await axios.post(
          "http://15.207.39.69:2000/send",
          form,
          form.getHeaders()
        );
        console.log(result.data, data);
      } else {
        let msgResponse = await axios({
          url: "http://15.207.39.69:2000/sendMessage",
          method: "post",
          data,
        });
        console.log(data, msgResponse.data);
      }

      res.json({ success: true, message: "Message Sent Successfully" });
    } else {
      res.json({
        success: false,
        message: "No Verified Number for this Counter ",
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/putOrders", async (req, res) => {
  try {
    let response = [];
    for (let value of req.body) {
      if (!value) res.json({ success: false, message: "Invalid Data" });

      let prevData = await Orders.findOne({
        invoice_number: value.invoice_number,
      });
      value = Object.keys(value)
        .filter((key) => key !== "_id")
        .reduce((obj, key) => {
          obj[key] = value[key];
          return obj;
        }, {});
      let itemData = value?.item_details?.length
        ? await Item.find({
            item_uuid: { $in: value.item_details.map((a) => a.item_details) },
          })
        : [];
      let prevorderStage = prevData
        ? +Math.max.apply(
            null,
            prevData?.status?.map((a) => +a.stage)
          )
        : 0;
      let orderStage = +Math.max.apply(
        null,
        value?.status?.map((a) => +a.stage)
      );

      let tripData = {};
      if (value.trip_uuid) {
        tripData = await Trips.findOne({ trip_uuid: value.trip_uuid });
        tripData = JSON.parse(JSON.stringify(tripData));
      }
      if (
        +orderStage === 4 ||
        +orderStage === 5 ||
        value?.item_details?.length === 0
      ) {
        let data = await OrderCompleted.findOne({
          order_uuid: value.order_uuid,
        });
        // console.log(orderStage);
        if (+orderStage === 5 || value?.item_details?.length === 0) {
          data = await CancelOrders.create(value);

          await Orders.deleteOne({ order_uuid: value.order_uuid });
          fs.access(
            "./uploads/N" +
              (value.invoice_number || "") +
              "-{" +
              (value?.order_uuid || "") +
              "}.pdf",
            (err) => {
              if (err) {
                console.log(err);
                return;
              }
              fs.unlink(
                "./uploads/N" +
                  (value.invoice_number || "") +
                  "-{" +
                  (value?.order_uuid || "") +
                  "}.pdf",
                (err) => {
                  if (err) {
                    console.log(err);
                    return;
                  }
                }
              );
            }
          );
        }
        // console.log("length", value?.item_details?.length);
        // console.log("Old Data",data)
        else if (data) {
          await OrderCompleted.updateOne(
            { order_uuid: value.order_uuid },
            value
          );
        } else {
          let warehouse_uuid = value.warehouse_uuid || tripData?.warehouse_uuid;
          if (warehouse_uuid) {
            value = { ...value, warehouse_uuid };
            for (let item of value.item_details) {
              let itemData = await Item.findOne({
                item_uuid: item.item_uuid,
              });
              itemData = JSON.parse(JSON.stringify(itemData));
              let stock = itemData.stock;
              // console.log("Stock", stock);
              let qty =
                +item.b * +itemData.conversion + +item.p + (+item.free || 0);
              stock = stock?.filter((a) => a.warehouse_uuid === warehouse_uuid)
                ?.length
                ? stock.map((a) =>
                    a.warehouse_uuid === warehouse_uuid
                      ? { ...a, qty: a.qty - qty }
                      : a
                  )
                : stock?.length
                ? [
                    ...stock,
                    {
                      warehouse_uuid: warehouse_uuid,
                      min_level: 0,
                      qty: -qty,
                    },
                  ]
                : [
                    {
                      warehouse_uuid: warehouse_uuid,
                      min_level: 0,
                      qty: -qty,
                    },
                  ];
              // console.log("Stock", stock);
              await Item.updateOne(
                {
                  item_uuid: item.item_uuid,
                },
                { stock }
              );
            }
          }

          data = await OrderCompleted.create({
            ...prevData,
            ...value,
            entry: +orderStage === 5 ? 1 : 0,
          });
          await Orders.deleteOne({ order_uuid: value.order_uuid });
          fs.access(
            "./uploads/N" +
              (value.invoice_number || "") +
              "-{" +
              (value?.order_uuid || "") +
              "}.pdf",
            (err) => {
              if (err) {
                console.log(err);
                return;
              }
              fs.unlink(
                "./uploads/N" +
                  (value.invoice_number || "") +
                  "-{" +
                  (value?.order_uuid || "") +
                  "}.pdf",
                (err) => {
                  if (err) {
                    console.log(err);
                    return;
                  }
                }
              );
            }
          );
        }
        // console.log("New DAta", data);
        if (+orderStage === 4) {
          let counterGroupsData = await Counters.findOne(
            {
              counter_uuid: value.counter_uuid,
            },
            { counter_group_uuid: 1 }
          );
          let itemsData = value?.item_details?.length
            ? await Item.find({
                item_uuid: {
                  $in: value?.item_details?.map((a) => a.item_uuid) || [],
                },
              })
            : [];
          let incentiveData = await Incentive.find({ status: 1 });
          incentiveData = JSON.parse(JSON.stringify(incentiveData));
          let user_range_order = value.status.find(
            (c) => +c.stage === 1
          )?.user_uuid;

          let user_delivery_intensive = value.status.find(
            (c) => +c.stage === 4
          )?.user_uuid;

          incentiveData = incentiveData.filter(
            (a) =>
              a.counters.filter((b) => b === value.counter_uuid).length ||
              a.counter_groups.filter((b) =>
                counterGroupsData?.counter_group_uuid?.find((c) => b === c)
              ).length
          );
          let rangeOrderIncentive = incentiveData.filter(
            (a) =>
              a.users.filter((b) => b === user_range_order).length &&
              a.type === "range-order"
          );

          let rangeDeliveryIntensive = incentiveData.filter(
            (a) =>
              a.users.filter((b) => b === user_delivery_intensive).length &&
              a.type === "delivery-incentive"
          );
          if (!rangeDeliveryIntensive?.length) {
            user_delivery_intensive = tripData?.users?.length
              ? tripData?.users[0]
              : "";
            rangeDeliveryIntensive = incentiveData.filter(
              (a) =>
                a.users.filter((b) => b === user_delivery_intensive).length &&
                a.type === "delivery-incentive"
            );
          }
          let rangeItemIntensive = incentiveData.filter(
            (a) =>
              a.users.filter((b) => b === user_range_order).length &&
              a.type === "item-incentive"
          );

          for (let incentive_item of rangeOrderIncentive) {
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
              let userData = await Users.findOne({
                user_uuid: user_range_order,
              });
              userData = JSON.parse(JSON.stringify(userData));
              let amt = eligibleItems.length * incentive_item.amt;
              let incentive_balance = (
                +(userData.incentive_balance || 0) + amt
              ).toFixed(2);

              await Users.updateMany(
                { user_uuid: user_range_order },
                { incentive_balance }
              );
              let time = new Date();
              let statment = await IncentiveStatment.create({
                user_uuid: user_range_order,
                order_uuid: value.order_uuid,
                counter_uuid: value.counter_uuid,
                incentive_uuid: incentive_item.incentive_uuid,
                time: time.getTime(),
                amt: amt.toFixed(2),
              });
            }
          }
          for (let incentive_item of rangeDeliveryIntensive) {
            if (incentive_item.value) {
              let userData = await Users.findOne({
                user_uuid: user_delivery_intensive,
              });
              userData = JSON.parse(JSON.stringify(userData));
              let amt = 0;
              let incentive_balance = 0;
              if (
                incentive_item.calculation === "amt" &&
                incentive_item.value
              ) {
                amt =
                  (incentive_item.value / 100) *
                  (value.order_grandtotal || value.order_grandtotal);
                incentive_balance = (
                  +(userData.incentive_balance || 0) + amt
                ).toFixed(2);
              }
              if (
                incentive_item.calculation === "qty" &&
                incentive_item.value
              ) {
                amt =
                  (incentive_item.value || 0) *
                  (value.item_details.filter((a) => +a.status !== 3).length > 1
                    ? value.item_details
                        .filter((a) => +a.status !== 3)
                        .map((a) => {
                          return (
                            (+a.b *
                              +itemData.find((c) => c.item_uuid === a.item_uuid)
                                .conversion || 0) + a.p
                          );
                        })
                        .reduce((a, b) => a + b)
                    : value.item_details.length
                    ? (+value.item_details[0].b *
                        +itemData.find(
                          (c) => c.item_uuid === value.item_details[0].item_uuid
                        ).conversion || 0) + value.item_details[0].p
                    : 0);

                incentive_balance = (
                  +(userData.incentive_balance || 0) + amt
                ).toFixed(2);
              }

              if (tripData?.users?.length > 1) {
                for (let tripUser of tripData.users) {
                  let update = await Users.updateMany(
                    { user_uuid: tripUser },
                    {
                      $inc: {
                        incentive_balance: (
                          amt / tripData?.users.length
                        ).toFixed(2),
                      },
                    }
                  );
                  let time = new Date();
                  let statment = await IncentiveStatment.create({
                    user_uuid: tripUser,
                    order_uuid: value.order_uuid,
                    counter_uuid: value.counter_uuid,
                    incentive_uuid: incentive_item.incentive_uuid,
                    time: time.getTime(),
                    amt: (amt / tripData?.users.length).toFixed(2),
                  });
                  console.log(update, statment, amt, incentive_balance);
                }
              } else {
                let update = await Users.updateMany(
                  { user_uuid: user_delivery_intensive },
                  { incentive_balance }
                );
                let time = new Date();
                let statment = await IncentiveStatment.create({
                  user_uuid: user_delivery_intensive,
                  order_uuid: value.order_uuid,
                  counter_uuid: value.counter_uuid,
                  incentive_uuid: incentive_item.incentive_uuid,
                  time: time.getTime(),
                  amt: amt.toFixed(2),
                });
                console.log(update, statment, amt, incentive_balance);
              }
            }
          }
          for (let incentive_item of rangeItemIntensive) {
            if (incentive_item.value) {
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
              let userData = await Users.findOne({
                user_uuid: user_range_order,
              });
              userData = JSON.parse(JSON.stringify(userData));
              let amt = 0;
              let incentive_balance = 0;
              if (
                incentive_item.calculation === "amt" &&
                incentive_item.value
              ) {
                for (let item of eligibleItems) {
                  amt = +amt + (incentive_item.value / 100) * item.item_total;
                }
              }
              if (
                incentive_item.calculation === "qty" &&
                incentive_item.value
              ) {
                for (let item of eligibleItems) {
                  let itemData = await Item.findOne({
                    item_uuid: item.item_uuid,
                  });
                  amt =
                    +amt +
                    ((+item.b * +itemData.conversion || 0) + item.p) *
                      +incentive_item.value;
                }
              }
              incentive_balance = (
                +(userData.incentive_balance || 0) + amt
              ).toFixed(2);

              await Users.updateMany(
                { user_uuid: user_range_order },
                { incentive_balance }
              );
              let time = new Date();
              let statment = await IncentiveStatment.create({
                user_uuid: user_range_order,
                order_uuid: value.order_uuid,
                counter_uuid: value.counter_uuid,
                incentive_uuid: incentive_item.incentive_uuid,
                time: time.getTime(),
                amt: amt.toFixed(2),
              });
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
        else {
          data = await OrderCompleted.updateOne(
            { order_uuid: value.order_uuid },
            value
          );
          if (data.acknowledged) response.push(value);
        }
      }
      console.log(orderStage, prevorderStage);
      if (+orderStage === 2 && prevorderStage === 1) {
        let WhatsappNotification = await whatsapp_notifications.findOne({
          notification_uuid: "out-for-delivery",
        });
        let counterData = await Counters.findOne(
          {
            counter_uuid: value.counter_uuid,
          },
          {
            mobile: 1,
            counter_title: 1,
            short_link: 1,
          }
        );

        if (WhatsappNotification?.status && counterData?.mobile?.length) {
          CallMsg({ value, WhatsappNotification, counterData });
        }
      }

      if (value.accept_notification) {
        let notification_uuid = +value.accept_notification
          ? "order-accept-notification"
          : "order-decline-notification";
        let WhatsappNotification = await whatsapp_notifications.findOne({
          notification_uuid,
        });
        let counterData = await Counters.findOne(
          {
            counter_uuid: value.counter_uuid,
          },
          {
            mobile: 1,
            counter_title: 1,
            short_link: 1,
          }
        );
        console.log(notification_uuid);
        console.log(WhatsappNotification?.status, counterData?.mobile?.length);
        if (WhatsappNotification?.status && counterData?.mobile?.length) {
          CallMsg({ value, WhatsappNotification, counterData });
        }
      }
      if (value.edit) {
        try {
          let orderpdf = await fs.promises.access(
            "./uploads/N" +
              (value.invoice_number || "") +
              "-" +
              (value?.order_uuid || "") +
              ".pdf"
          );
          try {
            const browser = await puppeteer.launch({ args: ["--no-sandbox"] });

            // Create a new page
            const page = await browser.newPage();

            // Website URL to export as pdf
            const website_url = "https://btgondia.com/pdf/" + value.order_uuid;
            await page.goto(website_url, { waitUntil: "networkidle0" });
            await page.emulateMediaType("screen");

            const pdf = await page.pdf({
              path:
                "./uploads/N" +
                (value.invoice_number || "") +
                "-" +
                (value?.order_uuid || "") +
                ".pdf",
              margin: {
                top: "100px",
                right: "50px",
                bottom: "100px",
                left: "50px",
              },
              printBackground: true,
              format: "A4",
            });
          } catch (err) {
            console.log(err);
          }
        } catch (err) {
          // Create a browser instance
          console.log(err);
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

      let counterData = await Counters.findOne(
        {
          counter_uuid: orderData?.counter_uuid || 0,
        },
        {
          counter_title: 1,

          counter_uuid: 1,
        }
      );
      counterData = JSON.parse(JSON.stringify(counterData));

      let user_title =
        item.user_uuid === "240522" ? "Admin" : userData.user_title;
      let order_grandtotal = orderData?.order_grandtotal || 0;
      let invoice_number = orderData?.invoice_number || 0;
      let counter_title = counterData?.counter_title || "";
      let qty =
        (orderData?.item_details?.length > 1
          ? orderData.item_details.map((a) => a.b).reduce((a, b) => +a + b)
          : orderData?.item_details?.length
          ? orderData?.item_details[0]?.b
          : 0) +
        ":" +
        (orderData?.item_details?.length > 1
          ? orderData.item_details.map((a) => a.p).reduce((a, b) => +a + b)
          : orderData?.item_details?.length
          ? orderData?.item_details[0]?.p
          : 0);
      response.push({
        ...item,
        ...orderData,
        user_title,
        order_grandtotal,
        counter_title,
        qty,
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
    let receiptData = await Receipts.find(
      {
        order_uuid: { $in: data.map((a) => a.order_uuid) },
      },
      { modes: 1, invoice_number: 1, order_uuid: 1, counter_uuid: 1 }
    );
    receiptData = JSON.parse(JSON.stringify(receiptData));
    let outstandindData = await OutStanding.find({
      order_uuid: { $in: data.map((a) => a.order_uuid) },
      status: 1,
    });
    outstandindData = JSON.parse(JSON.stringify(outstandindData));
    res.json({
      success: true,
      result: data.map((order) => {
        let receipt = receiptData?.find(
          (b) =>
            b.invoice_number === order.invoice_number ||
            (b.order_uuid === order.order_uuid &&
              b.counter_uuid === order.counter_uuid)
        );

        return {
          ...order,
          modes: receipt?.modes || [],
          counter_uuid: order?.counter_uuid || receipt?.counter_uuid || "",
          unpaid:
            outstandindData?.find(
              (b) =>
                b.invoice_number === order.invoice_number ||
                (b.order_uuid === order.order_uuid &&
                  b.counter_uuid === order.counter_uuid)
            )?.amount || 0,
        };
      }),
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
      { invoice_number: value.invoice_number },
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
router.put("/putOrderNotes", async (req, res) => {
  try {
    let value = req.body;
    console.log(value);
    let orderData = await Orders.findOne({
      invoice_number: value.invoice_number,
    });
    let data = {};
    if (orderData)
      data = await Orders.updateOne(
        { invoice_number: value.invoice_number },
        value
      );
    else
      data = await OrderCompleted.updateOne(
        { invoice_number: value.invoice_number },
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

    let counterData = await Counters.find(
      {
        counter_uuid: {
          $in: data.filter((a) => a.counter_uuid).map((a) => a.counter_uuid),
        },
      },
      {
        counter_title: 1,

        counter_uuid: 1,
      }
    );
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
router.get("/GetOrderAllRunningList/:user_uuid", async (req, res) => {
  try {
    let userData = await Users.findOne(
      { user_uuid: req.params.user_uuid },
      { routes: 1, warehouse: 1 }
    );
    userData = JSON.parse(JSON.stringify(userData));

    let data = [];
    let counterData = [];
    if (
      userData.routes.length &&
      !userData.routes.filter((a) => +a === 1).length
    ) {
      counterData = await Counters.find(
        {},
        { counter_title: 1, counter_uuid: 1, route_uuid: 1 }
      );
      counterData = JSON.parse(JSON.stringify(counterData));
      counterData = counterData.filter(
        (a) =>
          userData.routes.filter((b) => b === a.route_uuid).length ||
          (userData.routes.filter((b) => b === "none").length && !a.route_uuid)
      );

      data = await Orders.find({
        counter_uuid: {
          $in: counterData
            .filter((a) => a.counter_uuid)
            .map((a) => a.counter_uuid),
        },
      });
      data = JSON.parse(JSON.stringify(data));
    } else {
      data = await Orders.find({});
      data = JSON.parse(JSON.stringify(data));
      counterData = await Counters.find(
        {
          counter_uuid: {
            $in: data.filter((a) => a.counter_uuid).map((a) => a.counter_uuid),
          },
        },
        { counter_title: 1, counter_uuid: 1 }
      );
    }
    CheckPdf(data);
    data = data.filter((a) => {
      return (
        a.order_uuid && a.hold !== "Y"
        // &&
        // (!a.warehouse_uuid ||
        //   !userData?.warehouse?.length ||
        //   +userData?.warehouse[0] === 1 ||
        //   userData?.warehouse[0] === "none" ||
        //   userData?.warehouse?.find((b) => b === a.warehouse_uuid))
      );
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
router.get("/GetOrderHoldRunningList/:user_uuid", async (req, res) => {
  try {
    let userData = await Users.findOne({ user_uuid: req.params.user_uuid });
    userData = JSON.parse(JSON.stringify(userData));

    let data = [];
    let counterData = [];
    if (
      userData.routes.length &&
      !userData.routes.filter((a) => +a === 1).length
    ) {
      counterData = await Counters.find(
        {},
        {
          counter_title: 1,

          counter_uuid: 1,
        }
      );
      counterData = JSON.parse(JSON.stringify(counterData));
      counterData = counterData.filter(
        (a) =>
          userData.routes.filter((b) => b === a.route_uuid).length ||
          (userData.routes.filter((b) => b === "none").length && !a.route_uuid)
      );
      data = await Orders.find({
        counter_uuid: {
          $in: counterData
            .filter((a) => a.counter_uuid)
            .map((a) => a.counter_uuid),
        },
      });
      data = JSON.parse(JSON.stringify(data));
    } else {
      data = await Orders.find({});
      data = JSON.parse(JSON.stringify(data));
      counterData = await Counters.find(
        {
          counter_uuid: {
            $in: data.filter((a) => a.counter_uuid).map((a) => a.counter_uuid),
          },
        },
        {
          counter_title: 1,

          counter_uuid: 1,
        }
      );
    }
    data = data.filter(
      (a) => a.order_uuid && a.hold === "Y"
      // &&
      // (!a.warehouse_uuid ||
      //   +userData?.warehouse[0] === 1 ||
      //   userData?.warehouse?.find((b) => b === a.warehouse_uuid))
    );
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
    if (!data)
      data = await OrderCompleted.findOne({
        order_uuid: req.params.order_uuid,
      });
    if (!data)
      data = await CancelOrders.findOne({
        order_uuid: req.params.order_uuid,
      });
    data = JSON.parse(JSON.stringify(data));
    let itemData = await Item.find(
      { item_uuid: { $in: data.item_details.map((a) => a.item_uuid) } },
      { item_uuid: 1, category_uuid: 1 }
    );
    let categoryData = await ItemCategories.find(
      { category_uuid: { $in: itemData.map((a) => a.category_uuid) } },
      { category_title: 1, category_uuid: 1 }
    );
    data = {
      ...data,
      item_details: data?.item_details
        ?.map((a) => ({
          ...a,
          category_title: categoryData.find(
            (b) =>
              b.category_uuid ===
              itemData.find((b) => b.item_uuid === a.item_uuid).category_uuid
          )?.category_title,
        }))
        .sort(
          (a, b) =>
            a?.category_title?.localeCompare(b.category_title) ||
            a?.item_title?.localeCompare(b.item_title)
        ),
    };

    res.json({
      success: true,
      result: data,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/getOrderData", async (req, res) => {
  try {
    let data = await Orders.find({ invoice_number: req.body.invoice_number });
    if (!data)
      data = await OrderCompleted.find({
        invoice_number: req.body.invoice_number,
      });
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
    let counterData = await Counters.find(
      {
        counter_uuid: {
          $in: data.filter((a) => a.counter_uuid).map((a) => a.counter_uuid),
        },
      },
      {
        counter_title: 1,

        sort_order: 1,

        counter_uuid: 1,
      }
    );
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
    let counterData = await Counters.find(
      {
        counter_uuid: {
          $in: data.filter((a) => a.counter_uuid).map((a) => a.counter_uuid),
        },
      },
      {
        counter_title: 1,

        sort_order: 1,

        counter_uuid: 1,
      }
    );
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
    let counterData = await Counters.find(
      {
        counter_uuid: {
          $in: data.filter((a) => a.counter_uuid).map((a) => a.counter_uuid),
        },
      },
      {
        counter_title: 1,

        sort_order: 1,

        credit_allowed: 1,

        counter_uuid: 1,
      }
    );
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
    let response = await OrderCompleted.find(
      !req.body.counter_uuid ? {} : { counter_uuid: req.body.counter_uuid }
    );

    response = JSON.parse(JSON.stringify(response));
    response = response?.filter(
      (order) =>
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
    if (response?.length) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Order Not Found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/getStockDetails", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    console.log(value);
    let endDate = +value.endDate + 86400000;
    console.log(endDate, value.startDate);
    let response = await OrderCompleted.find({
      "item_details.item_uuid": value.item_uuid,
    });
    let responseVoucher = await Vochers.find({
      "item_details.item_uuid": value.item_uuid,
      $or: [
        { from_warehouse: value.warehouse_uuid },
        { to_warehouse: value.warehouse_uuid },
      ],
    });
    response = JSON.parse(JSON.stringify(response));
    response = response?.filter(
      (order) =>
        order.status.filter(
          (a) => +a.stage === 1 && a.time > value.startDate && a.time < endDate
        ).length
    );
    const counterData = await Counters.find(
      {
        counter_uuid: { $in: response.map((a) => a.counter_uuid) },
      },
      { counter_uuid, counter_title }
    );
    const warehouseData = await WarehouseModel.find({});
    responseVoucher = JSON.parse(JSON.stringify(responseVoucher));
    responseVoucher = responseVoucher?.filter(
      (order) =>
        order.created_at > value.startDate && order.created_at < endDate
    );
    let data = [];
    for (let item of response) {
      let orderItem = item?.item_details?.find(
        (a) => a.item_uuid === value.item_uuid
      );
      if (orderItem?.b || orderItem?.p) {
        let obj = {
          date: item?.status?.find((a) => +a.stage === 1)?.time,
          to: counterData?.find((a) => a.counter_uuid === item.counter_uuid)
            ?.counter_title,
          added: 0,
          reduce: (orderItem?.b || 0) + ":" + (orderItem.p || 0),
        };
        data.push(obj);
      }
    }
    for (let item of responseVoucher) {
      let orderItem = item.item_details.find(
        (a) => a.item_uuid === value.item_uuid
      );
      console.log(orderItem);
      if (orderItem?.b || orderItem?.p) {
        let added = item.to_warehouse === value.warehouse_uuid;

        let obj = {
          date: item.created_at,
          to:
            "Warehouse:" +
            warehouseData?.find(
              (a) =>
                a.warehouse_uuid ===
                (added ? item.from_warehouse : item.to_warehouse)
            )?.warehouse_title,
          added: added ? (orderItem?.b || 0) + ":" + (orderItem.p || 0) : 0,
          reduce: added ? 0 : (orderItem?.b || 0) + ":" + (orderItem.p || 0),
        };
        data.push(obj);
      }
    }

    if (data?.length) {
      res.json({ success: true, result: data });
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
      trip_uuid: value.trip_uuid,
      order_uuid: { $in: response.map((a) => a.order_uuid) },
    });

    receiptData = JSON.parse(JSON.stringify(receiptData));
    let outstandindData = await OutStanding.find({
      order_uuid: response.map((a) => a.order_uuid),
      status: 1,
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
      cash: receiptData
        .find((b) => b.order_uuid === order.order_uuid)
        ?.modes?.find(
          (b) => b.mode_uuid === "c67b54ba-d2b6-11ec-9d64-0242ac120002"
        )?.amt,
      cheque: receiptData
        .find((b) => b.order_uuid === order.order_uuid)
        ?.modes.find(
          (b) => b.mode_uuid === "c67b5794-d2b6-11ec-9d64-0242ac120002"
        )?.amt,
      upi: receiptData
        .find((b) => b.order_uuid === order.order_uuid)
        ?.modes?.find(
          (b) => b.mode_uuid === "c67b5988-d2b6-11ec-9d64-0242ac120002"
        )?.amt,

      unpaid:
        outstandindData.find((b) => b.order_uuid === order.order_uuid)
          ?.amount || 0,
    }));
    let cash = [].concat
      .apply(
        [],
        receiptData.map((b) => b?.modes || [])
      )
      .filter((b) => b.mode_uuid === "c67b54ba-d2b6-11ec-9d64-0242ac120002");
    let cheque = [].concat
      .apply(
        [],
        receiptData.map((b) => b?.modes || [])
      )
      .filter((b) => b.mode_uuid === "c67b5794-d2b6-11ec-9d64-0242ac120002");
    let upi = [].concat
      .apply(
        [],
        receiptData.map((b) => b?.modes || [])
      )
      .filter((b) => b.mode_uuid === "c67b5988-d2b6-11ec-9d64-0242ac120002");

    if (response.length) {
      res.json({
        success: true,
        result: response,
        total: {
          total_amt:
            response.length > 1
              ? response.map((a) => +a?.amt || 0).reduce((a, b) => a + b)
              : response[0]?.amt || 0,
          total_cash:
            cash.length > 1
              ? cash.map((a) => +a?.amt || 0).reduce((a, b) => a + b)
              : amt[0]?.cash || 0,
          total_cheque:
            cheque.length > 1
              ? cheque.map((a) => +a?.amt || 0).reduce((a, b) => a + b)
              : cheque[0]?.amt || 0,
          total_upi:
            upi.length > 1
              ? upi.map((a) => +a?.amt || 0).reduce((a, b) => a + b)
              : upi[0]?.amt || 0,
          total_unpaid:
            response.length > 1
              ? response.map((a) => +a?.unpaid || 0).reduce((a, b) => a + b)
              : response[0]?.unpaid || 0,
        },
      });
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
      reference_number: order.receipt_number
        ? order.receipt_number + " (" + order?.invoice_number + ")"
        : order?.invoice_number || "-",
      order_date:
        order?.status?.find((a) => +a.stage === 1)?.time || order?.time || "",

      amt1: order?.order_grandtotal || "",
      amt2:
        order?.modes?.length > 1
          ? order?.modes?.map((a) => a.amt || 0).reduce((a, b) => a + b)
          : order?.modes?.length
          ? order?.modes[0]?.amt
          : "0",
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
    let counterData = await Counters.find(
      {},
      {
        counter_uuid: 1,

        counter_group_uuid: 1,
      }
    );
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
