var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
require('dotenv').config();
const cors = require('cors');
const swaggerUI = require("swagger-ui-express");
yaml = require("yamljs");
swaggerDocument = yaml.load("./swagger.yaml")
const helmet = require("helmet");

var stocksRouter = require('./routes/stocks');
var userRouter = require('./routes/user');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(helmet());
app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const options = require("./knexfile");
const knex = require("knex")(options);

app.use((req, res, next) => {
  req.db = knex
  next()
})

app.get('/knex', function (req, res, next) {
  req.db.raw("SELECT VERSION()").then(
    (version) => console.log((version[0][0]))
  ).catch((err) => { console.log(err); throw err })
  res.send("Version Logged successfully");
});

app.use('/stocks', stocksRouter);
app.use('/user', userRouter);
app.use("/", swaggerUI.serve, swaggerUI.setup(swaggerDocument));

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
