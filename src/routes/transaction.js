const express = require("express");
const router = express.Router();

const { getTransaction } = require("../controllers/transactioncontroller");

// ✅ Get all transaction
router.get("/", getTransaction);

module.exports = router;