const tradeRouter = require('express').Router()
const Portfolio = require("./../models/portfolio")
const Trades = require("./../models/trades")
const { check, validationResult } = require('express-validator')
const middleware = require('../utils/errorHandler')

//Add trade input sanitization and validation
const addTradeValidator = [
    check('ticker', 'Ticker is required').not().isEmpty().trim(),
    check('ticker').trim().custom(value => {
        if(value.indexOf(' ')>=0){
            throw new Error("Ticker should not have any spaces");
        }else{
            return true
        }
    }),
    check('tradeType', 'Trade type is required').not().isEmpty().trim(),
    check('buyPrice', 'Enter a valid price').isInt({ gt: 0 }),
    check('quantity', 'Enter a positive integer').isInt({ gt: 0 }),
]

//Update trade input sanitization and validation
const updateTradeValidator = [
    check('t_id', 'Trade ID is required to update trade').not().isEmpty().trim(),
    check('tradeType', 'Trade type is required').not().isEmpty().trim(),
    check('buyPrice', 'Enter a valid price').isInt({ gt: 0 }),
    check('quantity', 'Enter a positive integer').isInt({ gt: 0 }),
]

//Delete trade input sanitization and validation
const deleteTradeValidator = [
    check('t_id', 'Trade ID is required to update trade').not().isEmpty().trim()
]

//Adding a trade of type BUY/SELL
//Endpoint: '/api/trades/add'
tradeRouter.post('/add', addTradeValidator ,middleware.catchError( async (request, response) => {
    const errors = validationResult(request)
    if(!errors.isEmpty()){
        return response.status(400).json({ errors: errors.array() })
    }
    const {
        tradeType,
        buyPrice,
        quantity
    } = request.body
    
    const ticker = request.body.ticker.toUpperCase()
    if(tradeType.toUpperCase()!=='BUY' && tradeType.toUpperCase()!=='SELL'){
        return response.status(400).json({ errors: [{
            "msg": "Trade type should either be BUY or SELL"
        }]})
    }
    //SELL trade
    if(tradeType.toUpperCase()==='SELL'){
        let tickerHolding = await Portfolio.findOne({ tickerSymbol: ticker })
        if(!tickerHolding){
            return response.status(400).json({ errors: [{
                "msg": "Ticker not in portfolio"
            }]})
        }else if(tickerHolding.shares<quantity){
            return response.status(400).json({ errors: [{
                "msg": "Cannot sell more than in portfolio"
            }]})
        }else{
            //creating new trade
            let trades = new Trades({
                tradeType: tradeType.toUpperCase(),
                ticker: ticker,
                price: buyPrice,
                quantity: quantity
            })
            await trades.save()
            tickerHolding.shares -= quantity
            tickerHolding.trades.push(trades)
            await tickerHolding.save()
            return response.send(trades)
        }
    }
    //BUY trade
    else{
        let trades = new Trades({
            tradeType: tradeType,
            ticker: ticker,
            price: buyPrice,
            quantity: quantity
        })
        let tickerHolding = await Portfolio.findOne({ tickerSymbol: ticker })
        if(!tickerHolding){
            //creating new ticker
            const portfolio = new Portfolio({
                tickerSymbol: ticker,
                avgBuyPrice: buyPrice,
                shares: quantity
            })
            await trades.save()
            portfolio.trades.push(trades)
            await portfolio.save()
            return response.send(trades)  
        }else{
            await trades.save()
            //Calculating weighted average
            tickerHolding.avgBuyPrice = ((tickerHolding.avgBuyPrice*tickerHolding.shares) + (buyPrice*quantity))/(tickerHolding.shares+quantity)
            tickerHolding.shares += quantity
            tickerHolding.trades.push(trades)
            await tickerHolding.save() 
            return response.send(trades)
        }
    }
}))

//Updating a trade
//Endpoint: '/api/trades/update'
tradeRouter.post('/update', updateTradeValidator, middleware.catchError( async (request, response) => {
    const errors = validationResult(request)
    if(!errors.isEmpty()){
        return response.status(400).json({ errors: errors.array() })
    }
    const {
        t_id,
        tradeType,
        buyPrice,
        quantity
    } = request.body
    const oldTrade = await Trades.findOne({ t_id: t_id })
    if(!oldTrade){
        return response.status(400).json({ errors: [{
            "msg": "Trade does not exist"
        }]})
    }
    const pfolio = await Portfolio.findOne({ tickerSymbol: oldTrade.ticker }).populate('trades')
    //reverting trade changes on Portfolio
    if(oldTrade.tradeType.toUpperCase()==='BUY'){
        if(pfolio.shares===quantity){
            pfolio.avgBuyPrice = 0
        }else{
            pfolio.avgBuyPrice = ((pfolio.avgBuyPrice*pfolio.shares) - (oldTrade.price*oldTrade.quantity)) / (pfolio.shares - oldTrade.quantity)
        }
        pfolio.shares -= oldTrade.quantity
    }else{
        pfolio.shares += oldTrade.quantity
    }
    oldTrade.quantity = quantity
    oldTrade.price = buyPrice
    oldTrade.tradeType = tradeType
    //Adding changes to portfolio
    //Trade type BUY
    if(oldTrade.tradeType.toUpperCase()==='BUY'){
        pfolio.avgBuyPrice = ((pfolio.avgBuyPrice*pfolio.shares) + (oldTrade.price*oldTrade.quantity))/(pfolio.shares+oldTrade.quantity)
        pfolio.shares += oldTrade.quantity
        await oldTrade.save()
        await pfolio.save()
        return response.send(oldTrade)
    }
    //Trade type SELL
    else{
        if(pfolio.shares<oldTrade.quantity){
            return response.status(400).json({ errors: [{
                "msg": "Cannot sell more than in portfolio"
            }]})
        }else{
            pfolio.shares -= oldTrade.quantity
            await oldTrade.save()
            await pfolio.save()
            return response.send(oldTrade)
        }
    }
}))

//Deleting a trade
//Endpoint: '/api/trades/delete'
tradeRouter.post('/delete', deleteTradeValidator, middleware.catchError( async (request, response) => {
    const errors = validationResult(request)
    if(!errors.isEmpty()){
        return response.status(400).json({ errors: errors.array() })
    }
    const t_id = request.body.t_id
    const oldTrade = await Trades.findOne({ t_id: t_id })
    if(!oldTrade){
        return response.status(400).json({ errors: [{
            "msg": "Trade does not exist"
        }]})
    }
    const pfolio = await Portfolio.findOne({ tickerSymbol: oldTrade.ticker }).populate('trades')
    //Reverting trade changes to portfolio
    if(oldTrade.tradeType.toUpperCase()==='BUY'){
        if(pfolio.shares<oldTrade.quantity){
            return response.status(400).json({ errors: [{
                "msg": "Doing this will turn your make your number of shares negative"
            }]})
        }
        else if(pfolio.shares===oldTrade.quantity){
            pfolio.avgBuyPrice = 0
        }else{
            pfolio.avgBuyPrice = ((pfolio.avgBuyPrice*pfolio.shares) - (oldTrade.price*oldTrade.quantity)) / (pfolio.shares - oldTrade.quantity)
        }
        pfolio.shares -= oldTrade.quantity
    }else{
        pfolio.shares += oldTrade.quantity
    }
    //deleting trade
    await oldTrade.deleteOne()
    await pfolio.save()
    return response.send(pfolio)
}))

module.exports = tradeRouter 