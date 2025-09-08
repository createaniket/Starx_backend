const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    ownerType: {
      type: String,
      enum: ["admin", "user"],
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "ownerType", // dynamically refers to Admin/User
      required: true,
    },
    balance: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Wallet", walletSchema);
