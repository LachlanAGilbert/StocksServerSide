var express = require('express');
var router = express.Router();
const jwt = require("jsonwebtoken");

//get all stocks
router.get("/symbols", function (req, res, next) {
  //if no query return all the data
  if (Object.keys(req.query).length === 0) {
    req.db.from("stocks").distinct("name").select("symbol", "industry")
      .then((rows) => {
        res.status(200).json(rows)
      })
    return;
  }
  else {
    req.db.from("stocks").distinct("name").select("symbol", "industry").where("industry", "LIKE", "%" + req.query.industry + "%")
      .then((rows) => {
        //if anything other than industry is queried throw 400
        if (!req.query.industry) {
          throw 400
        }
        //if no results achieved throw 404
        if (rows.length === 0) {
          throw 404
        }
        //else return the data
        else {
          res.status(200).json(rows)
          return;
        }
      })
      .catch((err) => {
        if (err === 400) {
          res.status(err).json({
            "error": true,
            "message": "Invalid query parameter: only 'industry' is permitted"
          })
          return
        }
        if (err === 404) {
          res.status(err).json({
            "error": true,
            "message": "Industry sector not found"
          })
          return;
        }
      })
  }
})

//search via symbol
router.get("/:Symbol", function (req, res, next) {
  req.db.from("stocks").where("symbol", req.params.Symbol)
    .then((rows) => {
      if (req.query.to || req.query.from) {
        throw 400
      }
      if (rows.length === 0 || Object.keys(req.params.Symbol).length > 5) {
        throw 404
      }
      else {
        res.status(200).json(rows[0])
        return;
      }
    })
    .catch((err) => {
      if (err === 404) {
        res.status(404).json({
          "error": true,
          "message": "No entry for symbol in stocks database"
        })
        return
      }
      if (err === 400) {
        res.status(err).json({
          "error": true,
          "message": "Date parameters only available on authenticated route /stocks/authed"
        })
        return
      }
    })
})

//check that the searcher has a valid security token token
const authorise = (req, res, next) => {
  const authorization = req.headers.authorization
  let token = null;

  //retrieve token
  if (authorization && authorization.split(" ").length === 2) {
    token = authorization.split(" ")[1]
    console.log("Token", token)
  } else {
    res.status(403).json({
      "error": true,
      "message": "Unauthorized user"
    })
    return
  }

  //Verify JWT and check expiration date
  try {
    const decoded = jwt.verify(token, process.env.SECRETKEY)

    if (decoded.exp > Date.now()) {
      res.status(403).json({
        "error": true,
        "message": "Token expired"
      })
      return
    }

    //////Permit user to advnce too route
    next()
  } catch (e) {
    res.status(403).json({
      "error": true,
      "message": "Token is not valid:"
    })
  }
}

//authenticated search just symbol
router.get("/authed/:Symbol", authorise, function (req, res, next) {
  if (!authorise) {
    res.status(403).json({
      "error": true,
      "message": "Authorization header not found"
    })
    return
  }
  if (req.params.Symbol) {
    if (req.query.to || req.query.from) {
      if (req.query.to && req.query.from) {
        req.db.from("stocks")
          .where("symbol", "=", req.params.Symbol)
          .andWhere("timestamp", "<=", req.query.to)
          .andWhere("timestamp", ">", req.query.from)
          .then((rows) => {
            if (rows.length === 0) {
              throw 404
            }
            else {
              res.status(200).json(rows)
              return;
            }
          })
          .catch((err) => {
            if (err.errno === 1525) {
              res.status(400).json({
                "error": true,
                "message": "Parameters allowed are 'from' and 'to', example: /stocks/authed/AAL?from=2020-03-15"
              })
              return
            }
            if (err == 404) {
              res.status(err).json({
                "error": true,
                "message": "No entries available for query symbol for supplied date range"
              })
              return;
            }
          })
      }
      else if (req.query.to) {
        req.db.from("stocks")
          .where("symbol", "=", req.params.Symbol)
          .andWhere("timestamp", "<=", req.query.to)
          .then((rows) => {
            if (rows.length === 0) {
              throw 404
            }
            else {
              res.status(200).json(rows)
              return;
            }
          })
          .catch((err) => {
            if (err.errno === 1525) {
              res.status(400).json({
                "error": true,
                "message": "Parameters allowed are 'from' and 'to', example: /stocks/authed/AAL?from=2020-03-15"
              })
              return
            }
            if (err == 404) {
              res.status(err).json({
                "error": true,
                "message": "No entries available for query symbol for supplied date range"
              })
              return;
            }
          })
      }
      else if (req.query.from) {
        req.db.from("stocks")
          .where("symbol", "=", req.params.Symbol)
          .andWhere("timestamp", ">", req.query.from)
          .then((rows) => {
            if (rows.length === 0) {
              throw 404
            }
            else {
              res.status(200).json(rows)
              return;
            }

          })
          .catch((err) => {
            if (err.errno === 1525) {
              res.status(400).json({
                "error": true,
                "message": "Parameters allowed are 'from' and 'to', example: /stocks/authed/AAL?from=2020-03-15"
              })
              return
            }
            if (err == 404) {
              res.status(err).json({
                "error": true,
                "message": "No entries available for query symbol for supplied date range"
              })
              return;
            }
          })
      }
    }
    else {
      req.db.from("stocks").where({ "symbol": req.params.Symbol })
        .then((rows) => {
          if (rows.length === 0 || Object.keys(req.params.Symbol).length > 5) {
            throw 404
          }
          if (req.params.Symbol && Object.keys(req.query).length === 0) {
            res.status(200).json(rows[0])
            return;

          }
          else {
            throw 400;
          }
        })
        .catch((err) => {
          if (err.errno === 1525 || err === 400) {
            res.status(400).json({
              "error": true,
              "message": "Parameters allowed are 'from' and 'to', example: /stocks/authed/AAL?from=2020-03-15"
            })
            return
          }
          if (err === 404) {
            res.status(err).json({
              "error": true,
              "message": "No entries available for query symbol for supplied date range"
            })
            return;
          }
        })
    }
  }
})



module.exports = router;
