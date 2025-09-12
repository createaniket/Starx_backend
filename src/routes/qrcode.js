const QRCODE = require("../models/Qrcode");
const Auth = require("../middlewares/Auth");

const express = require("express");

const router = new express.Router();

const { generateQRCodes, redeemQRCode, getAllQRCodes } = require("../controllers/qrcodecontroller");

const AdminAuth = require("../middlewares/AdAuth");


router.post("/create",AdminAuth, generateQRCodes)
router.post('/redeem', Auth, redeemQRCode);
router.get('/all',AdminAuth, getAllQRCodes);

module.exports = router;