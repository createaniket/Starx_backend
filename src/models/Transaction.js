const mongoose = require("mongoose");


const transactionSchema = new mongoose.Schema(
  {
    qrCode: { type: mongoose.Schema.Types.ObjectId, ref: "QRCode" },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    amount: { type: Number, required: true },

    fromWallet: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet" },
    toWallet: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet" },

    status: {
      type: String,
      enum: ["success", "failed", "pending_payout", "paid"],
      default: "success",
    },

    payoutBatchDate: { type: Date }, // when it should be paid (midnight batch)
    paidAt: { type: Date },          // when payout API succeeded
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
