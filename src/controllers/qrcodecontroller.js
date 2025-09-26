const QRCode = require("qrcode");
// const QRCode = require('qrcode-with-logos');
const { v4: uuidv4 } = require("uuid");
const QRCodeModel = require("../models/Qrcode");
const Product = require("../models/Product");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const mongoose = require("mongoose");
const Jimp = require("jimp");
const { createCanvas, loadImage } = require('canvas'); 

const path = require('path');
const logoPath = path.join(__dirname, '../public/starxnewlogo.png');

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


// exports.generateQRCodes = async (req, res) => {
//   try {
//     const { productId, amount, count } = req.body;
//     const product = await Product.findById(productId);
//     if (!product) return res.status(404).json({ error: "Product not found" });

//     let qrCodes = [];

//     for (let i = 0; i < count; i++) {
//       // Only keep UUID / unique code in QR
//       const uniqueCode = uuidv4();

//       // Encode only the unique code (not amount/product)
//       const qrImageBase64 = await QRCode.toDataURL(uniqueCode);

//       // Upload to Cloudinary
//       const uploadRes = await cloudinary.uploader.upload(qrImageBase64, {
//         folder: "qr_codes",
//         public_id: uniqueCode
//       });

//       const qr = await QRCodeModel.create({
//         code: uniqueCode,
//         product: productId,
//         amount,
//         qrImageUrl: uploadRes.secure_url
//       });

//       qrCodes.push(qr);
//     }

//     product.qrCount += count;
//     await product.save();

//     res.json({ success: true, qrCodes });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };



exports.generateQRCodes = async (req, res) => {
  try {
    const { amount, count } = req.body;

    let qrCodes = [];

    for (let i = 0; i < count; i++) {
      // Generate a unique code
      const uniqueCode = uuidv4();

      // Create QR base64 image
      const qrImageBase64 = await QRCode.toDataURL(uniqueCode);

      // Upload to Cloudinary
      const uploadRes = await cloudinary.uploader.upload(qrImageBase64, {
        // folder: "qr_codes/",
        folder: `qr_codes/${amount}`,
        public_id: uniqueCode,
      });

      // Save in DB
      const qr = await QRCodeModel.create({
        code: uniqueCode,
        amount,
        qrImageUrl: uploadRes.secure_url,
      });

      qrCodes.push(qr);
    }

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
      return res.status(404).json({ success: false, message: "QR not found or already used" });
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
    const qrCodes = await QRCodeModel.find();
    res.json(qrCodes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}




// exports.generateQRCodesWithName = async (req, res) => {
//   try {
//     const { amount, count } = req.body;
//     const qrCodes = [];

//     for (let i = 0; i < count; i++) {
//       const uniqueCode = uuidv4();

//       // Generate QR buffer with high error correction
//       const qrBuffer = await QRCode.toBuffer(uniqueCode, {
//         errorCorrectionLevel: 'H',
//         width: 400,
//       });

//       // Load QR into Jimp
//       const qrImage = await Jimp.read(qrBuffer);

//       // Load font
//       const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);

//       // Print "StarX" in the center
//       qrImage.print(
//         font,
//         0,
//         0,
//         {
//           text: 'StarX',
//           alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
//           alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
//         },
//         qrImage.bitmap.width,
//         qrImage.bitmap.height
//       );

//       // Convert final image to buffer
//       const finalBuffer = await qrImage.getBufferAsync(Jimp.MIME_PNG);

//       // Upload to Cloudinary
//       const uploadResult = await new Promise((resolve, reject) => {
//         const stream = cloudinary.uploader.upload_stream(
//           { folder: 'qr_codes', public_id: uniqueCode },
//           (err, result) => (err ? reject(err) : resolve(result))
//         );
//         stream.end(finalBuffer);
//       });

//       // Save in MongoDB
//       const qr = await QRCodeModel.create({
//         code: uniqueCode,
//         amount,
//         qrImageUrl: uploadResult.secure_url,
//       });

//       qrCodes.push(qr);
//     }

//     res.json({ success: true, qrCodes });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// };





exports.generateQRCodesWithName = async (req, res) => {
  try {
    const { amount, count } = req.body;
    const qrCodes = [];

    for (let i = 0; i < count; i++) {
      const uniqueCode = uuidv4();

      // Generate QR buffer with high error correction
      const qrBuffer = await QRCode.toBuffer(uniqueCode, {
        errorCorrectionLevel: 'H',
        width: 400,
      });

      // Load QR into Jimp
      const qrImage = await Jimp.read(qrBuffer);

      // Load font
      const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
      const text = 'StarX';

      // Calculate text dimensions
      const textWidth = Jimp.measureText(font, text);
      const textHeight = Jimp.measureTextHeight(font, text, qrImage.bitmap.width);

      const centerX = qrImage.bitmap.width / 2;
      const centerY = qrImage.bitmap.height / 2;

      // Draw white rectangle behind text to avoid overlap
      qrImage.scan(
        centerX - textWidth / 2 - 10,
        centerY - textHeight / 2 - 5,
        textWidth + 20,
        textHeight + 10,
        function (x, y, idx) {
          this.bitmap.data[idx + 0] = 255; // R
          this.bitmap.data[idx + 1] = 255; // G
          this.bitmap.data[idx + 2] = 255; // B
          this.bitmap.data[idx + 3] = 255; // A
        }
      );

      // Print text on top of white rectangle
      qrImage.print(
        font,
        0,
        0,
        {
          text: text,
          alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
          alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
        },
        qrImage.bitmap.width,
        qrImage.bitmap.height
      );

      // Convert final image to buffer
      const finalBuffer = await qrImage.getBufferAsync(Jimp.MIME_PNG);

      // Upload to Cloudinary
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'qr_codes', public_id: uniqueCode },
          (err, result) => (err ? reject(err) : resolve(result))
        );
        stream.end(finalBuffer);
      });

      // Save in MongoDB
      const qr = await QRCodeModel.create({
        code: uniqueCode,
        amount,
        qrImageUrl: uploadResult.secure_url,
      });

      qrCodes.push(qr);
    }

    res.json({ success: true, qrCodes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};



//WITH LOGO
// exports.generateQRCodesWithLogo = async (req, res) => {
//   try {
//     const { amount, count } = req.body;
//     const qrCodes = [];

//     // Load your logo once
//     const logo = await loadImage(logoPath); // replace with your logo path

//     for (let i = 0; i < count; i++) {
//       const uniqueCode = uuidv4();

//       // Generate QR code data URL with high error correction
//       const qrDataUrl = await QRCode.toDataURL(uniqueCode, {
//         width: 400,
//         errorCorrectionLevel: 'H', // H = high, allows ~30% damage
//         margin: 1,
//       });

//       // Create a canvas
//       const canvas = createCanvas(400, 400);
//       const ctx = canvas.getContext('2d');

//       // Draw QR code on canvas
//       const qrImage = await loadImage(qrDataUrl);
//       ctx.drawImage(qrImage, 0, 0, 400, 400);

//       // Draw logo in center
//       const logoSize = 80; // adjust logo size
//       const centerX = (canvas.width - logoSize) / 2;
//       const centerY = (canvas.height - logoSize) / 2;
//       ctx.drawImage(logo, centerX, centerY, logoSize, logoSize);

//       // Convert canvas to buffer
//       const finalBuffer = canvas.toBuffer('image/png');

//       // Upload to Cloudinary
//       const uploadResult = await new Promise((resolve, reject) => {
//         const stream = cloudinary.uploader.upload_stream(
//           { folder: 'qr_codes', public_id: uniqueCode },
//           (err, result) => (err ? reject(err) : resolve(result))
//         );
//         stream.end(finalBuffer);
//       });

//       // Save in MongoDB
//       const qr = await QRCodeModel.create({
//         code: uniqueCode,
//         amount,
//         qrImageUrl: uploadResult.secure_url,
//       });

//       qrCodes.push(qr);
//     }

//     res.json({ success: true, qrCodes });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// };


// not to use

exports.generateQRCodesWithLogo = async (req, res) => {
  try {
    const { amount, count } = req.body;
    const qrCodes = [];

    // Load logo once
    const logoPath = path.join(process.cwd(), 'src/public/starxnewlogo.png'); // Adjust path as needed
    const logo = await loadImage(logoPath);
    console.log('Logo loaded:', logo.width, logo.height); // Debug

    for (let i = 0; i < count; i++) {
      const uniqueCode = uuidv4();

      // Generate QR code with high error correction
      const qrDataUrl = await QRCode.toDataURL(uniqueCode, {
        width: 400,
        errorCorrectionLevel: 'H', // allows ~30% coverage
        margin: 1,
      });

      const canvas = createCanvas(400, 400);
      const ctx = canvas.getContext('2d');

      // Draw QR code
      const qrImage = await loadImage(qrDataUrl);
      ctx.drawImage(qrImage, 0, 0, 400, 400);

      // Maintain logo aspect ratio
      const maxLogoSize = 100; // max width or height
      let drawWidth = maxLogoSize;
      let drawHeight = (logo.height / logo.width) * drawWidth;

      if (drawHeight > maxLogoSize) {
        drawHeight = maxLogoSize;
        drawWidth = (logo.width / logo.height) * drawHeight;
      }

      const centerX = (canvas.width - drawWidth) / 2;
      const centerY = (canvas.height - drawHeight) / 2;

      // Draw white background slightly smaller to keep logo on top
      const padding = 5;
      ctx.fillStyle = 'white';
      ctx.fillRect(centerX - padding, centerY - padding, drawWidth + 2 * padding, drawHeight + 2 * padding);

      // Draw logo on top of white background
      ctx.drawImage(logo, centerX, centerY, drawWidth, drawHeight);

      // Convert canvas to buffer
      const finalBuffer = canvas.toBuffer('image/png');

      // Upload to Cloudinary
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'qr_codes', public_id: uniqueCode },
          (err, result) => (err ? reject(err) : resolve(result))
        );
        stream.end(finalBuffer);
      });

      // Save in MongoDB
      const qr = await QRCodeModel.create({
        code: uniqueCode,
        amount,
        qrImageUrl: uploadResult.secure_url,
      });

      qrCodes.push(qr);
    }

    res.json({ success: true, qrCodes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


// exports.generateQRCodesWithLogo = async (req, res) => {
//   try {
//     const { amount, count } = req.body;
//     const qrCodes = [];

//     for (let i = 0; i < count; i++) {
//       const uniqueCode = uuidv4();

//       // Generate QR buffer with high error correction (so logo doesn't break it)
//       const qrBuffer = await QRCode.toBuffer(uniqueCode, {
//         errorCorrectionLevel: 'H',
//         width: 400,
//       });

//       // Load QR into Jimp
//       const qrImage = await Jimp.read(qrBuffer);

//       // Load logo
//       const logo = await Jimp.read(logoPath);

//       // Resize logo (20–25% of QR size recommended)
//       const logoSize = qrImage.bitmap.width * 0.25;
//       logo.resize(logoSize, Jimp.AUTO);

//       // Calculate position for center placement
//       const x = (qrImage.bitmap.width / 2) - (logo.bitmap.width / 2);
//       const y = (qrImage.bitmap.height / 2) - (logo.bitmap.height / 2);

//       // Composite logo on QR
//       qrImage.composite(logo, x, y, {
//         mode: Jimp.BLEND_SOURCE_OVER,
//         opacitySource: 1,
//       });

//       // Convert final image to buffer
//       const finalBuffer = await qrImage.getBufferAsync(Jimp.MIME_PNG);

//       // Upload to Cloudinary
//       const uploadResult = await new Promise((resolve, reject) => {
//         const stream = cloudinary.uploader.upload_stream(
//           { folder: 'qr_codes', public_id: uniqueCode },
//           (err, result) => (err ? reject(err) : resolve(result))
//         );
//         stream.end(finalBuffer);
//       });

//       // Save in MongoDB
//       const qr = await QRCodeModel.create({
//         code: uniqueCode,
//         amount,
//         qrImageUrl: uploadResult.secure_url,
//       });

//       qrCodes.push(qr);
//     }

//     res.json({ success: true, qrCodes });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: err.message });
//   }
// };
