const express = require("express");
const { v4: uuid } = require("uuid");
const router = express.Router();
const Receipts = require("../Models/Receipts");
const Details = require("../Models/Details");
const CashRegister = require("../Models/cash_register");
const cash_register_transections = require("../Models/cash_register_transections");
const { getReceipts } = require("../modules/index");
const PaymentModes = require("../Models/PaymentModes");
const AccountingVoucher = require("../Models/AccountingVoucher");
const { updateCounterClosingBalance } = require("../utils/helperFunctions");

const createAccountingVoucher = async (order, type, recept_number) => {
  for (let a of order.modes || []) {
    if (!a.amt) continue;
    const arr = [];
    const data = await PaymentModes.findOne(
      { mode_uuid: a.mode_uuid },
      { ledger_uuid: 1 }
    );
    if (!data) continue;

    if (a.amt) {
      arr.push({
        amount: -(a.amt || 0),
        ledger_uuid: data.ledger_uuid,
      });
    }

    arr.push({
      ledger_uuid: order.counter_uuid,
      amount: a.amt || 0,
    });
    let voucher_round_off = (
      arr.reduce((a, b) => a + +(b.amount || 0), 0) || 0
    ).toFixed(3);
    if (voucher_round_off) {
      arr.push({
        ledger_uuid: "ebab980c-4761-439a-9139-f70875e8a298",
        amount: -voucher_round_off,
      });
    }

    const voucher = {
      accounting_voucher_uuid: uuid(),
      type: type,
      voucher_date: new Date().getTime(),
      user_uuid: order.user_uuid,
      counter_uuid: order.counter_uuid,
      order_uuid: order.order_uuid,
      invoice_number: order.invoice_number,
      recept_number,
      amount: a.amt || 0,
      voucher_verification: arr.reduce((a, b) => a + +b.amount, 0) ? 1 : 0,
      voucher_difference: arr.reduce((a, b) => a + +b.amount, 0) || 0,
      details: arr,
      created_at: new Date().getTime(),
    };
    await AccountingVoucher.create(voucher);
    updateCounterClosingBalance(arr, "add");
  }
};
const deleteAccountingVoucher = async (recept_number, type) => {
  let voucherData = await AccountingVoucher.find({
    recept_number,
    type,
  });
  console.log(type, voucherData.length);
  if (voucherData.length) {
    await AccountingVoucher.deleteMany({
      recept_number,
      type,
    });
    for (let voucher of voucherData)
      await updateCounterClosingBalance(voucher.details, "delete");
  }
};
const updateAccountingVoucher = async (order, type, recept_number) => {
  await deleteAccountingVoucher(recept_number, type);
  await createAccountingVoucher(order, type, recept_number);
};
router.get("/getPendingEntry", async (req, res) => {
  try {
    let receiptData = await Receipts.find({
      entry: 0,
    });
    receiptData = JSON.parse(JSON.stringify(receiptData));
    console.log(receiptData);
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
      console.log(cashAmountTwo);
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
      next_receipt_number = "R" + (+next_receipt_number.match(/\d+/)[0] + 1);
      await Details.updateMany({}, { next_receipt_number });
      if (response) {
        res.json({ success: true, result: response });
      } else res.json({ success: false, message: "Receipts Not created" });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/getRecipt", async (req, res) => {
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
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    let { order_uuid, counter_uuid, modes, entry = 1 } = value;
    let response = await Receipts.updateOne(
      { order_uuid, counter_uuid },
      { modes, entry }
    );

    if (response.acknowledged) {
      updateAccountingVoucher(value, "RECEIPT_ORDER", value.receipt_number);
      res.json({ success: true, result: response });
    } else res.json({ success: false, message: "Receipts Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/putSingleReceipt", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    let { order_uuid, counter_uuid, modes, entry = 1, receipt_number } = value;
    let response = await Receipts.updateOne(
      { order_uuid, counter_uuid, receipt_number },
      { modes, entry }
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
    console.log(value);
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
    console.log(response);

    response = JSON.parse(JSON.stringify(response));
    response = response.modes.map((a) =>
      a.mode_uuid === value.mode_uuid ? { ...a, status: value.status } : a
    );
    console.log(response);
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
// const updateStetus = async () => {
//   let response = await Receipts.find({});

//   response = JSON.parse(JSON.stringify(response));
//   for (let item of response) {
//     let modes = item.modes.map((a) => ({ ...a, status: 1 }));
//     let data = await Receipts.updateMany(
//       { order_uuid: item.order_uuid },
//       { modes }
//     );
//   }
//   console.log("done");
// };
// updateStetus()
router.get("/getReceipt", async (req, res) => {
  try {
    const result = await getReceipts();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err?.message });
  }
});
router.put("/putRemarks", async (req, res) => {
  try {
    let value = req.body;
    console.log(value);
    let orderData = await Receipts.findOne({
      invoice_number: value.invoice_number,
    });
    orderData = JSON.parse(JSON.stringify(orderData));
    let modes = orderData.modes.map((a) =>
      a.mode_uuid === value.mode_uuid ? { ...a, remarks: value.remarks } : a
    );

    console.log(modes);
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

module.exports = router;
