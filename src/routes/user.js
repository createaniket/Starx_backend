const User = require("../models/User");

const express = require("express");

const router = new express.Router();

router.post("/signup", async (req, res) => {
  try {
    const user = new User({ ...req.body });

    const token = await user.generateAuthToken();
    const Wallet = await user.CreateWallet();
    // console.log("aniwkle", token)
    const saveduser = await user.save();

    res.status(201).json({ token: token, user: saveduser, wallet: Wallet });
  } catch (error) {
    res.status(500).send(error);
    console.log(error);
  }
});

router.post("/login", async (req, res) => {
  try {
    const user = await User.findByCredentials(
      req.body.email,
      req.body.password
    );
    const token = await user.generateAuthToken();

    res.status(201).json({ token: token });
  } catch (error) {
    res.status(500).send(error);
    console.log(error);
  }
});

router.get("/getall", async (req, res) => {
  const result = await User.find({});
  res.status(200).json({result:result});
});

module.exports = router;
