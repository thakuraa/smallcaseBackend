const mongoose = require("mongoose")

//Centralised counter document for serialised Trade Id
const uniqueIdentifierCounterSchema = new mongoose.Schema({
    c_id: {
        type: String,
        default: "counter",
        index: true
    },
    count: {
        type: Number,
        default: 10000
    }
})

const counter = mongoose.model('counter', uniqueIdentifierCounterSchema)

const tradesSchema = new mongoose.Schema({
    t_id: {
        type: String
    },
    tradeType: {
        type: String,
        required: true,
    },
    ticker: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    }
})

//pre hook to get t_id before saving document
tradesSchema.pre('save', async function(next){
    let doc = this
    try{
        if(!doc.t_id){
            let cCount = await counter.findOneAndUpdate({
                c_id: 'counter'
            },
            {
                $inc: {
                    count: 1
                }
            },  
            {
                new: true,
                upsert: true
            })
            doc.t_id = "T"+cCount.count
        }
        next()
    } catch (err) {
        return next(err)
    }
})

module.exports = mongoose.model('Trades', tradesSchema)