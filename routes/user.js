var express = require('express');
var router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

/* GET users listing. */
router.get('/', function (req, res, next) {
  res.send('respond with a resource');
});

//register a user
router.post("/register", function (req, res, next) {
  //Retrieve email and password from req.body
  const email = req.body.email
  const password = req.body.password

  if (!email || !password) {
    res.status(400).json({
      "error": true,
      "message": "Request body incomplete - email and password needed"
    })
    return;
  }

  //Determine if user already exists in table
  const queryUsers = req.db.from("users").select("*").where("email", "=", email)
  queryUsers
    .then((users) => {
      //If user does exist, return error response
      if (users.length > 0) {
        res.status(409).json({
          "error": true,
          "message": "User already exists!"
        })
        return;
      }

      const saltRounds = 10
      const hash = bcrypt.hashSync(password, saltRounds)
      return req.db.from("users").insert({ email, hash })
    })
    //If user does not exist, insert into table
    .then(() => {
      res.status(201).json({ "success": true, "message": "User created" })
    })
})

//login as a user
router.post("/login", function (req, res, next) {
  //Retrieve email and password from req.body
  const email = req.body.email
  const password = req.body.password

  //verify body
  if (!email || !password) {
    res.status(400).json({
      "error": true,
      "message": "Request body invalid - email and password are required"
    })
    return
  }

  const queryUsers = req.db.from("users").select("*").where("email", "=", email)
  queryUsers
    .then((users) => {
      //check email matches
      if (users.length == 0) {
        res.status(401).json({
          "error": true,
          "message": "Incorrect email or password"
        })
        return;
      }
      const user = users[0]
      return bcrypt.compare(password, user.hash)
    })
    .then((match) => {
      //check if password matches
      if (!match) {
        res.status(401).json({
          "error": true,
          "message": "Incorrect email or password"
        })
        return;
      }

      //create token
      const secretKey = process.env.SECRETKEY;
      const expires_in = 60 * 60 * 24
      const exp = Math.floor(Date.now() / 1000) + expires_in
      const token = jwt.sign({ email, exp }, secretKey)
      res.status(200).json({
        "token": token,
        "token_type": "Bearer",
        "expires_in": expires_in
      })
    })
})

module.exports = router;
