const QRCodeSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true }, // unique QR code string/UUID
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    amount: Number, // 10, 20, 30, 40, 50
    status: { type: String, enum: ["unused", "used"], default: "unused" },
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    usedAt: Date,
  },
  { timestamps: true }
);
