const express = require("express");

var FormData = require("form-data");
const router = express.Router();
const { v4: uuid } = require("uuid");
const Campaigns = require("../Models/Campaigns");
const Counters = require("../Models/Counters");
const Notification_log = require("../Models/notification_log");
const axios = require("axios");
const fs = require("fs");
const CallMsg = async ({
  counterData = {},

  value = {},
  mobile = [],
}) => {
  let data = [];
  let file = [];
  for (let contact of counterData?.mobile) {
    if (
      contact.mobile &&
      contact?.lable?.find((a) => a.type === "wa" && +a.varification)
    ) {
      let messages = [];
      for (let messageobj of value.message) {
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
          fs.access("./uploads/" + (messageobj.uuid || "") + ".png", (err) => {
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
          });

          // messages.push({ file: messageobj.uuid + ".png" });
        }
      }
      data.push({
        contact: contact.mobile,
        messages,
      });
      await Notification_log.create({
        contact: contact.mobile,
        notification_uuid: value.notifiacation_uuid,
        messages,
        invoice_number: value.invoice_number,
        created_at: new Date().getTime(),
      });
    }
  }
  for (let contact of value?.mobile) {
    let messages = [];
    for (let messageobj of value.message) {
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
        fs.access("./uploads/" + (messageobj.uuid || "") + ".png", (err) => {
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
        });

        // messages.push({ file: messageobj.uuid + ".png" });
      }
    }
    
    data.push({
      contact: contact.mobile,
      messages,
    });
    await Notification_log.create({
      contact: contact.mobile,
      notification_uuid: value.campaign_uuid,
      messages,
      invoice_number: value.invoice_number,
      created_at: new Date().getTime(),
    });
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
};
router.post("/CreateCampaigns", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = {
      ...value,
      campaign_uuid: uuid(),
      created_at: new Date().getTime(),
    };
    if (value.type === "order") {
      let campaign_short_link = uuid().slice(0, 7);
      let verirfyshort_link = await Campaigns.findOne({}, { campaign_uuid: 1 });
      while (verirfyshort_link) {
        campaign_short_link = uuid().slice(0, 7);
        verirfyshort_link = await Campaigns.findOne(
          { campaign_short_link },
          { campaign_uuid: 1 }
        );
      }
      value = { ...value, campaign_short_link };
    }
    console.log(value);
    let response = await Campaigns.create(value);
    if (response) {
      res.json({ success: true, result: response });
    } else
      res.json({
        success: false,
        message: "Campaigns Not created",
      });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/sendMsg", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });

    let countersData = await Counters.find(
      {
        counter_uuid: {
          $in:
            value.type === "order"
              ? value?.counter_status
                  .filter((a) => value.all || !a.status)
                  .map((a) => a.counter_uuid)
              : value?.counters,
        },
      },
      { mobile: 1, counter_uuid: 1, counter_title: 1, short_link: 1 }
    );

    for (let counterData of countersData) {
      CallMsg({
        counterData,

        value,
      });
    }
    if (value.type === "order") {
      setTimeout(() => {
        for (let messageobj of value.message) {
          fs.access("./uploads/" + (messageobj.uuid || "") + ".png", (err) => {
            if (err) {
              console.log(err);
              return;
            }
            fs.unlink("./uploads/" + (messageobj.uuid || "") + ".png",(err)=>{
              if (err) {
                console.log(err);
                return;
              }
            });
          });
        }
      }, 5000);
    }
    res.json({ success: true, message: "Message Shooted Successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.delete("/DeleteCampaigns", async (req, res) => {
  try {
    let value = req.body;
    if (!value.campaign_uuid)
      res.json({ success: false, message: "Invalid Data" });

    console.log(value);
    let data = await Campaigns.findOne({
      campaign_uuid: value.campaign_uuid,
    });
    for (let item of data.message) {
      fs.access("./uploads/" + (item.uuid || "") + ".png", (err) => {
        if (err) {
          console.log(err);
          return;
        }
        fs.unlink("./uploads/" + (item.uuid || "") + ".png",(err)=>{
          if (err) {
            console.log(err);
            return;
          }
        });
      });
    }
    let response = await Campaigns.deleteMany({
      campaign_uuid: value.campaign_uuid,
    });
    if (response) {
      res.json({ success: true, result: response });
    } else
      res.json({
        success: false,
        message: "Campaigns Not Deleted",
      });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/UpdateCampaigns", async (req, res) => {
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
    for (let item of value.message.filter((a) => a.delete)) {
      fs.access("./uploads/" + (item.uuid || "") + ".png", (err) => {
        if (err) {
          console.log(err);
          return;
        }
        fs.unlink("./uploads/" + (item.uuid || "") + ".png",(err)=>{
          if (err) {
            console.log(err);
            return;
          }
        });
      });
    }
    value = { ...value, message: value.message.filter((a) => !a.delete) };
    let response = await Campaigns.updateMany(
      { campaign_uuid: value.campaign_uuid },
      value
    );
    if (response.acknowledged) {
      res.json({ success: true, result: value });
    } else
      res.json({
        success: false,
        message: "Campaigns Not created",
      });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.get("/getCampaigns", async (req, res) => {
  try {
    let response = await Campaigns.find({});
    if (response.length) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Campaigns Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

module.exports = router;
