const mongoose = require("mongoose");

const QRCodeSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true }, // unique QR code string/UUID
    amount: Number, // 10, 20, 30, 40, 50
    status: { type: String, enum: ["unused", "used"], default: "unused" },
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    qrImageUrl: String, // Cloudinary or local storage
    usedAt: Date,
  },
  { timestamps: true }
);


module.exports = mongoose.model("QRCode", QRCodeSchema);
