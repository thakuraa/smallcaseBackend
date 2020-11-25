const express = require("express")
const app = express()
const cors = require("cors")
const fetchRouter = require("./controllers/fetch")
const tradeRouter = require("./controllers/trade")
const mongoose = require("mongoose")
const middleware = require("./utils/errorHandler")
const config = require('./utils/config')

mongoose.connect(config.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true })
  .then(() => {
    console.log('connected to MongoDB')
  })
  .catch((error) => {
    console.log('error connecting to MongoDB:', error.message)
  })

app.use(express.json())
app.use(cors())
app.use('/api/fetch', fetchRouter)
app.use('/api/trades', tradeRouter)
app.use(middleware.unknownEndpoint)
app.use(middleware.displayErrors)

const PORT = config.PORT || 3001
app.listen(PORT, () => {
    console.log(`server running on port ${PORT}`)
})