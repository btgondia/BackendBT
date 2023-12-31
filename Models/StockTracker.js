const mongoose = require("mongoose");

const StockTrackerSchema = new mongoose.Schema({

    item_uuid: {
        type: String
    },
    stock:[
        {
            warehouse_uuid: { type: String,  },
            qty: { type: Number,  },
            orders:[
                {
                    order_uuid: { type: String,  },
                    invoice_number: { type: String,  },
                    timestamp: { type: Number,  },
                    qty: { type: Number,  },
                }
            ]
        }
    ],

})

module.exports = mongoose.model("stock_trackers", StockTrackerSchema)
    
