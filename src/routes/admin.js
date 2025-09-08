const express = require("express");
const Admin = require("../models/Admin");

const router = new express.Router();

// ✅ Admin Signup
router.post("/signup", async (req, res) => {
  try {
    const admin = new Admin({ ...req.body });

    const token = await admin.generateAuthToken();
    const wallet = await admin.CreateWallet();
    const savedAdmin = await admin.save();

    res.status(201).json({ token, admin: savedAdmin, wallet });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

// ✅ Admin Login
router.post("/login", async (req, res) => {
  try {
    const admin = await Admin.findByCredentials(
      req.body.email,
      req.body.password
    );
    const token = await admin.generateAuthToken();

    res.status(200).json({ token, admin });
  } catch (error) {
    res.status(400).send(error.message);
  }
});

// ✅ Get All Admins (for debugging/testing)
router.get("/getall", async (req, res) => {
  try {
    const result = await Admin.find({});
    res.send(result);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

module.exports = router;
