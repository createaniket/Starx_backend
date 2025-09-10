const express = require("express");
const router = express.Router();

const {getWallet} = require("../controllers/walletcontroller");

const Auth = require("../middlewares/auth");

// ✅ Get wallet by user/admin
router.get("/:ownerType", Auth, getWallet);

module.exports = router;