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

    res.status(201).json({ token: token , user: user });
  } catch (error) {
    res.status(500).send(error);
    console.log(error);
  }
});

router.get("/getall", async (req, res) => {
  const users = await User.find({ isDeleted: false });

  res.status(200).json({result:result});
});


router.patch("/delete-user-data", Auth, async (req, res) => {
  try {
    const user = req.user;

    user.isDeleted = true;
    user.deletedAt = new Date();
    user.tokens = [];

    await user.save();

    res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});



router.post("/logout", Auth, async (req, res) => {
  try {
    const user = req.user;
    const token = req.token;

    // ❌ Remove only current token
    user.tokens = user.tokens.filter((t) => t.token !== token);

    await user.save();

    res.status(200).json({
      success: true,
      message: "Logged out successfully (Current device)",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
});


module.exports = router;
