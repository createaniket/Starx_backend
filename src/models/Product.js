const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  name: String,
  description: String,
  imageUrl: String,   // Cloudinary URL
}, { timestamps: true });

module.exports = mongoose.model("Product", ProductSchema);
