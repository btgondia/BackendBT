const express = require("express");
const { v4: uuid } = require("uuid");
const router = express.Router();
const Receipts = require("../Models/Receipts");
const Details = require("../Models/Details");
const CashRegister = require("../Models/cash_register");
const cash_register_transections = require("../Models/cash_register_transections");
const PaymentModes = require("../Models/PaymentModes");
const AccountingVoucher = require("../Models/AccountingVoucher");
const { updateCounterClosingBalance, increaseNumericString, getMidnightTimestamp } = require("../utils/helperFunctions");
const Counters = require("../Models/Counters");
const { paymentModeIDs } = require("../utils/constants")
const { receiptPipelines } = require("../pipelines");
const Routes = require("../Models/Routes");

const createAccountingVoucher = async (order, type, recept_number) => {
  for (let [i, a] of (order.modes || []).entries()) {
    const arr = [];
    const data = await PaymentModes.findOne(
      { mode_uuid: a.mode_uuid },
      { ledger_uuid: 1, mode_title: 1 }
    );
    let narration = `Received ${data.mode_title} for Inv. No. ${
      order.invoice_number ?? ""
    }${
      a.mode_uuid === "c67b5794-d2b6-11ec-9d64-0242ac120002"
        ? " , Chq No. " + a.remarks
        : ""
    }`;
    if (+a.amt) {
      arr.push({
        amount: -(+a.amt || 0),
        ledger_uuid: data.ledger_uuid,
        narration,
      });

      arr.push({
        ledger_uuid: order.counter_uuid,
        amount: a.amt || 0,
        narration,
      });
      let voucher_round_off = 0;
      for (let item of arr) {
        voucher_round_off = +item.amount + +voucher_round_off;
        voucher_round_off = (voucher_round_off || 0).toFixed(2);
      }
      if (+voucher_round_off) {
        arr.push({
          ledger_uuid: "ebab980c-4761-439a-9139-f70875e8a298",
          amount: -voucher_round_off,
          narration,
        });
      }
      let voucher_difference = 0;
      for (let item of arr) {
        voucher_difference = +item.amount + +voucher_difference;
        voucher_difference = voucher_difference.toFixed(2);
      }
      const voucher = {
        accounting_voucher_uuid: uuid(),
        type: type,
        voucher_date:
          a.mode_uuid === "c67b54ba-d2b6-11ec-9d64-0242ac120002"
            ? new Date().getTime()
            : 0,
        user_uuid: order.user_uuid,
        counter_uuid: order.counter_uuid,
        order_uuid: order.order_uuid,
        invoice_number: order.invoice_number,
        recept_number: recept_number + "/" + (i + 1),
        amount: a.amt || 0,
        voucher_verification: voucher_difference ? 1 : 0,
        voucher_difference,
        details: arr,
        created_at: new Date().getTime(),
      };
      await AccountingVoucher.create(voucher);
      updateCounterClosingBalance(arr, "add");
    }
  }
};
const deleteAccountingVoucher = async (recept_number, type, order_uuid) => {
  let voucherData = await AccountingVoucher.find({
    $or: [
      {
        recept_number: {
          $in: [
            recept_number + "/1",
            recept_number + "/2",
            recept_number + "/3",
          ],
        },
      },
      { order_uuid },
    ],
    type,
  });
  if (voucherData.length) {
    for (let voucher of voucherData)
      await updateCounterClosingBalance(voucher.details, "delete");
    await AccountingVoucher.deleteMany({
      $or: [{ recept_number }, { order_uuid }],
      type,
    });
  }
};
const updateAccountingVoucher = async (order, type, recept_number) => {
  await deleteAccountingVoucher(recept_number, type, order.order_uuid);
  await createAccountingVoucher(order, type, recept_number);
};
const getCounterTagsList = async (query) => {
  const counterData = await Counters.aggregate([
    {
      $match: query
    },
    {
      $lookup: {
        from: 'receipts',
        localField: 'counter_uuid',
        foreignField: 'counter_uuid',
        pipeline: [receiptPipelines.list[0]],
        as: 'receipts'
      }
    },
    {
      $match: {
        "receipts._id": {
          $exists: false
        }
      }
    },
    {
      $project: {
        closing_balance: 1,
        counter_uuid: 1,
        route_uuid: 1,
        counter_title: 1,
        opening_balance: 1,
        transaction_tags: 1,
      }
    }
  ]);

  const default_opening_balance_date = (await Details.findOne({}, { default_opening_balance_date: 1 })).default_opening_balance_date;
  const routeData = await Routes.find(
    { route_uuid: { $in: counterData.map((a) => a.route_uuid) } },
    { route_title: 1, route_uuid: 1 }
  );
  
  const response = [];
  for (const counter of counterData) {
    if (!counter.counter_uuid || !counter.transaction_tags?.length) continue;
    const route_title = routeData.find((a) => a.route_uuid === counter.route_uuid)?.route_title || "";

    response.push({
      counter_uuid: counter.counter_uuid,
      closing_balance: counter.closing_balance,
      transaction_tags: counter.transaction_tags,
      route_title,
      title: counter.counter_title,
      ledger_group_title: "Sundry Debtors",
      opening_balance: counter?.opening_balance?.find((a) => getMidnightTimestamp(+a.date) === default_opening_balance_date)?.amount || 0
    });
  }

  return response
}

router.post("/list", async (req, res) => {
  try {
    const { pageIndex, pageSize, mode, tagSearch } = req.body

    const matchQuery = JSON.parse(JSON.stringify(receiptPipelines.list[0]))
    const counterMatchQuery = {
      status: { $ne: 0 },
      transaction_tags: {
        $elemMatch: { $regex: new RegExp(tagSearch, 'i') }
      },
    }

    const counters = await Counters.find(counterMatchQuery, { counter_uuid: 1 })

    if (tagSearch?.length > 0) {
      if (counters.length > 0) matchQuery["$match"].counter_uuid = {
        $in: counters.map(i => i.counter_uuid)
      }
      else return res.status(204).json({ data: [], totalDocuments: 0 })
    }

    const pipeline = [
      matchQuery,
      {
        $sort: { _id: 1 }
      },
      {
        $skip: +pageIndex * +pageSize
      },
      {
        $limit: +pageSize
      },
      ...receiptPipelines.list.slice(1),
      {
        $lookup: {
          from: "counters",
          localField: "counter_uuid",
          foreignField: "counter_uuid",
          pipeline: [
            {
              $project: {
                counter_title: 1,
                route_uuid: 1,
                payment_reminder_days: 1
              }
            }
          ],
          as: "counter_title"
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "user_uuid",
          foreignField: "user_uuid",
          pipeline: [
            {
              $project: {
                user_title: 1
              }
            }
          ],
          as: "user_title"
        }
      },
      {
        $lookup: {
          from: "routes",
          localField: "counter_title.route_uuid",
          foreignField: "route_uuid",
          as: "route_title"
        }
      },
      {
        $project: {
          counter_uuid: 1,
          counter_title: {
            $concat: [
              {
                $first: "$route_title.route_title"
              },
              ", ",
              {
                $first: "$counter_title.counter_title"
              }
            ]
          },
          payment_reminder_days: {
            $first:
              "$counter_title.payment_reminder_days"
          },
          invoice_number: 1,
          order_date: 1,
          payment_date: "$time",
          order_uuid: 1,
          modes: 1,
          user_title: {
            $first: "$user_title.user_title"
          }
        }
      }
    ]

    if (mode?.length > 0) {
      pipeline[0]["$match"].modes["$elemMatch"].mode_uuid = mode
      pipeline[pipeline.length - 1]["$project"].modes = {
				$filter: {
					input: "$modes",
					as: "mode",
					cond: {
						$eq: ["$$mode.mode_uuid", mode],
					},
				},
			}
    }

    const data = await Receipts.aggregate(pipeline)
    const totalDocuments = +pageIndex === 0 ? await Receipts.countDocuments(pipeline[0]["$match"]) : null
    const counterTagsList = +pageIndex === 0 && await tagSearch?.length > 0 ? getCounterTagsList(counterMatchQuery) : null

    res.setHeader("Cache-Control", 'no-store')
    res.json({
      totalDocuments,
      dataLength: data.length,
      counterTagsListLength: counterTagsList?.length,
      counterTagsList,
      data,
      paymentModeIDs: Object.values(paymentModeIDs),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err?.message });
  }
});
router.get("/counter/:counter_uuid", async (req, res) => {
  try {
    const { counter_uuid } = req.params
    const pipeline = [
      ...receiptPipelines.list.slice(0, 1),
      {
        $project: {
          modes: 1,
          order_uuid: 1,
          invoice_number: 1,
        },
      },
      ...receiptPipelines.list.slice(1),
      {
        $sort: {
          order_date: 1
        }
      },
    ]

    pipeline[0]["$match"].counter_uuid = counter_uuid
    const receipts = await Receipts.aggregate(pipeline)

    res.json({ success: true, receipts });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.get("/getPendingEntry", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = parseInt(req.query.limit) || 300; // Default to 300 records per page
    const skip = (page - 1) * limit;

    let receiptData = await Receipts.find({ entry: 0 })
      .skip(skip)
      .limit(limit);

    receiptData = JSON.parse(JSON.stringify(receiptData));
    res.json({
      success: true,
      result: receiptData,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/postReceipt", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    let cashAmount =
      value.modes.find(
        (b) => b.mode_uuid === "c67b54ba-d2b6-11ec-9d64-0242ac120002" && b.amt
      )?.amt || 0;
    let cash_register = await CashRegister.findOne({
      created_by: value.user_uuid,
      status: 1,
    });
    if (
      cash_register &&
      cash_register.created_at <
        new Date(new Date().setHours(0, 0, 0, 0)).getTime()
    ) {
      await CashRegister.updateMany(
        {
          created_by: value.user_uuid,
          status: 1,
        },
        { status: 0 }
      );
      cash_register = await CashRegister.create({
        balance: 0,
        created_by: value.user_uuid,
        register_uuid: uuid(),
        created_at: new Date(new Date().setHours(0, 0, 0, 0)).getTime(),
        status: 1,
      });
    } else if (!cash_register) {
      cash_register = await CashRegister.create({
        balance: 0,
        created_by: value.user_uuid,
        register_uuid: uuid(),
        created_at: new Date(new Date().setHours(0, 0, 0, 0)).getTime(),
        status: 1,
      });
    }

    let resciptJson = await Receipts.findOne({
      $or: [
        { invoice_number: value.invoice_number },
        { order_uuid: value.order_uuid },
      ],
    });
    if (resciptJson) {
      let { order_uuid, counter_uuid, modes } = value;
      let cashAmountTwo =
        resciptJson.modes.find(
          (b) => b.mode_uuid === "c67b54ba-d2b6-11ec-9d64-0242ac120002" && b.amt
        )?.amt || 0;
      if (cashAmount && cash_register) {
        await CashRegister.updateMany(
          {
            created_by: value.user_uuid,
            status: 1,
          },
          { $inc: { balance: cashAmount - cashAmountTwo } }
        );
        let cashTransectionExits = await cash_register_transections.findOne({
          order_uuid: value.order_uuid,
        });
        if (cashTransectionExits) {
          await cash_register_transections.updateMany(
            {
              order_uuid: value.order_uuid,
            },
            { $inc: { amount: cashAmountTwo - cashTransectionExits.amount } }
          );
        } else {
          await cash_register_transections.create({
            order_uuid: value.order_uuid,
            amount: cashAmount,
            created_at: new Date().getTime(),
            type: "in",
            register_uuid: cash_register.register_uuid,
            transaction_uuid: uuid(),
          });
        }
      }
      let pending = modes.filter((b) => +b.status === 0 && b.amt)?.length
        ? 0
        : 1;
      let response = await Receipts.updateOne(
        { order_uuid, counter_uuid },
        { modes, pending }
      );

      if (response.acknowledged) {
        res.json({ success: true, result: response });
      } else res.json({ success: false, message: "Receipts Not created" });
    } else {
      if (cashAmount && cash_register) {
        await CashRegister.updateMany(
          {
            created_by: value.user_uuid,
            status: 1,
          },
          { $inc: { balance: cashAmount } }
        );
        await cash_register_transections.create({
          order_uuid: value.order_uuid,
          amount: cashAmount,
          created_at: new Date().getTime(),
          type: "in",
          register_uuid: cash_register.register_uuid,
          transaction_uuid: uuid(),
        });
      }
      let next_receipt_number = await Details.find({});

      next_receipt_number = next_receipt_number[0].next_receipt_number;

      let pending = value.modes.filter((b) => +b.status === 0 && b.amt)?.length
        ? 0
        : 1;
      let response = await Receipts.create({
        ...value,
        receipt_number: next_receipt_number,
        time: new Date().getTime(),
        pending,
        invoice_number: value.invoice_number,
      });
      await createAccountingVoucher(
        value,
        "RECEIPT_ORDER",
        next_receipt_number
      );
      next_receipt_number = increaseNumericString(next_receipt_number);
      await Details.updateMany({}, { next_receipt_number });
      if (response) {
        res.json({ success: true, result: response });
      } else res.json({ success: false, message: "Receipts Not created" });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/getReceipt", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });

    let response = await Receipts.findOne({
      $or: [
        { invoice_number: value.invoice_number },
        { order_uuid: value.order_uuid },
      ],
    });

    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Receipts Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/getSingleRecipt", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    let { order_uuid, counter_uuid, receipt_number } = value;
    let response = await Receipts.findOne({
      order_uuid,
      counter_uuid,
      receipt_number,
    });

    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Receipts Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/putReceipt", async (req, res) => {
  // try {
  let value = req.body;
  if (!value) res.json({ success: false, message: "Invalid Data" });
  let { order_uuid, counter_uuid, modes, entry = 1 } = value;
  let modesTotal = modes.reduce((a, b) => a + +b.amt, 0);
  let prevData = await Receipts.findOne({ order_uuid, counter_uuid });
  if (prevData) {
    if (!modesTotal) {
      await Receipts.deleteMany({ order_uuid, counter_uuid });
      await deleteAccountingVoucher(
        prevData.receipt_number,
        "RECEIPT_ORDER",
        order_uuid
      );
      return res.json({ success: true, message: "Receipts Deleted" });
    }

    let response = await Receipts.updateOne(
      { order_uuid, counter_uuid },
      { modes, entry }
    );

    if (response.acknowledged) {
      let receipt_number = await Receipts.findOne(
        { order_uuid, counter_uuid },
        { receipt_number: 1 }
      );
      receipt_number = receipt_number.receipt_number;
      updateAccountingVoucher(value, "RECEIPT_ORDER", receipt_number);
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Receipts Not created" });
  } else {
    let next_receipt_number = await Details.find({});
    next_receipt_number = next_receipt_number[0].next_receipt_number;
    let pending = value.modes.filter((b) => +b.status === 0 && b.amt)?.length
      ? 0
      : 1;
    let data = {
      receipt_number: next_receipt_number,
      time: new Date().getTime(),
      pending,
      invoice_number: value.invoice_number,
      order_uuid: order_uuid,
      counter_uuid: counter_uuid,
      modes,
    };
    
    let response = await Receipts.create(data);
    await createAccountingVoucher(value, "RECEIPT_ORDER", next_receipt_number);
    next_receipt_number = increaseNumericString(next_receipt_number);
    await Details.updateMany({}, { next_receipt_number });
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Receipts Not created" });
  }

  // } catch (err) {
  //   res.status(500).json({ success: false, message: err });
  // }
});
router.put("/putSingleReceipt", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    let { order_uuid, counter_uuid, receipt_number } = value;
    let response = await Receipts.updateOne(
      { order_uuid, counter_uuid, receipt_number },
      value
    );

    if (response.acknowledged) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Receipts Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/putCompleteOrder", async (req, res) => {
  try {
    let value = req.body;
    
    let receiptData = await Receipts.findOne(
      { receipt_number: value.receipt_number },
      { modes: 1 }
    );
    let pending = receiptData?.modes?.find((b) => b.status === 0 && b.amt)
      ? 0
      : 1;
    let data = await Receipts.updateOne(
      { receipt_number: value.receipt_number },
      { ...value, pending }
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
router.put("/putReceiptUPIStatus", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });

    let response = await Receipts.findOne({
      $or: [
        { invoice_number: value.invoice_number },
        { order_uuid: value.order_uuid },
      ],
    });

    response = JSON.parse(JSON.stringify(response));
    response = response.modes.map((a) =>
      a.mode_uuid === value.mode_uuid ? { ...a, status: value.status } : a
    );
    let pending = response.find((b) => b.status === 0 && b.amt) ? 0 : 1;
    let data = await Receipts.updateMany(
      { order_uuid: value.order_uuid },
      { modes: response, pending }
    );
    if (data.acknowledged) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Receipts Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/putBulkReceiptUPIStatus", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    let success = 0;
    let failed = 0;
    for (let item of value) {
      let response = await Receipts.findOne({
        $or: [
          { invoice_number: item.invoice_number },
          { order_uuid: item.order_uuid },
        ],
      });
      response = JSON.parse(JSON.stringify(response));
      response = response.modes.map((a) =>
        a.mode_uuid === item.mode_uuid ? { ...a, status: 1 } : a
      );
      let pending = response.find((b) => b.status === 0 && b.amt) ? 0 : 1;
      let data = await Receipts.updateMany(
        { order_uuid: item.order_uuid },
        { modes: response, pending }
      );
      if (data.acknowledged) success++;
      else failed++;
    }
    res.json({ success: true, result: { success, failed } });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }

});
router.put("/putRemarks", async (req, res) => {
  try {
    let value = req.body;
    
    let orderData = await Receipts.findOne({
      invoice_number: value.invoice_number,
    });
    orderData = JSON.parse(JSON.stringify(orderData));
    let modes = orderData.modes.map((a) =>
      a.mode_uuid === value.mode_uuid ? { ...a, remarks: value.remarks } : a
    );

    let data = await Receipts.updateOne(
      {
        invoice_number: value.invoice_number,
      },
      { modes }
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
router.post("/getComments", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });


    let response = await Receipts.findOne({
      order_uuid: value.order_uuid,
      counter_uuid: value.counter_uuid,

    },{
      comment:1,
      receipt_number:1,
      order_uuid:1,
      counter_uuid:1,
      receipt_number:1,
    });

    let counter_title = await Counters.findOne(
      { counter_uuid: value.counter_uuid },
      { counter_title: 1 }
    );
    response = JSON.parse(JSON.stringify(response));
    response = {
      ...response,
      counter_title: counter_title.counter_title,
    };
    if (response) {
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Receipts Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
})

module.exports = router;
