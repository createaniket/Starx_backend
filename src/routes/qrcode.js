const QRCODE = require("../models/Qrcode");
const Auth = require("../middlewares/Auth");

const express = require("express");

const router = new express.Router();

const { generateQRCodes, redeemQRCode, getAllQRCodes } = require("../controllers/qrcodecontroller");


router.post("/create", generateQRCodes)
router.post('/redeem', Auth, redeemQRCode);
router.get('/all', getAllQRCodes);

module.exports = router;