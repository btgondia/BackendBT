const express = require("express");
const router = express.Router();
const { v4: uuid } = require("uuid");
const CounterStockModel = require("../Models/counter_stock");



router.post("/add", async (req, res) => {
    try {
        const { session_uuid=uuid(), counter_uuid, user_uuid, details } = req.body;
        const counter_stock = new CounterStockModel({
            session_uuid,
            counter_uuid,
            user_uuid,
            details
        });
        await counter_stock.save();
        res.json({ success: true, counter_stock });
    } catch (err) {
        console.log(err);
        res.json({ success: false, message: err.message });
    }
}
);

module.exports = router;