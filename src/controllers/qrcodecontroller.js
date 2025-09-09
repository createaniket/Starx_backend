const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");
const QRCodeModel = require("../models/Qrcode");
const Product = require("../models/Product");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const mongoose = require("mongoose");

/**
 * Generate bulk QR codes for a product
 */
const cloudinary = require("cloudinary").v2;

// Example Cloudinary setup (config only once, maybe in app.js or config file)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});


exports.generateQRCodes = async (req, res) => {
  try {
    const { productId, amount, count } = req.body;
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: "Product not found" });

    let qrCodes = [];

    for (let i = 0; i < count; i++) {
      // Only keep UUID / unique code in QR
      const uniqueCode = uuidv4();

      // Encode only the unique code (not amount/product)
      const qrImageBase64 = await QRCode.toDataURL(uniqueCode);

      // Upload to Cloudinary
      const uploadRes = await cloudinary.uploader.upload(qrImageBase64, {
        folder: "qr_codes",
        public_id: uniqueCode
      });

      const qr = await QRCodeModel.create({
        code: uniqueCode,
        product: productId,
        amount,
        qrImageUrl: uploadRes.secure_url
      });

      qrCodes.push(qr);
    }

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
    const { code } = req.body;
    const userId = req.user._id;

    if (!code) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ success: false, message: "QR code is required" });
    }

    // Atomically find and mark QR as used
    const qr = await QRCodeModel.findOneAndUpdate(
      { code, status: "unused" },
      { $set: { status: "used", usedBy: userId, usedAt: new Date() } },
      { session, new: true }
    );
    if (!qr) {
      await session.abortTransaction();
      session.endSession();
      return res.status(200).json({ success: false, message: "QR not found or already used" });
    }

    // Admin wallet
    const adminWallet = await Wallet.findOne({ ownerType: "admin" }).session(session);
    if (!adminWallet) {
      await session.abortTransaction();
      session.endSession();
      return res.status(500).json({ success: false, message: "Admin wallet not found" });
    }

    if (adminWallet.balance < qr.amount) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({ success: false, message: "Insufficient admin balance" });
    }

    // User wallet (create if not exists)
    let userWallet = await Wallet.findOne({ ownerType: "user", ownerId: userId }).session(session);
    if (!userWallet) {
      userWallet = new Wallet({ ownerType: "user", ownerId: userId, balance: 0 });
      await userWallet.save({ session });
    }

    // Adjust balances
    adminWallet.balance -= qr.amount;
    userWallet.balance += qr.amount;
    await adminWallet.save({ session });
    await userWallet.save({ session });

    // Save transaction
    const transaction = new Transaction({
      qrCode: qr._id,
      product: qr.product,
      amount: qr.amount,
      fromWallet: adminWallet._id,
      toWallet: userWallet._id,
      status: "pending_payout",
      payoutBatchDate: new Date(new Date().setHours(0, 0, 0, 0))
    });
    await transaction.save({ session });

    // Increment product QR usage
    await Product.findByIdAndUpdate(
      qr.product,
      { $inc: { qrUsed: 1 } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: "QR code redeemed successfully",
      transaction
    });
  } catch (err) {
    console.log("the error", err);
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ success: false, message: "Something went wrong", error: err.message });
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

/**
 * Get all QR codes (Admin)
 */
exports.getAllQRCodes = async (req, res) => {
  try {
    const qrCodes = await QRCodeModel.find().populate("product usedBy");
    res.json(qrCodes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}