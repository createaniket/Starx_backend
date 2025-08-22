const QRCODE = require("../models/Qrcode");

const express = require("express");

const router = new express.Router();

const { generateQRCodes } = require("../controllers/qrcodecontroller");


router.post("/create", generateQRCodes)



module.exports = router;