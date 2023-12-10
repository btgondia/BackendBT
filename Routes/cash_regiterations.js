const express = require("express");

const router = express.Router();
const { v4: uuid } = require("uuid");

const CashRegister = require("../Models/cash_register");
const cash_register_transections = require("../Models/cash_register_transections");
const CounterModel = require("../Models/Counters");
const OrderCompleted = require("../Models/OrderCompleted");
const Expenses = require("../Models/Expenses");
const Users = require("../Models/Users");
router.get("/GetAllActiveCashRegistrations/:user_id", async (req, res) => {
  try {
    let { user_id } = req.params;
    let data = await CashRegister.find({ status: 1, created_by: user_id });

    if (data.length) res.json({ success: true, result: data });
    else res.json({ success: false, message: "Cash Registrations Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/GetAllCompleteCashRegistrations", async (req, res) => {
  try {
    let { toDate = "", fromDate = "", user_uuid = "" } = req.body;
    console.log(user_uuid);
    let data = await CashRegister.find({
      status: 0,
      created_by: user_uuid,
      created_at: {
        $gte: new Date(fromDate).getTime(),
        $lte: new Date(toDate).getTime(),
      },
    });

    if (data.length) res.json({ success: true, result: data });
    else res.json({ success: false, message: "Cash Registrations Not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.post("/PostCashRegister", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    value = {
      ...value,
      register_uuid: uuid(),
      created_at: new Date().getTime(),
      status: 1,
    };

    let verification = await CashRegister.find({
      created_by: value.created_by,
      status: 1,
    });
    if (verification.length) {
      res.json({ success: false, message: "Please Settle Open Register" });
      return;
    }
    let data = await CashRegister.create(value);

    if (data) res.json({ success: true, result: data });
    else
      res.json({ success: false, message: "Cash Registrations Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/PutCashRegister", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });

    let data = await CashRegister.updateMany(
      { register_uuid: value.register_uuid },
      value
    );

    if (data.acknowledged) res.json({ success: true, result: data });
    else
      res.json({ success: false, message: "Cash Registrations Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});
router.put("/PutExpenseCashRegister", async (req, res) => {
  try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });

    let RegisterData = await CashRegister.findOne({
      register_uuid: value.register_uuid,
    });
    if (!RegisterData) {
      res.json({ success: false, message: "Invalid Data" });
      return;
    }

    let data = await CashRegister.updateMany(
      {
        register_uuid: value.register_uuid,
      },
      { $inc: { balance: -+value.amt } }
    );
    await cash_register_transections.create({
      title: value.title,
      amount: value.amt,
      created_at: new Date().getTime(),
      type: "out",
      register_uuid: value.register_uuid,
      transaction_uuid: uuid(),
      expense_uuid: value.expense_uuid,
      amount: value.amt,
      remarks: value.remarks,
    });

    if (data.acknowledged) res.json({ success: true, result: data });
    else
      res.json({ success: false, message: "Cash Registrations Not created" });
  } catch (err) {
    res.status(500).json({ success: false, message: err });
  }
});

router.get("/statement/:register_uuid", async (req, res) => {
  // try {
    const { register_uuid } = req.params;
    let transactionsData = await cash_register_transections.find({
      register_uuid,
    });
    transactionsData = JSON.parse(JSON.stringify(transactionsData));

    let result = [];
    for (let i of transactionsData) {
      if (i.type === "out") {
        let expense_data = await Expenses.findOne(
          { expense_uuid: i.expense_uuid },
          { expense_title: 1 }
        );
		console.log(i.expense_uuid,expense_data)
        if (expense_data) {
          result.push({ ...i, expense_title: expense_data.expense_title });
        } else {
          result.push(i);
        }
      } else {
        let completeData = await OrderCompleted.findOne(
          { order_uuid: i.order_uuid },
          { invoice_number: 1, counter_uuid: 1 ,status:1}
        );
        if (completeData) {
          let counter_data = await CounterModel.findOne(
            { counter_uuid: completeData.counter_uuid },
            { counter_title: 1 }
          );
          if (counter_data) {
            let user_uuid = completeData?.status?.find(a=>+a.stage===3.5).user_uuid;
            let userData = await Users.findOne(
              { user_uuid },
              { user_title: 1 }
            );
            result.push({
              ...i,
              counter_title: counter_data.counter_title,
              invoice_number: completeData.invoice_number,
              user_title: userData?.user_title||"",
            });
          } else {
            result.push({ ...i, invoice_number: completeData.invoice_number });
          }
        } else result.push(i);
      }
    }
    res.json({ result: result });
  // } catch (err) {
  //   res.status(500).json({ success: false, message: err });
  // }
});

module.exports = router;
