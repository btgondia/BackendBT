const express = require("express");
const router = express.Router();
const { v4: uuid } = require("uuid");
const Counter = require("../Models/Counters");
const OrderCompleted = require("../Models/OrderCompleted");
const Orders = require("../Models/Orders");
const Routes = require("../Models/Routes");
const Companies = require("../Models/Companies");
const Item = require("../Models/Item");
const Otp = require("../Models/otp");
const ItemCategories = require("../Models/ItemCategories");
const notification_log = require("../Models/notification_log");
const orderForms = require("../Models/orderForms");
const Campaigns = require("../Models/Campaigns");
const { messageEnque } = require("../queues/messageQueue");
const Counters = require("../Models/Counters");
const { default: mongoose } = require("mongoose");
var msg91 = require("msg91-templateid")(
  "312759AUCbnlpoZeD61714959P1",
  "foodDo",
  "4"
);

router.post("/postCounter", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    let short_link = uuid().slice(0, 7);
    let verirfyshort_link = await Counter.findOne({}, { counter_uuid: 1 });
    while (verirfyshort_link) {
      short_link = uuid().slice(0, 7);
      verirfyshort_link = await Counter.findOne(
        { short_link },
        { counter_uuid: 1 }
      );
    }
    value = { ...value, counter_uuid: uuid(), short_link };
    if (!value.sort_order) {
      let response = await Counter.find({}, { counter_uuid: 1 });
      response = JSON.parse(JSON.stringify(response));
      //   console.log(response)
      value.sort_order =
        Math.max(...response.map((o) => o?.sort_order || 0)) + 1 || 0;
    }
    console.log(value);
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
    let data = await Counter.find(
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
        // average_lines_company: 1,
        // average_lines_category: 1,
        item_special_price: 1,
        item_special_discount: 1,
        counter_group_uuid: 1,
        payment_modes: 1,
      }
    );
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
router.get("/GetCounter/:counter_uuid", async (req, res) => {
  // try {
    let data = await Counter.findOne(
      { counter_uuid: req.params.counter_uuid },
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
        // average_lines_company: 1,
        // average_lines_category: 1,
        item_special_price: 1,
        item_special_discount: 1,
        counter_group_uuid: 1,
        payment_modes: 1,
      }
    );
    data = JSON.parse(JSON.stringify(data));
    let RoutesData = await Routes.findOne({
      route_uuid: data.route_uuid,
    });
    data = {
      ...data,
      route_title: RoutesData?.route_title || "",
    };
    if (data) res.json({ success: true, result: data });
    else res.json({ success: false, message: "Counters Not found" });
  // } catch (err) {
  //   res.status(500).json({ success: false, message: err });
  // }
});
router.post("/GetCounterList", async (req, res) => {
  try {
    let { counters = [] } = req.body;
    console.log(counters);
    let data = await Counter.find(
      counters?.length ? { counter_uuid: { $in: counters } } : {},
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
        notes: 1,
        // average_lines_company: 1,
        // average_lines_category: 1,
        item_special_price: 1,
        item_special_discount: 1,
        counter_group_uuid: 1,
        payment_modes: 1,
      }
    );
    data = JSON.parse(JSON.stringify(data));
    let RoutesData = await Routes.find(
      {
        route_uuid: { $in: data.map((a) => a.route_uuid) },
      },
      { route_title: 1, route_uuid: 1 }
    );
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
    let data = await Counter.find(
      {},
      {
        counter_title: 1,
        trip_uuid: 1,
        counter_code: 1,
        sort_order: 1,
        notes: 1,
        payment_reminder_days: 1,
        outstanding_type: 1,
        credit_allowed: 1,
        gst: 1,
        food_license: 1,
        counter_uuid: 1,
        short_link: 1,
        remarks: 1,
        status: 1,
        route_uuid: 1,
        address: 1,
        mobile: 1,
        company_discount: 1,
        form_uuid: 1,
        // average_lines_company: 1,
        // average_lines_category: 1,
        item_special_price: 1,
        item_special_discount: 1,
        counter_group_uuid: 1,
        payment_modes: 1,
      }
    );

    if (data.length) res.json({ success: true, result: data });
    else res.json({ success: false, message: "Counters Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/GetCounterData", async (req, res) => {
  try {
    let value = req.body;
    let json = {};

    for (let i of value) {
      json = { ...json, [i]: 1 };
    }
    console.log(json);
    let data = await Counter.find({}, json);

    if (data.length) res.json({ success: true, result: data });
    else res.json({ success: false, message: "Counters Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.get("/minimum_details", async (req, res) => {
  try {
    let data = await Counter.find({}, { counter_uuid: 1, counter_title: 1 });
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
    console.log(time);
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
    let ItemsData = await Item.find({});
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
router.post("/GetCounterByLink", async (req, res) => {
  try {
    let {
      form_short_link = "",
      campaign_short_link = "",
      short_link = "",
    } = req.body;
    let counterData = await Counter.findOne(
      { short_link },
      {
        counter_uuid: 1,
        counter_title: 1,
        route_uuid: 1,
        form_uuid: 1,
        item_special_price: 1,
        company_discount: 1,
      }
    );
    let form_uuid = counterData.form_uuid;

    if (campaign_short_link) {
      let compainData = await Campaigns.findOne(
        { campaign_short_link },
        { form_uuid: 1 }
      );

      if (compainData?.form_uuid) {
        if (compainData.form_uuid !== "d") {
          form_uuid = compainData.form_uuid;
        }
      }
    }
    if (form_short_link) {
      let compainData = await orderForms.findOne(
        { form_short_link },
        { form_uuid: 1 }
      );

      if (compainData?.form_uuid) {
        form_uuid = compainData.form_uuid;
      }
    }

    if (counterData?.route_uuid) {
      let routeData = await Routes.findOne(
        {
          route_uuid: counterData?.route_uuid,
        },
        { order_status: 1 }
      );

      let orderFormData = await orderForms.findOne(
        {
          form_uuid,
        },
        { company_uuid: 1 }
      );

      if (orderFormData?.company_uuid?.length) {
        let companiesData = await Companies.find(
          { company_uuid: { $in: orderFormData.company_uuid } },
          { company_uuid: 1, company_title: 1 }
        );
        let ItemData = await Item.find(
          { company_uuid: { $in: orderFormData.company_uuid }, status: 1 },
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
            img_status: 1,
          }
        );

        let CategoryData = await ItemCategories.find(
          { company_uuid: { $in: orderFormData.company_uuid }, status: 1 },
          { category_uuid: 1, category_title: 1, company_uuid: 1 }
        );
        res.json({
          success: true,
          message: "",
          result: {
            counter: counterData,
            company: companiesData,
            items: ItemData,
            ItemCategories: CategoryData,
            order_status: +routeData?.order_status,
          },
        });
      } else res.json({ success: false, message: "No Order Form Applied" });
    } else res.json({ success: false, message: "Counter Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/GetCounterByCategory", async (req, res) => {
  try {
    let { categories = [], counter_uuid = "" } = req.body;
    let counterData = await Counter.findOne(
      { counter_uuid },
      {
        counter_uuid: 1,
        counter_title: 1,
        route_uuid: 1,
        form_uuid: 1,
        item_special_price: 1,
        company_discount: 1,
      }
    );

    if (counterData?.route_uuid) {
      let routeData = await Routes.findOne(
        {
          route_uuid: counterData?.route_uuid,
        },
        { order_status: 1 }
      );

      let CategoryData = await ItemCategories.find(
        { category_uuid: { $in: categories } },
        { category_uuid: 1, category_title: 1, company_uuid: 1 }
      );

      let company_uuid = JSON.parse(JSON.stringify(CategoryData)).map(
        (a) => a.company_uuid
      );
      let companiesData = await Companies.find(
        { company_uuid: { $in: company_uuid } },
        { company_uuid: 1, company_title: 1 }
      );
      let ItemData = await Item.find(
        { category_uuid: { $in: categories }, status: 1 },
        {
          item_title: 1,
          item_discount: 1,
          exclude_discount: 1,
          status: 1,
          stock: 1,
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
          img_status: 1,
        }
      );

      res.json({
        success: true,
        message: "",
        result: {
          counter: counterData,
          company: companiesData,
          items: ItemData,
          ItemCategories: CategoryData,
          order_status: +routeData?.order_status,
        },
      });
    } else res.json({ success: false, message: "Counter Not found" });
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
      console.log(value);
      let response = await Counter.updateOne(
        { counter_uuid: value.counter_uuid },
        value
      );
      if (response.acknowledged) {
        console.log(response);
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
    });
    ItemsData = JSON.parse(JSON.stringify(ItemsData));

    let counterData = await Counter.find(
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
        // average_lines_company: 1,
        // average_lines_category: 1,
        item_special_price: 1,
        item_special_discount: 1,
        counter_group_uuid: 1,
        payment_modes: 1,
      }
    );
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
        console.log(counterorder.length);
      }
      index = index + 1;
      console.log(index, counterData.length);
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
        const res = await Counter.updateOne(
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
router.post("/sendWhatsappOtp", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    const generatedOTP = +Math.ceil(Math.random() * Math.pow(10, 10))
      .toString()
      .slice(0, 6);
    let otp = await generatedOTP;
    let message = "Your OTP for Mobile Number Verification is " + otp;
    if (value?.mobile) {
      const number =
        `${value.mobile}`.length === 10
          ? `91${value.mobile}`
          : `${value.mobile}`;

      let data = { number, type: "text", message };

      await Otp.create({
        mobile: value.mobile,
        counter_uuid: value.counter_uuid,
        otp,
      });

      await messageEnque(data);

      await notification_log.create({
        contact: value.mobile,
        notification_uuid: "Whatsapp Otp",
        message: [{ text: message }],
        // invoice_number: value.invoice_number,
        created_at: new Date().getTime(),
      });

      console.log(data, msgResponse);

      res.json({ success: true, message: "Message Sent Successfully" });
    } else {
      res.json({ success: false, message: "Mobile Number Missing " });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/sendCallOtp", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    const generatedOTP = +Math.ceil(Math.random() * Math.pow(10, 10))
      .toString()
      .slice(0, 6);
    let otp = await generatedOTP;
    let message = `${otp} is your foodDo login OTP. dT0A1c4Hq0D - FOODDO`;
    var mobileNo = +`${value.mobile}`.replace("91", "");
    if (value?.mobile) {
      await Otp.create({
        mobile: value.mobile,
        counter_uuid: value.counter_uuid,
        otp,
      });
      await notification_log.create({
        contact: value.mobile,
        notification_uuid: "Whatsapp Otp",
        message: [{ text: message }],
        // invoice_number: value.invoice_number,
        created_at: new Date().getTime(),
      });

      let msgResponse = await msg91.send(
        mobileNo,
        message,
        "1307160922320559546",
        function (err, response) {
          if (err) throw err;
        }
      );

      res.json({ success: true, message: "Message Sent Successfully" });
    } else {
      res.json({ success: false, message: "Mobile Number Missing " });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/verifyOtp", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });

    let otpJson = await Otp.findOne({ otp: value.otp, mobile: value.mobile });
    if (otpJson) {
      let counterData = await Counter.findOne(
        { counter_uuid: value.counter_uuid },
        { mobile: 1 }
      );
      let mobile = JSON.parse(JSON.stringify(counterData.mobile));
      mobile = mobile?.find((a) => a.uuid === value.uuid)
        ? mobile.map((a) =>
            a.uuid === value.uuid
              ? {
                  ...a,
                  mobile: value.mobile,
                  lable: a.lable.find((b) => b.type === value.lable)
                    ? a.lable.map((b) =>
                        b.type === value.lable
                          ? { ...b, type: value.lable, varification: 1 }
                          : b
                      )
                    : [
                        ...(a.lable || []),
                        { type: value.lable, varification: 1 },
                      ],
                }
              : a
          )
        : [
            ...(mobile || []),
            {
              mobile: value.mobile,
              uuid: value.uuid || uuid(),
              lable: [{ type: value.lable, varification: 1 }],
            },
          ];
      console.log(mobile);
      let response = await Counter.updateOne(
        { counter_uuid: value.counter_uuid },
        { mobile }
      );
      await Otp.deleteMany({ mobile: value.mobile });
      console.log(mobile);
      if (response.acknowledged)
        res.json({ success: true, message: "Number Verified" });
      else res.json({ success: false, message: "Number Not Verified" });
    } else {
      res.json({ success: false, message: "Invalid Otp " });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.patch("/item_special_price/:counter_uuid", async (req, res) => {
  try {
    const { counter_uuid } = req.params;
    const payload = await req.body;

    let counter = await Counter.findOne({ counter_uuid });
    counter.item_special_price = await (counter.item_special_price || [])
      ?.filter((i) => !payload?.find((_i) => _i.item_uuid === i.item_uuid))
      ?.concat(payload);

    const result = await Counter.updateOne(
      { counter_uuid },
      { item_special_price: counter.item_special_price }
    );
    if (result.acknowledged) res.json({ success: true, counter });
    else throw Error("Failed");
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/delete_special_price", async (req, res) => {
  try {
    const { counter_uuid, item_uuid } = await req.body;
    console.log(req.body);
    let counter = await Counter.findOne({ counter_uuid });
    counter.item_special_price = (counter.item_special_price || [])?.filter(
      (i) => item_uuid !== i.item_uuid
    );
    const result = await Counter.updateOne(
      { counter_uuid },
      { item_special_price: counter.item_special_price }
    );

    if (result.acknowledged) res.json({ success: true, counter });
    else throw Error("Failed");
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/update_location_coords", async (req, res) => {
  try {
    const { counter_uuid, location_coords } = await req.body;
    const result = await Counter.updateOne(
      { counter_uuid },
      { location_coords }
    );
    if (result.acknowledged) res.json({ success: true });
    else throw Error("Failed");
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/delete_location_coords/:counter_uuid", async (req, res) => {
  try {
    const { counter_uuid } = req.params;
    const result = await Counter.updateOne(
      { counter_uuid },
      { location_coords: null }
    );
    if (result.acknowledged) res.json({ success: true });
    else throw Error("Failed");
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/report", async (req, res) => {
  try {
    const { date_range, companies, routes } = await req.body;
    const counters = await OrderCompleted.aggregate([
      {
        $unwind: {
          path: "$status",
          includeArrayIndex: "index",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $match: {
          index: 0,
          "status.time": {
            $gte: new Date(+date_range?.from_date).setHours(0, 0, 0, 0),
            $lt: new Date(+date_range?.to_date).setHours(23, 59, 59, 999),
          },
        },
      },
      {
        $project: {
          counter_uuid: 1,
          item_details: 1,
        },
      },
      {
        $lookup: {
          from: "counters",
          localField: "counter_uuid",
          foreignField: "counter_uuid",
          let: { routes: routes },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$route_uuid", "$$routes"],
                },
              },
            },
          ],
          as: "counter",
        },
      },
      {
        $unwind: {
          path: "$counter",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $addFields: {
          route_uuid: "$counter.route_uuid",
          counter_title: "$counter.counter_title",
          counter_index: "$counter.sort_order",
        },
      },
      {
        $project: {
          counter: 0,
        },
      },
      {
        $unwind: {
          path: "$item_details",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: "items",
          localField: "item_details.item_uuid",
          foreignField: "item_uuid",
          let: {
            companies: companies,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$company_uuid", "$$companies"],
                },
              },
            },
          ],
          as: "item",
        },
      },
      {
        $unwind: {
          path: "$item",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $addFields: {
          "item_details.company_uuid": "$item.company_uuid",
        },
      },
      {
        $project: {
          item: 0,
        },
      },
      {
        $group: {
          _id: "$counter_uuid",
          item_details: {
            $push: {
              company_uuid: "$item_details.company_uuid",
              b: "$item_details.b",
              p: "$item_details.p",
              item_total: "$item_details.item_total",
            },
          },
          route_uuid: {
            $first: "$route_uuid",
          },
          counter_title: {
            $first: "$counter_title",
          },
          counter_index: {
            $first: "$counter_index",
          },
        },
      },
      {
        $sort: {
          counter_index: 1,
          counter_title: 1,
        },
      },
    ]);

    res.json({ success: true, result: counters });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/report/new", async (req, res) => {
  try {
    const {
      lastSortNo = 0,
      skip = 0,
      date_range,
      companies,
      routes,
    } = await req.body;
    const limit = 150;

    const aggregate = [
      {
        $match: {
          route_uuid: {
            $in: routes,
          },
          sort_order: {
            $gte: lastSortNo,
          },
        },
      },
      {
        $project: {
          counter_uuid: 1,
          counter_title: 1,
          route_uuid: 1,
          sort_order: 1,
        },
      },
      {
        $lookup: {
          from: "completed_orders",
          let: {
            counter_field: "$counter_uuid",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$$counter_field", "$counter_uuid"],
                },
              },
            },
            {
              $unwind: {
                path: "$status",
                includeArrayIndex: "index",
                preserveNullAndEmptyArrays: false,
              },
            },
            {
              $match: {
                index: 0,
                "status.time": {
                  $gte: new Date(+date_range?.from_date).setHours(0, 0, 0, 0),
                  $lt: new Date(+date_range?.to_date).setHours(23, 59, 59, 999),
                },
              },
            },
            {
              $replaceRoot: {
                newRoot: {
                  item_details: "$item_details",
                },
              },
            },
          ],
          as: "order",
        },
      },
      {
        $unwind: {
          path: "$order",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $addFields: {
          item_details: "$order.item_details",
          order: null,
        },
      },
      {
        $unwind: {
          path: "$item_details",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $lookup: {
          from: "items",
          localField: "item_details.item_uuid",
          foreignField: "item_uuid",
          let: {
            companies: companies,
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$company_uuid", "$$companies"],
                },
              },
            },
          ],
          as: "item",
        },
      },
      {
        $unwind: {
          path: "$item",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $addFields: {
          new_item: {
            item_total: "$item_details.item_total",
            company_uuid: "$item.company_uuid",
            b: "$item_details.b",
            p: "$item_details.p",
          },
          item: null,
          item_details: null,
        },
      },
      {
        $group: {
          _id: "$counter_uuid",
          item_details: {
            $push: "$new_item",
          },
          counter_title: {
            $first: "$counter_title",
          },
          route_uuid: {
            $first: "$route_uuid",
          },
          sort_order: {
            $first: "$sort_order",
          },
        },
      },
      {
        $sort: {
          sort_order: 1,
          counter_title: 1,
          counter_id: 1,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ];

    const counters = await Counters.aggregate(aggregate);

    res.json({ success: true, result: counters });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/counter-special-prices/:item_uuid", async (req, res) => {
  try {
    const pipeline = [
      // {
      // 	$sort: {
      // 		counter_title: 1
      // 	}
      // },
      // {
      // 	$match: {
      // 		counter_title: {
      // 			$gt: "AADARSH PAN"
      // 		}
      // 	}
      // },
      {
        $unwind: {
          path: "$item_special_price",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $match: {
          "item_special_price.item_uuid": req.params.item_uuid,
        },
      },
      {
        $lookup: {
          from: "routes",
          localField: "route_uuid",
          foreignField: "route_uuid",
          pipeline: [
            {
              $project: {
                route_title: 1,
              },
            },
          ],
          as: "route",
        },
      },
      {
        $unwind: {
          path: "$route",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $project: {
          counter_uuid: 1,
          counter_title: 1,
          route_title: "$route.route_title",
          special_price: "$item_special_price.price",
        },
      },
      {
        $sort: {
          counter_title: 1,
        },
      },
    ];
    const data = await Counters.aggregate(pipeline);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
