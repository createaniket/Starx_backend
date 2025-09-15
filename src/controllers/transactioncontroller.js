const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');



// ✅ Get all transaction
// ✅ Get all transactions with wallet details
exports.getTransaction = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate("fromWallet") // get full wallet details
      .populate("toWallet")   // get full wallet details
      .populate("product")
      .sort({ createdAt: -1 });

    if (!transactions || transactions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No transactions found",
      });
    }

    res.status(200).json({
      success: true,
      transactions,
    });
  } catch (err) {
    console.error("Error fetching transactions:", err);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
      error: err.message,
    });
  }
};


// Get Transactions of a User
exports.getUserTransactions = async (req, res) => {
  console.log("i am here in get user trans", req.user);
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized: User not found" });
    }

    // Find wallet of the user
    const wallet = await Wallet.findOne({ ownerId: userId });
    if (!wallet) {
      return res.status(404).json({ success: false, message: "Wallet not found for this user" });
    }

    // Fetch both incoming and outgoing transactions
    const transactions = await Transaction.find({
      $or: [{ fromWallet: wallet._id }, { toWallet: wallet._id }],
    })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: transactions.length,
      transactions,
    });
  } catch (err) {
    console.error("Error fetching user transactions:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};
