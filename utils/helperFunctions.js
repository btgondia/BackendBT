const AccountingVoucher = require("../Models/AccountingVoucher");
const Counters = require("../Models/Counters");
const Ledger = require("../Models/Ledger");

function getOrderStage(status = []) {
  let numbers = status.map((item) => +item.stage);
  let max = Math.max(...numbers);
  return max;
}
const updateCounterClosingBalance = async (
  details,
  type,
  accounting_voucher_uuid
) => {
  switch (type) {
    case "add":
      for (let counter of details) {
        let counter_data = await Counters.findOne(
          { counter_uuid: counter.ledger_uuid },
          { closing_balance: 1 }
        );
        if (counter_data) {
          await Counters.updateOne(
            { counter_uuid: counter.ledger_uuid },
            {
              $inc: {
                closing_balance: +(counter.amount || 0),
              },
            }
          );
        } else if (!counter_data) {
          counter_data = await Ledger.findOne(
            {
              ledger_uuid: counter.ledger_uuid,
            },
            { closing_balance: 1 }
          );
        }
        if (counter_data) {
          await Ledger.updateOne(
            { ledger_uuid: counter.ledger_uuid },
            {
              $inc: {
                closing_balance: +(counter.amount || 0),
              },
            }
          );
        }
      }
      break;
    case "update":
      let VoucherData = await AccountingVoucher.findOne(
        { accounting_voucher_uuid: accounting_voucher_uuid },
        { details: 1 }
      );
      for (let counter of details) {
        let counter_data = await Counters.findOne(
          { counter_uuid: counter.ledger_uuid },
          { closing_balance: 1 }
        );
        let old_amount = VoucherData.details.find(
          (item) => item.ledger_uuid === counter.ledger_uuid
        ).amount;
        if (counter_data) {
          await Counters.updateOne(
            { counter_uuid: counter.ledger_uuid },
            {
              $inc: {
                closing_balance: +(counter.amount || 0) - (old_amount || 0),
              },
            }
          );
        } else if (!counter_data) {
          counter_data = await Ledger.findOne(
            {
              ledger_uuid: counter.ledger_uuid,
            },
            { closing_balance: 1 }
          );
        }
        if (counter_data) {
          await Ledger.updateOne(
            { ledger_uuid: counter.ledger_uuid },
            {
              $inc: {
                closing_balance: +(counter.amount || 0) - (old_amount || 0),
              },
            }
          );
        }
      }
      break;
    case "delete":
      let voucherData = await AccountingVoucher.findOne(
        { accounting_voucher_uuid: accounting_voucher_uuid },
        { details: 1 }
      );

      for (let counter of voucherData?.details || []) {
        let counter_data = await Counters.findOne(
          { counter_uuid: counter.ledger_uuid },
          { closing_balance: 1 }
        );

        if (counter_data) {
          console.log("counter_data", counter.amount);
          await Counters.updateOne(
            { counter_uuid: counter.ledger_uuid },
            {
              $inc: {
                closing_balance: -(counter.amount || 0),
              },
            }
          );
        } else if (!counter_data) {
          counter_data = await Ledger.findOne(
            {
              ledger_uuid: counter.ledger_uuid,
            },
            { closing_balance: 1 }
          );
        }
        if (counter_data) {
          await Ledger.updateOne(
            { ledger_uuid: counter.ledger_uuid },
            {
              $inc: {
                closing_balance: -(counter.amount || 0),
              },
            }
          );
        }
      }

    default:
      break;
  }
};

module.exports = {
  getOrderStage,
  updateCounterClosingBalance,
};
