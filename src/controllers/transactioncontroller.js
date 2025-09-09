const Transaction = require('../models/Transaction');



// ✅ Get all transaction
exports.getTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, transaction:transaction });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};