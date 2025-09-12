const express = require("express");
const router = express.Router();

const {getWallet, getWalletAdmin} = require("../controllers/walletcontroller");

const Auth = require("../middlewares/Auth");
const AdminAuth = require("../middlewares/AdAuth");

// ✅ Get wallet by user/admin
router.get("/", Auth, getWallet);
router.get("/admin", AdminAuth, getWalletAdmin);

module.exports = router;