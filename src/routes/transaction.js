const express = require("express");
const router = express.Router();
const Auth = require("../middlewares/auth");

const { getTransaction, getUserTransactions } = require("../controllers/transactioncontroller");

// ✅ Get all transaction
router.get("/", getTransaction);

router.get("/user", Auth, getUserTransactions);


module.exports = router;