const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema({
  qrCode: { type: mongoose.Schema.Types.ObjectId, ref: "QRCode" },
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  amount: Number,
  from: { type: String, default: "Admin" },
  to: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  status: { type: String, enum: ["success", "failed"], default: "success" }
}, { timestamps: true });

module.exports = mongoose.model("Transaction", TransactionSchema);
