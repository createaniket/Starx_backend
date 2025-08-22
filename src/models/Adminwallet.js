const mongoose = require("mongoose");

const AdminWalletSchema = new mongoose.Schema({
  balance: { type: Number, default: 100000 }, // initial balance
}, { timestamps: true });

module.exports = mongoose.model("AdminWallet", AdminWalletSchema);
