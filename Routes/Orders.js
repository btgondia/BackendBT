const express = require("express");
const router = express.Router();
const fs = require("fs");
const { v4: uuid, v4 } = require("uuid");
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
const Trips = require("../Models/Trips");
const Routes = require("../Models/Routes");
const CancelOrders = require("../Models/CancelOrders");
const WarehouseModel = require("../Models/Warehouse");
const Vochers = require("../Models/Vochers");
const whatsapp_notifications = require("../Models/whatsapp_notifications");
const Campaigns = require("../Models/Campaigns");
const ItemCategories = require("../Models/ItemCategories");
const { getReceipts, getRunningOrders, getDate } = require("../modules/index");
const { sendMessages, compaignShooter } = require("../modules/messagesHandler");
const { generatePDFs, getFileName } = require("../modules/puppeteerUtilities");
const CounterCharges = require("../Models/CounterCharges");
const {
  getOrderStage,
  updateCounterClosingBalance,
  updateItemStock,
  truncateDecimals,
  increaseNumericString,
  removeCommas,
} = require("../utils/helperFunctions");
const AccountingVouchers = require("../Models/AccountingVoucher");
const CreditNotes = require("../Models/CreditNotes");
let ledger_list = [
  {
    value: 0,
    local_sale_ledger: "388c5597-4f43-4dfc-9baf-ac0f657535ce",
    central_sale_ledger: "32c3c571-fd82-4af6-a1b2-a8f2a3b9c92e",
  },
  {
    value: 5,
    ledger_uuid: [
      "036d4761-e375-4cae-b826-f2c154b3403b",
      "e13f277a-d700-4137-9395-c62598f26513",
    ],
    local_sale_ledger: "1caf98e1-63c0-417c-81c8-fe85657f82e5",
    central_sale_ledger: "8a0cac47-9eb6-40df-918f-ea744e1a142f",
    sale_igst_ledger: "f732ba11-c4fc-40c3-9b57-0f0e83e90c75",
  },
  {
    value: 12,
    ledger_uuid: [
      "b997b4f4-8baf-443c-85b9-0cfcccb013fd",
      "93456bbd-ffbe-4ce6-a2a7-d483c7917f92",
    ],
    local_sale_ledger: "a48035a8-f9c3-4232-8f5b-d168850c016d",
    central_sale_ledger: "6ba8115e-cc94-49f6-bd5b-386f000f8c1d",
    sale_igst_ledger: "61ba70f5-9de6-4a2e-8ace-bd0856358c42",
  },
  {
    value: 18,
    ledger_uuid: [
      "ed787d1b-9b89-44e5-b828-c69352d1e336",
      "28b8428f-f8f3-404f-a696-c5777fbf4096",
    ],
    local_sale_ledger: "81df442d-4106-49de-8a45-649c1ceb00ef",
    central_sale_ledger: "3732892f-d5fa-415b-b72c-3e2d338e0e3f",
    sale_igst_ledger: "2d4f7d50-8c2e-457e-817a-a811bce3ac8d",
  },
  {
    value: 28,
    ledger_uuid: [
      "17612833-5f48-4cf8-8544-c5a1debed3ae",
      "60b6ccb7-37e4-40b2-a7d9-d84123c810e7",
    ],
    local_sale_ledger: "b00a56db-344d-4c08-9d9a-933ab9ee378d",
    central_sale_ledger: "aeae84fa-e4ce-4480-8448-250134d12004",
    sale_igst_ledger: "6aa3f24a-3572-4825-b884-59425f7edbe7",
  },
];
const createAutoCreditNote = async (
  order,
  item_uuid,
  voucher_date = new Date().getTime()
) => {
  let price =
    +(order.replacement || 0) +
    +(order.shortage || 0) +
    +(order.adjustment || 0);
  console.log({ price });
  let narration =
    (order.replacement ? "Replacement: " + order.replacement : "") +
    (order.shortage ? " Shortage: " + order.shortage : "") +
    (order.adjustment ? " Adjustment: " + order.adjustment : "");
  console.log({ narration });
  let item = await Item.findOne(
    { item_uuid },
    { conversion: 1, item_gst: 1, item_title: 1, item_hsn: 1, item_uuid: 1,item_css:1 }
  );
  item = JSON.parse(JSON.stringify(item));
  item = { ...item, item_total: 0 };

  item = {
    ...item,
    b: 1,
    price: price / +(item.conversion || 1),
    item_total: price,
  };

  let order_grandtotal = Math.round(price);
  let credit_note_order_uuid = uuid();

  await CreditNotes.create({
    ...order,
    order_grandtotal,
    old_grandtotal: order_grandtotal,
    item_details: [item],
    credit_note_order_uuid,
    ledger_uuid: order.counter_uuid,
    credit_notes_invoice_date: voucher_date,
    credit_notes_invoice_number: `CN-${order.invoice_number}`,
  });
  await createCreditNotAccountingVoucher(
    {
      ...order,
      order_grandtotal,
      item_details: [item],
      credit_note_order_uuid,
      ledger_uuid: order.counter_uuid,
      voucher_date,
    },
    "CREDIT_NOTE",
    narration
  );
};
const createCreditNotAccountingVoucher = async (order, type, narration) => {
  let counterData = await Counters.findOne(
    { counter_uuid: order.counter_uuid },
    { gst: 1 }
  );
  let gst = counterData?.gst || "";
  //check is gst starts with 27
  let isGst = gst?.startsWith("27") || !gst ? false : true;

  let arr = [];
  const css_percentage = 0;
  for (let item of order.item_details) {
    if (item.css_percentage)
      css_percentage = item.css_percentage + css_percentage;
  }
  
  arr.push({
    amount: css_percentage,
    ledger_uuid: "cf1c57e8-72cf-4d00-af57-e40b7f5d14c7",
  });
  // const gst_value = Array.from(
  //   new Set(order.item_details.map((a) => +a.gst_percentage))
  // );

  // for (let a of gst_value) {
  const data = +order.item_details[0]?.item_gst || 0;
  let amt = order.item_details[0]?.item_total || 0;

  const value = (+amt - (+amt * 100) / (100 + data)).toFixed(2);
  console.log({ value, amt });
  if (amt && value) {
    let ledger = ledger_list.find((b) => b.value === data) || {};
    arr.push({
      amount: -(amt - value).toFixed(3),
      ledger_uuid: isGst
        ? ledger?.central_purchase_ledger
        : ledger?.local_sale_ledger,
      narration,
    });
    if (isGst) {
      arr.push({
        amount: -value,
        ledger_uuid: ledger?.sale_igst_ledger,
        narration,
      });
    } else
      for (let item of ledger?.ledger_uuid || []) {
        arr.push({
          amount: -truncateDecimals(value / 2, 2),
          ledger_uuid: item,
          narration,
        });
      }
  }
  // }
  let round_off = order.round_off || 0;
  if (round_off)
    arr.push({
      amount: -round_off,
      ledger_uuid: "20327e4d-cd6b-4a64-8fa4-c4d27a5c39a0",
      narration,
    });
  arr.push({
    ledger_uuid: order.counter_uuid || order.ledger_uuid,
    amount: order.order_grandtotal || 0,
    narration,
  });

  for (let item of order.deductions || []) {
    arr.push({
      ledger_uuid: item.ledger_uuid,
      amount: -item.amount,
      narration,
    });
  }
  arr = arr.map((a) => ({
    ...a,
    amount: removeCommas(a.amount),
  }));
  let voucher_round_off = 0;
  for (let item of arr) {
    voucher_round_off = +item.amount + +voucher_round_off;
    voucher_round_off = +voucher_round_off.toFixed(3);
  }
  if (+voucher_round_off) {
    arr.push({
      ledger_uuid: "ebab980c-4761-439a-9139-f70875e8a298",
      amount: -(voucher_round_off || 0).toFixed(3),
      narration,
    });
  }
  let voucher_difference = 0;
  for (let item of arr) {
    voucher_difference = +voucher_difference + +item.amount;
    voucher_difference = +voucher_difference.toFixed(2);
    console.log({
      voucher_difference,
      amount: item.amount,
      ledger_uuid: item.ledger_uuid,
    });
  }

  const voucher = {
    accounting_voucher_uuid: uuid(),
    type: type,
    voucher_date: new Date().getTime(),
    user_uuid: order.user_uuid,
    counter_uuid: order.counter_uuid,
    order_uuid: order.credit_note_order_uuid,
    invoice_number: order.credit_notes_invoice_number,
    amount: order.order_grandtotal,
    voucher_verification: voucher_difference ? 1 : 0,
    voucher_difference,
    details: arr,
    created_at: new Date().getTime(),
  };
  await AccountingVouchers.create(voucher);
  await updateCounterClosingBalance(arr, "add");
};

const createAccountingVoucher = async ({
  order,
  type,
  voucher_date = new Date().getTime(),
  created_at = new Date().getTime(),
}) => {
  console.log({ order });
  let counterData = await Counters.findOne(
    { counter_uuid: order.counter_uuid },
    { gst: 1 }
  );
  let gst = counterData?.gst || "";
  //check is gst starts with 27
  let isGst = gst?.startsWith("27") || !gst ? false : true;
  let arr = [];
  const gst_value = Array.from(
    new Set(order.item_details.map((a) => +a.gst_percentage))
  );

  for (let a of gst_value) {
    const data = order.item_details.filter((b) => +b.gst_percentage === a);
    let amt = 0;
    for (let item of data) {
      amt = +item.item_total + +amt;
      amt = amt.toFixed(2);
    }
    const value = (+amt - (+amt * 100) / (100 + a)).toFixed(2);
    console.log({ value, amt });

    if (amt && value) {
      let ledger = ledger_list.find((b) => b.value === a) || {};
      arr.push({
        narration: `Sales Invoice ${order.invoice_number}`,
        amount: (amt - value).toFixed(3),
        ledger_uuid: isGst
          ? ledger?.central_sale_ledger
          : ledger?.local_sale_ledger,
      });
      if (isGst) {
        arr.push({
          narration: `Sales Invoice ${order.invoice_number}`,
          amount: value,
          ledger_uuid: ledger?.sale_igst_ledger,
        });
      } else {
        for (let item of ledger?.ledger_uuid || []) {
          narration: `Sales Invoice ${order.invoice_number}`,
            arr.push({
              amount: truncateDecimals(value / 2, 2),
              ledger_uuid: item,
            });
        }
      }
    }
  }
  let prevCreditNote = await CreditNotes.findOne(
    {
      credit_notes_invoice_number: `CN-${order.invoice_number}`,
    },
    { credit_note_order_uuid: 1, credit_notes_invoice_number: 1 }
  );
  if (prevCreditNote) {
    await CreditNotes.deleteOne({
      credit_note_order_uuid: prevCreditNote.credit_note_order_uuid,
    });
    await deleteAccountingVoucher(
      prevCreditNote.credit_note_order_uuid,
      prevCreditNote.credit_notes_invoice_number,
      "CREDIT_NOTE",
      false
    );
  }
  if (order?.replacement || order?.shortage || order?.adjustment) {
    await createAutoCreditNote(
      order,
      gst
        ? "7605d5e9-8165-46aa-8899-5c2d40622d30"
        : "d68051cc-573d-4721-b42e-bd226157268b",
      voucher_date
    );
  }
  let total = 0;
  for (let item of order.item_details) {
    total = +item.item_total + +total;
    total = total.toFixed(2);
  }
  if (order?.chargesTotal || 0) {
    arr.push({
      narration: `Sales Invoice ${order.invoice_number}`,
      amount: -order.chargesTotal,
      ledger_uuid: "5350c03e-fea5-4366-a09e-53131552e075",
    });
  }
  let order_total =
    +(order.order_grandtotal || 0) +
    +(order?.replacement || 0) +
    +(order?.shortage || 0) +
    +(order?.coin || 0) +
    +(order?.adjustment || 0);
  if (order.coin) {
    arr.push({
      narration: `Sales Invoice ${order.invoice_number}`,
      amount: order.coin.toFixed(2),
      ledger_uuid: "fc3ad018-b26a-4608-8e16-da1b7117e3e8",
    });
  }
  arr.push({
    narration: `Sales Invoice ${order.invoice_number}`,
    amount: (order_total - total).toFixed(2),
    ledger_uuid: "20327e4d-cd6b-4a64-8fa4-c4d27a5c39a0",
  });
  arr.push({
    narration: `Sales Invoice ${order.invoice_number}`,
    ledger_uuid: order.counter_uuid,
    amount: -order_total || 0,
  });
  arr = arr.map((a) => ({
    ...a,
    amount: removeCommas(a.amount),
  }));
  let voucher_round_off = 0;
  for (let item of arr) {
    voucher_round_off = +item.amount + +voucher_round_off;
    voucher_round_off = +voucher_round_off.toFixed(3);
  }
  if (+voucher_round_off) {
    arr.push({
      narration: `Sales Invoice ${order.invoice_number}`,
      ledger_uuid: "ebab980c-4761-439a-9139-f70875e8a298",
      amount: -(voucher_round_off || 0).toFixed(3),
    });
  }

  let voucher_difference = 0;
  for (let item of arr) {
    voucher_difference = +voucher_difference + +item.amount;
    voucher_difference = +voucher_difference.toFixed(2);
    console.log({
      voucher_difference,
      amount: item.amount,
      ledger_uuid: item.ledger_uuid,
    });
  }
  // console.log({ arr, voucher_difference });
  const voucher = {
    accounting_voucher_uuid: uuid(),
    type: type,
    voucher_date,
    user_uuid: order.user_uuid,
    counter_uuid: order.counter_uuid,
    order_uuid: order.order_uuid,
    invoice_number: order.invoice_number,
    amount: order.order_grandtotal,
    voucher_verification: voucher_difference ? 1 : 0,
    voucher_difference,
    details: arr,
    created_at,
  };
  await AccountingVouchers.create(voucher);
  await updateCounterClosingBalance(arr, "add");
};
const deleteAccountingVoucher = async (
  order_uuid,
  invoice_number,
  type,
  deletedOrder
) => {
  let voucherData = await AccountingVouchers.find({
    $or: [{ invoice_number }, { order_uuid }],
    ...(deletedOrder ? {} : { type }),
  });
  console.log(type, voucherData.length);
  if (voucherData.length) {
    for (let voucher of voucherData)
      await updateCounterClosingBalance(voucher.details, "delete");
    await AccountingVouchers.deleteMany({
      $or: [{ invoice_number }, { order_uuid }],
      ...(deletedOrder ? {} : { type }),
    });
  }
};
const updateAccountingVoucher = async (order, type) => {
  let voucherData = await AccountingVouchers.findOne({
    $or: [
      { invoice_number: order.invoice_number },
      { order_uuid: order.order_uuid },
    ],
  });
  if (voucherData) {
    await deleteAccountingVoucher(
      order.order_uuid,
      order.invoice_number,
      "SALE_ORDER"
    );
    await createAccountingVoucher({
      order,
      type,
      voucher_date: voucherData.voucher_date,
      created_at: voucherData.created_at,
    });
  }
};

const checkingOrderSkip = async (status) => {
  let order_status = status;
  let skip_stages = await Details.findOne({});
  skip_stages = skip_stages?.skip_stages || [];
  let max_stage = getOrderStage(order_status);
  let stage_exist = skip_stages.find((i) => i === max_stage);
  while (stage_exist) {
    console.log({ max_stage, stage_exist });
    if (getOrderStage(status) !== max_stage) {
      order_status.push({
        stage: max_stage,
        time: new Date().getTime(),
        user_uuid: status.find((i) => +i.stage === getOrderStage(status))
          .user_uuid,
      });
    }
    max_stage = max_stage === 3 ? 3.5 : max_stage + 1;
    stage_exist = skip_stages.find((i) => i === max_stage);
  }
  // console.log({ order_status });
  if (!order_status.find((i) => +i.stage === max_stage))
    order_status.push({
      stage: max_stage,
      time: new Date().getTime(),
      user_uuid: status.find((i) => +i.stage === getOrderStage(status))
        ?.user_uuid,
    });

  // console.log({ order_status });
  return order_status;
};

router.get("/paymentPending/:counter_uuid", async (req, res) => {
  try {
    const result = await Orders.find({
      counter_uuid: req.params.counter_uuid,
      payment_pending: 1,
    });
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.post("/postOrder", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });

    value = { ...value, order_uuid: uuid() };
    let status = await checkingOrderSkip(value.status);

    if (!value.warehouse_uuid) {
      let counterData = await Counters.findOne(
        { counter_uuid: value.counter_uuid },
        { route_uuid: 1 }
      );
      if (counterData?.route_uuid) {
        let routeData = await Routes.findOne({ route_uuid: value.route_uuid });
        if (routeData?.warehouse_uuid) {
          value = { ...value, warehouse_uuid: routeData?.warehouse_uuid };
        }
      }
    }
    if (!value.trip_uuid) {
      let counterData = await Counters.findOne(
        { counter_uuid: value.counter_uuid },
        { trip_uuid: 1 }
      );
      if (counterData?.trip_uuid) {
        let tripData = await Trips.findOne(
          { trip_uuid: counterData.trip_uuid },
          { warehouse_uuid: 1 }
        );
        value = {
          ...value,
          trip_uuid: counterData?.trip_uuid,
          warehouse_uuid:
            tripData?.warehouse_uuid || value.warehouse_uuid || "",
        };
      }
    }

    const details = await Details.findOne({});
    const _invoice_number =
      value?.order_type === "E"
        ? details?.next_estimate_number
        : details?.next_invoice_number;

    let orderStage = getOrderStage(status);

    let response;
    let incentives = 0;
    let counterGroupsData = await Counters.findOne(
      { counter_uuid: value.counter_uuid },
      { counter_group_uuid: 1 }
    );
    let itemsData = await Item.find(
      {
        item_uuid: { $in: value.item_details.map((a) => a.item_uuid) },
      },
      { item_uuid: 1, item_group_uuid: 1 }
    );

    let incentiveData = await Incentive.find({ status: 1 });
    incentiveData = JSON.parse(JSON.stringify(incentiveData));

    let user_uuid = status.find((c) => +c.stage === 1)?.user_uuid;
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
            let itemData = await Item.findOne(
              {
                item_uuid: item.item_uuid,
              },
              { conversion: 1, item_uuid: 1 }
            );
            amt =
              +amt +
              ((+item.b * +itemData?.conversion || 0) + item.p) *
                +incentive_item.value;
          }
        }

        incentives = +incentives + +amt.toFixed(2);
      }
    }

    if (orderStage >= 3.5) {
      await updateItemStock(
        value?.warehouse_uuid,
        value?.item_details,
        value?.order_uuid
      );
    }

    if (+orderStage === 4 || +orderStage === 5) {
      let next_receipt_number = await Details.find({});
      next_receipt_number = next_receipt_number[0].next_receipt_number;
      let time = new Date();
      await Receipts.create({
        ...value,
        time: time.getTime(),
        receipt_number: next_receipt_number,
        invoice_number: _invoice_number || 0,
      });
      next_receipt_number = increaseNumericString(next_receipt_number);
      await Details.updateMany({}, { next_receipt_number });

      if (value.OutStanding) {
        let time = new Date();
        let outstandingObj = {
          time: time.getTime(),
          counter_uuid: value.counter_uuid,
          user_uuid: value.user_uuid,
          order_uuid: value.order_uuid,
          invoice_number: _invoice_number || 0,
          status: 0,
          amount: value.OutStanding,
        };
        await OutStanding.create(outstandingObj);
        await SignedBills.create({
          ...outstandingObj,
          time_stamp: outstandingObj.time,
        });
      }

      if (!(await OrderCompleted.exists({ order_uuid: value.order_uuid }))) {
        console.log({ charges: value.counter_charges });
        response = await OrderCompleted.create({
          ...value,
          invoice_number: _invoice_number || 0,
          order_status: "R",
          entry: +orderStage === 5 ? 1 : 0,
        });
        await createAccountingVoucher({
          order: value,
          type: "SALE_ORDER",
          voucher_date: value?.status?.length
            ? value.status[0].time
            : new Date().getTime(),
        });
      }
    } else
      response = await Orders.create({
        ...value,
        invoice_number: _invoice_number || 0,
      });

    if (response) {
      const update = {};
      if (value?.order_type?.toUpperCase() === "E")
        update.next_estimate_number = increaseNumericString(_invoice_number);
      else update.next_invoice_number = increaseNumericString(_invoice_number);

      console.log({ update });
      await Details.findByIdAndUpdate(details?._id, update);

      if (value?.counter_charges?.[0]) {
        const status = +orderStage === 4 ? 1 : 2;
        const updated_data = {
          status,
          invoice_number: `${value?.order_type ?? ""}${_invoice_number}`,
        };
        if (+orderStage === 4) updated_data.completed_at = Date.now();
        await CounterCharges.updateMany(
          { charge_uuid: { $in: value?.counter_charges } },
          updated_data
        );
      }

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
          sendMessages({ counterData, WhatsappNotification, value });
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

router.put("/putOrders", async (req, res) => {
  // try {
  let response = [];
  for (let value of req.body) {
    if (!value) return res.json({ success: false, message: "Invalid Data" });
    let prevData = (
      await Orders.findOne({ invoice_number: value.invoice_number })
    )?.toObject();

    delete prevData?._id;

    value = Object.keys(value)
      .filter((key) => key !== "_id")
      .reduce((obj, key) => {
        obj[key] = value[key];
        return obj;
      }, {});
    let status = value.status;
    if (status) status = await checkingOrderSkip(value.status);

    let itemData = value?.item_details?.length
      ? await Item.find(
          {
            item_uuid: { $in: value.item_details.map((a) => a.item_uuid) },
          },
          { item_uuid: 1, item_group_uuid: 1 }
        )
      : [];

    let old_stage = prevData
      ? +Math.max.apply(
          0,
          prevData?.status?.map((a) => +a.stage)
        )
      : 0;

    let new_stage = +Math.max.apply(
      0,
      status?.map((a) => +a.stage||0)
    )||0;

    let tripData = {};
    if (value.trip_uuid) {
      tripData = (
        await Trips.findOne({ trip_uuid: value.trip_uuid })
      )?.toObject();
    }

    const warehouse_uuid = value.warehouse_uuid || tripData?.warehouse_uuid;
    if (!value?.warehouse_uuid && warehouse_uuid)
      value = await { ...value, warehouse_uuid };

    console.log({ old_stage, new_stage });
    if (warehouse_uuid && prevData?.order_uuid && new_stage >= 3) {
      if (old_stage >= 3) {
        const deletedItems = prevData?.item_details?.filter(
          (i) =>
            !value?.item_details?.find((_i) => _i.item_uuid === i.item_uuid)
        );

        if (new_stage === 5) {
          for (const i of value?.item_details) {
            old_order_item = prevData?.item_details?.find(
              (_i) => _i.item_uuid === i.item_uuid
            );
          }
        } else {
          for (const i of value?.item_details) {
            old_order_item = prevData?.item_details?.find(
              (_i) => _i.item_uuid === i.item_uuid
            );
          }
        }
      }
    }
    console.log({ old_stage, new_stage });
    if (old_stage <= 3.5 && new_stage >= 3.5) {
      await updateItemStock(
        warehouse_uuid,
        value?.item_details,
        value.order_uuid,
        old_stage === new_stage
      );
    }

    if (
      +new_stage === 4 ||
      +new_stage === 5 ||
      value?.item_details?.length === 0
    ) {
      let data = await OrderCompleted.findOne({
        order_uuid: value.order_uuid,
      });

      if (+new_stage === 5 || value?.item_details?.length === 0) {
        data = await CancelOrders.create(value);
        await updateItemStock(
          value?.warehouse_uuid,
          value?.item_details,
          value?.order_uuid,
          true
        );
        await Orders.deleteOne({ order_uuid: value.order_uuid });
        await OrderCompleted.deleteOne({ order_uuid: value.order_uuid });
        deleteAccountingVoucher(
          value.order_uuid,
          value.invoice_number,
          "SALE_ORDER",
          true
        );

        const filepath = `uploads/${getFileName(value)}`;
        if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      } else if (data) {
        await updateItemStock(
          value?.warehouse_uuid,
          value?.item_details,
          value?.order_uuid,
          true
        );
        await OrderCompleted.updateOne({ order_uuid: value.order_uuid }, value);

        updateAccountingVoucher(value, "SALE_ORDER");
      } else {
        if (!(await OrderCompleted.exists({ order_uuid: value.order_uuid }))) {
          console.log({
            charges: {
              ...prevData,
              ...value,
              entry: value?.order_type === "E" ? 2 : +new_stage === 5 ? 1 : 0,
            }.counter_charges,
          });
          data = await OrderCompleted.create({
            ...prevData,
            ...value,
            entry: value?.order_type === "E" ? 2 : +new_stage === 5 ? 1 : 0,
          });
          await createAccountingVoucher({ order: value, type: "SALE_ORDER" ,voucher_date: value?.status?.length ? value.status[0].time : new Date().getTime()});
        }

        await Orders.deleteOne({ order_uuid: value.order_uuid });
        const filepath = `uploads/${getFileName(value)}`;
        fs.access(filepath, (err) => {
          if (err) return console.log(err);
          fs.unlink(filepath, (err) => err && console.log(err));
        });
      }

      if (+new_stage === 4) {
        let counterGroupsData = await Counters.findOne(
          { counter_uuid: value.counter_uuid },
          { counter_group_uuid: 1 }
        );
        let itemsData = value?.item_details?.length
          ? await Item.find(
              {
                item_uuid: {
                  $in: value?.item_details?.map((a) => a.item_uuid) || [],
                },
              },
              { item_uuid: 1, item_group_uuid: 1 }
            )
          : [];

        let incentiveData = (await Incentive.find({ status: 1 }))?.map((i) =>
          i.toObject()
        );
        let user_range_order = status.find((c) => +c.stage === 1)?.user_uuid;
        let user_delivery_intensive = status.find(
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
            let userData = (
              await Users.findOne({ user_uuid: user_range_order })
            )?.toObject();
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
            let userData = (
              await Users.findOne({ user_uuid: user_delivery_intensive })
            )?.toObject();
            let amt = 0;
            let incentive_balance = 0;
            if (incentive_item.calculation === "amt" && incentive_item.value) {
              amt =
                (incentive_item.value / 100) *
                (value.order_grandtotal || value.order_grandtotal);
              incentive_balance = (
                +(userData.incentive_balance || 0) + amt
              ).toFixed(2);
            }
            if (incentive_item.calculation === "qty" && incentive_item.value) {
              amt =
                (incentive_item.value || 0) *
                (value.item_details.filter((a) => +a.status !== 3).length > 1
                  ? value.item_details
                      .filter((a) => +a.status !== 3)
                      .map((a) => {
                        return (
                          (+a.b *
                            +itemData.find((c) => c.item_uuid === a.item_uuid)
                              ?.conversion || 0) + a.p
                        );
                      })
                      .reduce((a, b) => a + b)
                  : value.item_details.length
                  ? (+value.item_details[0].b *
                      +itemData.find(
                        (c) => c.item_uuid === value.item_details[0].item_uuid
                      )?.conversion || 0) + value.item_details[0].p
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
                      incentive_balance: (amt / tripData?.users.length).toFixed(
                        2
                      ),
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
            let userData = (
              await Users.findOne({ user_uuid: user_range_order })
            )?.toObject();
            let amt = 0;
            let incentive_balance = 0;
            if (incentive_item.calculation === "amt" && incentive_item.value) {
              for (let item of eligibleItems) {
                amt = +amt + (incentive_item.value / 100) * item.item_total;
              }
            }
            if (incentive_item.calculation === "qty" && incentive_item.value) {
              for (let item of eligibleItems) {
                let itemData = await Item.findOne(
                  {
                    item_uuid: item.item_uuid,
                  },
                  { conversion: 1 }
                );
                amt =
                  +amt +
                  ((+item?.b * +itemData?.conversion || 0) + item.p) *
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
      if (value?.preventPrintUpdate) delete value.to_print;

      let data = await Orders.updateOne(
        { order_uuid: value.order_uuid },
        value
      );
      updateAccountingVoucher(value, "SALE_ORDER");
      if (data.acknowledged) response.push(value);
    }

    if (value?.counter_charges?.[0]) {
      const status = +new_stage === 4 ? 1 : +new_stage === 5 ? 0 : 2;
      const updated_data = {
        status,
        invoice_number: `${value?.order_type}${value?.invoice_number}`,
      };
      if (+new_stage === 4) updated_data.completed_at = Date.now();
      else if (+new_stage === 5) updated_data.invoice_number = null;
      await CounterCharges.updateMany(
        { charge_uuid: { $in: value?.counter_charges } },
        updated_data
      );
    }

    if (+new_stage === 2 && old_stage === 1) {
      const WhatsappNotification = await whatsapp_notifications.findOne({
        notification_uuid: "out-for-delivery",
      });
      const counterData = await Counters.findOne(
        { counter_uuid: value.counter_uuid },
        {
          mobile: 1,
          counter_title: 1,
          short_link: 1,
        }
      );

      if (WhatsappNotification?.status && counterData?.mobile?.length) {
        sendMessages({ value, WhatsappNotification, counterData });
      }
    }

    if (value.accept_notification || value.notifyCancellation) {
      const WhatsappNotification = await whatsapp_notifications.findOne({
        notification_uuid: value.notifyCancellation
          ? "order_cancellation"
          : +value.accept_notification
          ? "order-accept-notification"
          : "order-decline-notification",
      });

      if (WhatsappNotification?.status) {
        const counterData = await Counters.findOne(
          { counter_uuid: value.counter_uuid },
          { mobile: 1, counter_title: 1, short_link: 1 }
        );

        if (counterData?.mobile?.length) {
          sendMessages({ value, WhatsappNotification, counterData });
        }
      }
    }

    try {
      const filename = getFileName(value);
      if (fs.existsSync(`uploads/${filename}`))
        fs.unlinkSync(`uploads/${filename}`);
      await generatePDFs([{ filename, order_id: value.order_uuid }]);
    } catch (err) {
      console.log(err);
    }
  }
  if (response.length) {
    res.json({ success: true, result: response });
  } else res.json({ success: false, message: "Order Not updated" });
  // } catch (err) {
  //   console.log(err);
  //   res.status(500).json({ success: false, message: err?.message });
  // }
});

router.post("/sendMsg", async (req, res) => {
  try {
    let value = req.body;
    if (!value) return res.json({ success: false, message: "Invalid Data" });
    let WhatsappNotification = await whatsapp_notifications.findOne({
      notification_uuid: value.notification_uuid,
    });
    let counterData = await Counters.findOne(
      { counter_uuid: value.counter_uuid },
      { mobile: 1, counter_title: 1, short_link: 1 }
    );

    console.log({
      consolidated_payment_reminder: value?.consolidated_payment_reminder,
    });
    if (value?.consolidated_payment_reminder) {
      const unpaid_receipts = (await getReceipts())?.result?.filter(
        (i) => i.counter_uuid === value.counter_uuid
      );
      const orders = await Orders.find(
        { order_uuid: { $in: unpaid_receipts?.map((i) => i.order_uuid) } },
        { order_type: 1 }
      );

      WhatsappNotification.message = WhatsappNotification.message?.map((i) => ({
        ...i,
        text: i?.text
          ?.replace(
            /{details}/g,
            unpaid_receipts
              ?.sort((a, b) => +a.order_date - +b.order_date)
              ?.map(
                (_i) =>
                  `\n${getDate(+_i?.order_date)}       ${
                    orders?.find((o) => o.order_uuid === _i.order_uuid)
                      ?.order_type === "E"
                      ? "E"
                      : "N"
                  }${_i?.invoice_number}       Rs.${_i?.amt}`
              )
              ?.join("") +
              `\n*TOTAL: Rs.${unpaid_receipts?.reduce(
                (sum, _i) => sum + +_i?.amt,
                0
              )}*`
          )
          .replace(/{counter_title}/g, counterData?.counter_title),
      }));
    }

    let mobile = counterData.mobile.filter(
      (a) => a.mobile && a.lable.find((b) => b.type === "wa" && +b.varification)
    );
    if (WhatsappNotification?.status && mobile?.length) {
      sendMessages({ value, WhatsappNotification, counterData });
      res.json({ success: true, message: "Message Sent Successfully" });
    } else {
      res.json({
        success: false,
        message: "No Verified Number for this Counter ",
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err?.message });
  }
});
router.post("/copySendMessage", async (req, res) => {
  try {
    let value = req.body;
    if (!value) return res.json({ success: false, message: "Invalid Data" });
    let WhatsappNotification = await whatsapp_notifications.findOne({
      notification_uuid: value.notification_uuid,
    });
    let counterData = await Counters.findOne(
      { counter_uuid: value.counter_uuid },
      { mobile: 1, counter_title: 1, short_link: 1 }
    );

    console.log({
      consolidated_payment_reminder: value?.consolidated_payment_reminder,
    });
    if (value?.consolidated_payment_reminder) {
      const unpaid_receipts = (await getReceipts())?.result?.filter(
        (i) => i.counter_uuid === value.counter_uuid
      );
      const orders = await Orders.find(
        { order_uuid: { $in: unpaid_receipts?.map((i) => i.order_uuid) } },
        { order_type: 1 }
      );

      WhatsappNotification.message = WhatsappNotification.message?.map((i) => ({
        ...i,
        text: i?.text
          ?.replace(
            /{details}/g,
            unpaid_receipts
              ?.sort((a, b) => +a.order_date - +b.order_date)
              ?.map(
                (_i) =>
                  `\n${getDate(+_i?.order_date)}       ${
                    orders?.find((o) => o.order_uuid === _i.order_uuid)
                      ?.order_type === "E"
                      ? "E"
                      : "N"
                  }${_i?.invoice_number}       Rs.${_i?.amt}`
              )
              ?.join("") +
              `\n*TOTAL: Rs.${unpaid_receipts?.reduce(
                (sum, _i) => sum + +_i?.amt,
                0
              )}*`
          )
          .replace(/{counter_title}/g, counterData?.counter_title),
      }));
    }

    if (WhatsappNotification?.status) {
      res.json({
        success: true,
        message: "Message Sent Successfully",
        result: { value, WhatsappNotification, counterData },
      });
    } else {
      res.json({
        success: false,
        message: "No Verified Number for this Counter ",
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err?.message });
  }
});

router.post("/sendPdf", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });

    let {
      additional_users,
      additional_numbers = [],
      sendCounter = true,
    } = await value;
    if (additional_users?.length) {
      additional_users = await Users.find(
        { user_uuid: { $in: additional_users } },
        { user_mobile: 1 }
      );
      additional_numbers = await additional_numbers
        ?.concat(additional_users?.map((_i) => _i?.user_mobile))
        ?.filter(
          (_i) =>
            _i?.toString()?.length === 10 || _i?.toString()?.includes("92")
        )
        ?.map((_i) => +_i);
    }

    let counterData = await Counters.findOne(
      { counter_uuid: value.counter_uuid },
      { mobile: 1, counter_title: 1, short_link: 1 }
    );

    let mobile = counterData.mobile.filter(
      (a) => a.mobile && a.lable.find((b) => b.type === "wa" && +b.varification)
    );
    if (!mobile?.length) {
      return res.json({
        success: false,
        message: "No Verified Number for this Counter ",
      });
    }

    await compaignShooter({
      counterData: sendCounter ? counterData : {},
      value: { ...value, additional_numbers },
      options: { orderPDF: true },
    });
    res.json({ success: true, message: "Message Sent Successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put("/order_datetime", async (req, res) => {
  try {
    const data = await req.body;
    const result = await Orders.updateOne(
      { order_uuid: data.order_uuid },
      data
    );
    res.json({ success: result?.acknowledged });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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
    const page = parseInt(req.query.page) || 1; // default to page 1
    const limit = parseInt(req.query.limit) || 300; // default to 300 records per page
    const skip = (page - 1) * limit;

    let data = await OrderCompleted.find(
      { entry: 0 },
      {
        order_uuid: 1,
        counter_uuid: 1,
        invoice_number: 1,
        order_grandtotal: 1,
        item_details: 1,
        status: 1,
        replacement: 1,
        shortage: 1,
        adjustment: 1,
      }
    )
      .skip(skip)
      .limit(limit);

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
    let replacementOrder = data.find(
      (a) => a.replacement || a.shortage || a.adjustment
    );
    let result = [];
    console.log(replacementOrder);
    if (replacementOrder) {
      for (let order of data) {
        if (order.replacement || order.shortage || order.adjustment) {
          let counterData = await Counters.findOne(
            { counter_uuid: order.counter_uuid },
            { gst: 1 }
          );

          let detailsData = await Details.findOne(
            {},
            { sr_if_gst: 1, sr_if_nongst: 1 }
          );
          let itemData = await Item.findOne(
            {
              item_uuid: counterData.gst
                ? detailsData?.sr_if_gst
                : detailsData?.sr_if_nongst,
            },
            { conversion: 1, item_code: 1 }
          );
          let receipt = receiptData?.find(
            (b) =>
              b.invoice_number === order.invoice_number ||
              (b.order_uuid === order.order_uuid &&
                b.counter_uuid === order.counter_uuid)
          );
          console.log(itemData);
          result.push({
            ...order,
            modes: receipt?.modes || [],
            item_code: itemData?.item_code || "",
            conversion: itemData?.conversion || "",
            counter_uuid: order?.counter_uuid || receipt?.counter_uuid || "",
            unpaid:
              outstandindData?.find(
                (b) =>
                  b.invoice_number === order.invoice_number ||
                  (b.order_uuid === order.order_uuid &&
                    b.counter_uuid === order.counter_uuid)
              )?.amount || 0,
          });
        } else {
          let receipt = receiptData?.find(
            (b) =>
              b.invoice_number === order.invoice_number ||
              (b.order_uuid === order.order_uuid &&
                b.counter_uuid === order.counter_uuid)
          );

          result.push({
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
          });
        }
      }
    } else {
      result = data.map((order) => {
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
      });
    }

    res.json({
      success: true,
      result,
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
    if (value?.item_details?.length) {
      await updateItemStock(
        value?.warehouse_uuid,
        value?.item_details,
        value?.order_uuid,

        true
      );
    }
    let data = await OrderCompleted.updateOne(
      { invoice_number: value.invoice_number },
      value
    );
    if (data.acknowledged) {
      if (value?.item_details?.length)
        updateAccountingVoucher(value, "SALE_ORDER");
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
    const result = await getRunningOrders({
      user_uuid: req.params.user_uuid,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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
      { category_uuid: { $in: itemData?.map((a) => a.category_uuid) } },
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
              itemData?.find((b) => b.item_uuid === a.item_uuid).category_uuid
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
    let { invoice_number } = req.body;
    invoice_number = invoice_number.toString() || "";
    console.log(invoice_number);
    let data = await Orders.find({
      invoice_number: { $regex: new RegExp(invoice_number) },
    });

    let completedData = await OrderCompleted.find({
      invoice_number: { $regex: new RegExp(invoice_number) },
    });

    let CaceledData = await CancelOrders.find({
      invoice_number: { $regex: new RegExp(invoice_number) },
    });

    data = JSON.parse(JSON.stringify(data));
    completedData = JSON.parse(JSON.stringify(completedData));
    CaceledData = JSON.parse(JSON.stringify(CaceledData));
    let result = [...data, ...completedData, ...CaceledData];

    res.json({
      success: true,
      result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.post("/GetOrderProcessingList", async (req, res) => {
  try {
    let data = [];
    let { trip_uuid } = req.body;

    data = await Orders.find({
      status: { $elemMatch: { stage: 1 } },
      trip_uuid: +trip_uuid === 0 ? { $exists: false } : trip_uuid,
    });
    data = JSON.parse(JSON.stringify(data));
    data = data.filter((a) => getOrderStage(a.status) === 1);

    let counterData = await Counters.find(
      {
        counter_uuid: {
          $in: data.filter((a) => a.counter_uuid).map((a) => a.counter_uuid),
        },
      },
      {
        counter_title: 1,
        route_uuid: 1,
        sort_order: 1,
        counter_uuid: 1,
      }
    );
    let routesData = await Routes.find(
      {
        route_uuid: {
          $in:
            [
              ...new Set(
                counterData
                  ?.filter((a) => a.route_uuid)
                  ?.map((a) => a.route_uuid)
              ),
            ] || [],
        },
      },
      {
        route_title: 1,
        route_uuid: 1,
      }
    );
    result = data.map((a) => {
      let counter =
        counterData?.find((b) => b?.counter_uuid === a?.counter_uuid) || {};
      return {
        ...a,
        route_title: routesData?.find(
          (b) => b?.route_uuid === counter?.route_uuid
        )?.route_title,
        counter_title: a.counter_uuid ? counter?.counter_title : "",
        sort_order: a.counter_uuid ? counter?.sort_order : "",
      };
    });

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

    data = await Orders.find({
      status: { $elemMatch: { stage: 2 } },
      trip_uuid: +trip_uuid === 0 ? { $exists: false } : trip_uuid,
    });
    data = JSON.parse(JSON.stringify(data));
    data = data.filter((a) => getOrderStage(a.status) === 2);
    let counterData = await Counters.find(
      {
        counter_uuid: {
          $in: data.filter((a) => a.counter_uuid).map((a) => a.counter_uuid),
        },
      },
      {
        counter_title: 1,
        route_uuid: 1,
        sort_order: 1,
        counter_uuid: 1,
      }
    );
    let routesData = await Routes.find(
      {
        route_uuid: {
          $in:
            [
              ...new Set(
                counterData
                  ?.filter((a) => a.route_uuid)
                  ?.map((a) => a.route_uuid)
              ),
            ] || [],
        },
      },
      {
        route_title: 1,
        route_uuid: 1,
      }
    );
    result = data.map((a) => {
      let counter =
        counterData?.find((b) => b?.counter_uuid === a?.counter_uuid) || {};
      return {
        ...a,
        route_title: routesData?.find(
          (b) => b?.route_uuid === counter?.route_uuid
        )?.route_title,
        counter_title: a.counter_uuid ? counter?.counter_title : "",
        sort_order: a.counter_uuid ? counter?.sort_order : "",
      };
    });

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
    let { trip_uuid, user_uuid } = req.body;

    data = await Orders.find({
      status: { $elemMatch: { stage: 3 } },
      trip_uuid: +trip_uuid === 0 ? { $exists: false } : trip_uuid,
    });
    data = JSON.parse(JSON.stringify(data));
    data = data.filter((a) => getOrderStage(a.status) === 3);
    let counterData = await Counters.find(
      {
        counter_uuid: {
          $in: data.filter((a) => a.counter_uuid).map((a) => a.counter_uuid),
        },
      },
      {
        counter_title: 1,
        route_uuid: 1,
        sort_order: 1,
        counter_uuid: 1,
        credit_allowed: 1,
      }
    );
    let routesData = await Routes.find(
      {
        route_uuid: {
          $in:
            [
              ...new Set(
                counterData
                  ?.filter((a) => a.route_uuid)
                  ?.map((a) => a.route_uuid)
              ),
            ] || [],
        },
      },
      {
        route_title: 1,
        route_uuid: 1,
      }
    );
    result = data.map((a) => {
      let counter =
        counterData?.find((b) => b?.counter_uuid === a?.counter_uuid) || {};
      return {
        ...a,
        route_title: routesData?.find(
          (b) => b?.route_uuid === counter?.route_uuid
        )?.route_title,
        counter_title: a.counter_uuid ? counter?.counter_title : "",
        credit_allowed: a.counter_uuid ? counter?.credit_allowed : "",
        sort_order: a.counter_uuid ? counter?.sort_order : "",
      };
    });

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
    let cancelled_orders = await CancelOrders.find(
      !req.body.counter_uuid ? {} : { counter_uuid: req.body.counter_uuid }
    );

    response = await JSON.parse(JSON.stringify(response));
    cancelled_orders = await JSON.parse(JSON.stringify(cancelled_orders));
    response = response.concat(cancelled_orders || []);

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
        order.item_details.reduce((a, b) => +a + +(b.b || 0), 0) +
        ":" +
        order.item_details.reduce((a, b) => +a + +(b.p || 0), 0),
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
      "status.time": { $gt: value.startDate, $lt: endDate },
      warehouse_uuid: value.warehouse_uuid,
    });

    let responseVoucher = await Vochers.find(
      {
        "item_details.item_uuid": value.item_uuid,
        $or: [
          { from_warehouse: value.warehouse_uuid },
          { to_warehouse: value.warehouse_uuid },
        ],
      },
      {
        status: 1,
        counter_uuid: 1,
        invoice_number: 1,
        order_grandtotal: 1,
        item_details: 1,
      }
    );
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
      { counter_uuid: 1, counter_title: 1 }
    );
    const warehouseData = await WarehouseModel.find({});
    responseVoucher = JSON.parse(JSON.stringify(responseVoucher));
    responseVoucher = responseVoucher?.filter(
      (order) =>
        order.created_at > value.startDate && order.created_at < endDate
    );
    let data = [];
    let total = {
      addedB: 0,
      addedP: 0,
      reduceB: 0,
      reduceP: 0,
    };
    for (let item of response) {
      let orderItem = item?.item_details?.find(
        (a) => a.item_uuid === value.item_uuid
      );
      if (orderItem?.b || orderItem?.p) {
        total = {
          addedB: total.addedB,
          addedP: total.addedP,
          reduceB: total.reduceB + orderItem?.b,
          reduceP: total.reduceP + orderItem?.p,
        };
        let obj = {
          date: item?.status?.find((a) => +a.stage === 1)?.time,
          to: counterData?.find((a) => a.counter_uuid === item.counter_uuid)
            ?.counter_title,
          added: 0,
          invoice_number: item.invoice_number,
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
        total = {
          addedB: total.addedB + (added ? orderItem?.b : 0),
          addedP: total.addedP + (added ? orderItem?.p : 0),
          reduceB: total.reduceB + (added ? 0 : orderItem?.b),
          reduceP: total.reduceP + (added ? 0 : orderItem?.p),
        };

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
      res.json({ success: true, result: data, total });
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

router.get("/deductions-report", async (req, res) => {
  try {
    const { from_date, to_date } = req.query;
    const pipeline = [
      {
        $match: {
          $or: [
            {
              replacement: {
                $gt: 0,
              },
            },
            {
              shortage: {
                $gt: 0,
              },
            },
            {
              adjustment: {
                $gt: 0,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$status",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $match: {
          "status.stage": "3",
          "status.time": {
            $gte: +from_date,
            $lt: +to_date + 1000 * 60 * 60 * 24,
          },
        },
      },
      {
        $lookup: {
          from: "counters",
          localField: "counter_uuid",
          foreignField: "counter_uuid",
          pipeline: [
            {
              $project: {
                counter_title: 1,
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
        $project: {
          counter_title: "$counter.counter_title",
          invoice_number: 1,
          replacement: 1,
          order_uuid: 1,
          shortage: 1,
          adjustment: 1,
        },
      },
      {
        $sort: {
          invoice_number: -1,
        },
      },
    ];
    const data = await OrderCompleted.aggregate(pipeline);
    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, message: err?.message });
  }
});

//getOrderListByChequeNumber
router.post("/getOrderListByChequeNumber", async (req, res) => {
  try {
    const { cheque_number } = req.body;
    //contain check no
    let data = await Receipts.find({
      "modes.remarks": { $regex: new RegExp(cheque_number) },
    });
    if (!data.length) {
      return res.json({ success: false, message: "No Data Found" });
    }
    let result = [];
    for (let item of data) {
      let orderData = await Orders.findOne({
        order_uuid: item.order_uuid,
      });
      if (!orderData)
        orderData = await OrderCompleted.findOne({
          order_uuid: item.order_uuid,
        });
      if (!orderData)
        orderData = await CancelOrders.findOne({
          order_uuid: item.order_uuid,
        });
      let counterData = await Counters.findOne({
        counter_uuid: orderData.counter_uuid,
      });
      let userData;
      if (orderData.user_uuid) {
        userData = await Users.findOne({
          user_uuid: orderData.user_uuid,
        });
      }
      orderData = JSON.parse(JSON.stringify(orderData));
      result.push({
        ...orderData,
        invoice_number: orderData.invoice_number,
        amt: orderData.order_grandtotal || 0,
        counter_title: counterData.counter_title,
        user_title: userData?.user_title,
      });
    }
    res.json({
      success: true,
      result,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err?.message });
  }
});
//put comments
router.put("/putOrderComments", async (req, res) => {
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
module.exports = router;
