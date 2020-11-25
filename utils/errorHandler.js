const { request, response } = require("express")

//Errorhandler for any route that is not found
const unknownEndpoint = (request, response, next) => {
  const error = new Error('Unknown Endpoint')
  error.status = 404
  next(error)
}


const displayErrors = (error, request, response, next) => {
  response.status(error.status||500)
  response.send({message: error.message})
}

//Middleware to pass errors for async/await
const catchError = (func) => {
  return function(request, response, next){
    return func(request, response, next).catch(next)
  }
}

module.exports = {
  unknownEndpoint,
  displayErrors,
  catchError
}