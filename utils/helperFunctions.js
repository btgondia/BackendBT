const AccountingVoucher = require("../Models/AccountingVoucher");
const Counters = require("../Models/Counters");
const Item = require("../Models/Item");
const Ledger = require("../Models/Ledger");
const OrderCompleted = require("../Models/OrderCompleted");
const Orders = require("../Models/Orders");
const StockTracker = require("../Models/StockTracker");

function getOrderStage(status = []) {
  let numbers = status.map((item) => +item.stage);
  let max = Math.max(...numbers);
  return max;
}
function truncateDecimals(number, digits) {
  const stringNumber = number.toString();
  const decimalIndex = stringNumber.indexOf(".");

  if (decimalIndex === -1) {
    // If there's no decimal point, return the original number
    return number;
  }

  const truncatedString = stringNumber.slice(0, decimalIndex + 1 + digits);
  return parseFloat(truncatedString);
}
const updateCounterClosingBalance = async (
  details,
  type,
  accounting_voucher_uuid,
  ledger_uuid
) => {
  console.log("details", details);
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
              closing_balance: truncateDecimals(
                +(counter_data.closing_balance || 0) + +(counter.amount || 0),
                2
              ),
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
              closing_balance: truncateDecimals(
                +(counter_data.closing_balance || 0) + +(counter.amount || 0),
                2
              ),
            }
          );
        }
      }
      break;
    case "update":
      let VoucherData = await AccountingVoucher.findOne(
        {
          $or: [
            { accounting_voucher_uuid: accounting_voucher_uuid },
            { voucher_no: accounting_voucher_uuid },
            { order_uuid: accounting_voucher_uuid },
            { recept_number: accounting_voucher_uuid, ledger_uuid },
          ],
        },
        { details: 1 }
      );
      for (let counter of details) {
        let counter_data = await Counters.findOne(
          { counter_uuid: counter.ledger_uuid },
          { closing_balance: 1 }
        );
        let old_amount = VoucherData.details.find(
          (item) => item.ledger_uuid === counter.ledger_uuid
        )?.amount||0;
        if (counter_data) {
          await Counters.updateOne(
            { counter_uuid: counter.ledger_uuid },
            {
              closing_balance: truncateDecimals(
                +(counter_data.closing_balance || 0) +
                  +(counter.amount || 0) -
                  +(old_amount || 0),
                2
              ),
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
              closing_balance: truncateDecimals(
                +(counter_data.closing_balance || 0) +
                  +(counter.amount || 0) -
                  +(old_amount || 0),
                2
              ),
            }
          );
        }
      }
      break;
    case "delete":
      let voucherData = await AccountingVoucher.findOne(
        {
          $or: [
            { accounting_voucher_uuid: accounting_voucher_uuid },
            { voucher_no: accounting_voucher_uuid },
            { order_uuid: accounting_voucher_uuid },
            { recept_number: accounting_voucher_uuid },
          ],
        },
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
              closing_balance: truncateDecimals(
                +(counter_data.closing_balance || 0) + -(counter.amount || 0),
                2
              ),
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
              closing_balance: truncateDecimals(
                +(counter_data.closing_balance || 0) + -(counter.amount || 0),
                2
              ),
            }
          );
        }
      }

    default:
      break;
  }
};

function removeCommas(input) {
  // Check if input is not NaN and is a valid number
  if (!isNaN(input) && typeof input === "number") {
    // Convert number to string and remove commas
    return input.toString().replace(/,/g, "");
  } else if (!isNaN(parseFloat(input))) {
    // Convert string to number and remove commas
    let numberWithoutCommas = parseFloat(input.replace(/,/g, ""));
    // Check if the number is not NaN
    if (!isNaN(numberWithoutCommas)) {
      return numberWithoutCommas;
    }
  }
  return 0;
}

const updateItemStock = async (warehouse_uuid, items, order_uuid, isEdit) => {
  console.log("isEdit", isEdit);
  if (!warehouse_uuid || !items?.length) return;
  try {
    for (let item of items) {
      let itemData = (
        await Item.findOne({ item_uuid: item.item_uuid })
      )?.toObject();

      let qty = +item.b * +itemData?.conversion + +item.p + (+item.free || 0);

      let stock = itemData.stock;
      stock = stock?.filter((a) => a.warehouse_uuid === warehouse_uuid)?.length
        ? stock.map((a) =>
            a.warehouse_uuid === warehouse_uuid
              ? { ...a, qty: +a.qty - +qty }
              : a
          )
        : [
            ...(stock?.length ? stock : []),
            {
              warehouse_uuid: warehouse_uuid,
              min_level: 0,
              qty: -qty,
            },
          ];
      console.log("stockAdd", qty);
      await Item.updateOne({ item_uuid: item.item_uuid }, { stock });
    }
  } catch (error) {
    console.log(error);
  }
  if (isEdit) {
    let orderData = await OrderCompleted.findOne({ order_uuid });
    if (!orderData)
      orderData = await Orders.findOne({ order_uuid }, { item_details: 1 });
    let old_items = orderData?.item_details || [];
    console.log("old_items", old_items);
    for (let item of old_items) {
      let itemData = (
        await Item.findOne({ item_uuid: item.item_uuid })
      )?.toObject();

      let qty = +item.b * +itemData?.conversion + +item.p + (+item.free || 0);

      let stock = itemData.stock;
      stock = stock?.filter((a) => a.warehouse_uuid === warehouse_uuid)?.length
        ? stock.map((a) =>
            a.warehouse_uuid === warehouse_uuid
              ? { ...a, qty: +a.qty + +qty }
              : a
          )
        : [
            ...(stock?.length ? stock : []),
            {
              warehouse_uuid: warehouse_uuid,
              min_level: 0,
              qty: qty,
            },
          ];
      console.log("stockUpdate", qty);

      await Item.updateOne({ item_uuid: item.item_uuid }, { stock });
    }
  }
};
module.exports = {
  getOrderStage,
  updateCounterClosingBalance,
  truncateDecimals,
  removeCommas,
  updateItemStock,
};
