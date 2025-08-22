const Product = require("../models/Product");

// ✅ Create a new product
exports.createProduct = async (req, res) => {
  try {
    const { name, description, imageUrl } = req.body;

    const product = new Product({
      name,
      description,
      imageUrl
    });

    await product.save();
    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Get all products
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Get single product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    res.status(200).json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Update product
exports.updateProduct = async (req, res) => {
  try {
    const { name, description, imageUrl } = req.body;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { name, description, imageUrl },
      { new: true }
    );

    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    res.status(200).json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });
    res.status(200).json({ success: true, message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Update QR usage (when QR is scanned)
exports.updateQRUsage = async (req, res) => {
  try {
    const { productId, used } = req.body; // used = true/false

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    if (used) {
      product.qrUsed += 1;
    } else {
      product.qrCount += 1;
    }

    await product.save();
    res.status(200).json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
