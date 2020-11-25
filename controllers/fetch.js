const fetchRouter = require('express').Router()
const Portfolio = require('../models/portfolio')

//Fetching portfolio
//Endpoint: '/api/fetch/portfolio'
fetchRouter.get('/portfolio', async (request,response) => {
    let pfolio = await Portfolio.find().select('-_id -trades -__v')
    response.send(pfolio)
})

//Fetching trades
//Endpoint: '/api/fetch/trades'
fetchRouter.get('/trades', async (request, response) => {
    let trade = await Portfolio.find().select('-_id -avgBuyPrice -shares -__v').populate('trades','-id -__v -ticker')
    response.send(trade)
})

//Fetching returns
//Endpoint: '/api/fetch/returns'
fetchRouter.get('/returns', async (request, response) => {
    const current_price = 100
    let returns = await Portfolio.aggregate(
        [
            {
                $match: {}
            },
            {
                $group: {
                    _id: "",
                    total: {$sum: {$multiply: [{$subtract: [current_price, "$avgBuyPrice"]}, "$shares"]}}
                }
            },
            {
                $project: {
                    _id: 0,
                    total: "$total"
                }
            }
        ]
    )
    response.send(returns)
})

module.exports = fetchRouter