const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");
const QRCodeModel = require("../models/Qrcode");
const Product = require("../models/Product");
const User = require("../models/User");
const AdminWallet = require("../models/Adminwallet");
const Transaction = require("../models/Transaction");
const mongoose = require("mongoose");

/**
 * Generate bulk QR codes for a product
 */
exports.generateQRCodes = async (req, res) => {
  try {
    const { productId, amount, count } = req.body; // count = how many QRs to generate

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    let qrCodes = [];

    for (let i = 0; i < count; i++) {
      const uniqueCode = uuidv4();

      // Save in DB
      const qr = await QRCodeModel.create({
        code: uniqueCode,
        product: productId,
        amount
      });

      // Generate QR data string (safe minimal info)
      const qrData = { id: uniqueCode, productId, amount };

      // QR Image (Base64) → only if needed in response
      const qrImage = await QRCode.toDataURL(JSON.stringify(qrData));

      qrCodes.push({ code: uniqueCode, qrImage });
    }

    // update product stats
    product.qrCount += count;
    await product.save();

    res.json({ success: true, qrCodes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Redeem a QR code
 */
exports.redeemQRCode = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { code, userId } = req.body;

    // Atomically find and mark QR as used
    const qr = await QRCodeModel.findOneAndUpdate(
      { code, status: "unused" },
      { $set: { status: "used", usedBy: userId, usedAt: new Date() } },
      { session, new: true }
    );
    if (!qr) throw new Error("QR not found or already used");

    // Check admin wallet
    const adminWallet = await AdminWallet.findOne().session(session);
    if (!adminWallet || adminWallet.balance < qr.amount) {
      throw new Error("Insufficient admin balance");
    }

    // Credit user wallet
    const user = await User.findById(userId).session(session);
    if (!user) throw new Error("User not found");

    adminWallet.balance -= qr.amount;
    user.walletBalance += qr.amount;

    await adminWallet.save({ session });
    await user.save({ session });

    // Save transaction
    const transaction = await Transaction.create(
      [{
        qrCode: qr._id,
        product: qr.product,
        amount: qr.amount,
        to: user._id,
        status: "success"
      }],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, transaction });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ error: err.message });
  }
};

/**
 * Get QR code details
 */
exports.getQRCodeDetails = async (req, res) => {
  try {
    const { code } = req.params;
    const qr = await QRCodeModel.findOne({ code }).populate("product usedBy");
    if (!qr) return res.status(404).json({ error: "QR not found" });
    res.json(qr);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Report Summary
 */
exports.reportSummary = async (req, res) => {
  try {
    const totalQR = await QRCodeModel.countDocuments();
    const usedQR = await QRCodeModel.countDocuments({ status: "used" });
    const unusedQR = totalQR - usedQR;

    const productWise = await QRCodeModel.aggregate([
      { $group: { _id: "$product", used: { $sum: { $cond: [{ $eq: ["$status", "used"] }, 1, 0] } }, total: { $sum: 1 } } }
    ]);

    res.json({ totalQR, usedQR, unusedQR, productWise });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Get QR codes by user
 */
exports.getUserQRCodes = async (req, res) => {
  try {
    const { userId } = req.params;
    const qrCodes = await QRCodeModel.find({ usedBy: userId }).populate("product");
    res.json(qrCodes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
