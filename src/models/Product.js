const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  name: String,
  description: String,
  imageUrl: String,   // Cloudinary URL
  qrCount: { type: Number, default: 0 },
  qrUsed: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model("Product", ProductSchema);
