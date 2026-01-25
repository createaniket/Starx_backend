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


router.patch("/delete-user-data/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
      id,
      {
        isDeleted: true,
        deletedAt: new Date(),
        tokens: [], // ✅ logout from all devices
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User account disabled successfully (Soft Deleted).",
      userId: user._id,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Server error while soft deleting user",
    });
  }
});


module.exports = router;
