const mongoose = require("mongoose")

const tickerSchema = new mongoose.Schema({
    tickerSymbol: {
        type: String,
        required: true,
        index: true,
        unique: true
    },
    company: {
        type: String,
        required: true,
        unique: true
    }
})

module.exports = mongoose.model('Tickers', tickerSchema)