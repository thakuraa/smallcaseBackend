const mongoose = require("mongoose")
const trades = require("./trades")

const portfolioSchema = new mongoose.Schema({
    tickerSymbol: {
        type: String,
        required: true,
    },
    avgBuyPrice: {
        type: Number,
        default: 0
    },
    shares: {
        type: Number,
        required: true
    },
    trades: [ 
        {
            type: mongoose.Schema.ObjectId,
            ref: 'Trades'
        }
    ]
})

module.exports = mongoose.model('Portfolio', portfolioSchema)