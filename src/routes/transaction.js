const express = require("express");
const router = express.Router();
const Auth = require("../middlewares/Auth");

const { getTransaction, getUserTransactions } = require("../controllers/transactioncontroller");
const AdAuth = require("../middlewares/AdAuth")

// ✅ Get all transaction
router.get("/", AdAuth, getTransaction);

router.get("/user", Auth, getUserTransactions);


module.exports = router;