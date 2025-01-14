

const express = require("express");
const router = express.Router();
const Item = require("../Models/Item");

const StockTracker = require("../Models/StockTracker");

router.post("/getStockTracking", async (req, res) => {
//   try {
    let value = req.body;
    if (!value) res.json({ success: false, message: "Invalid Data" });
    
    let endDate = +value.endDate + 86400000;
    let response = await StockTracker.find({});
let result=[]
    for (let i = 0; i < response.length; i++) {
      let stock = response[i].stock;
      let warehouseStocks = [];
        for (let j = 0; j < stock.length; j++) {
            let orders = stock[j].orders;
            let warehouse_uuid = stock[j].warehouse_uuid;
            let warehouseStock = 0;
            let stockOrder = [];
            for (let k = 0; k < orders.length; k++) {
            let order = orders[k];
 
            if (order.timestamp >= value.startDate && order.timestamp <= endDate) {
                warehouseStock += order.qty;
            
                stockOrder.push(order);
            }
            }
            warehouseStocks.push({ warehouse_uuid, warehouseStock, stockOrder });
        }
        let item_uuid = response[i].item_uuid;
        let itemData= await Item.findOne({item_uuid},{item_title:1,item_uuid:1,conversion:1})
        itemData=JSON.parse(JSON.stringify(itemData))
        result.push({ ...itemData, warehouseStocks });
      
    }
 


    if (result?.length) {
      res.json({ success: true, result });
    } else res.json({ success: false, message: "Order Not Found" });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err });
//   }
});

module.exports = router;
