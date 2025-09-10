const Wallet = require("../models/Wallet");

/**
 * Get wallet by user/admin
 */
exports.getWallet = async (req, res) => {
  try {
    const ownerId = req.user._id; // Assuming req.user is set by auth middleware
    const wallet = await Wallet.findOne({ ownerId });
    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }
    res.json({ success: true, wallet });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/**
 * Create wallet (admin or user)
 */
exports.createWallet = async (req, res) => {
  try {
    const { ownerType, ownerId, balance, currency } = req.body;

    // Prevent duplicates
    const existing = await Wallet.findOne({ ownerType, ownerId });
    if (existing) {
      return res.status(400).json({ error: "Wallet already exists" });
    }

    const wallet = new Wallet({
      ownerType,
      ownerId,
      balance: balance || 0,
      currency: currency || "INR",
    });

    await wallet.save();
    res.json({ success: true, wallet });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Credit money to wallet
 */
exports.creditWallet = async (req, res) => {
  try {
    const { walletId } = req.params;
    const { amount } = req.body;

    const wallet = await Wallet.findById(walletId);
    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    wallet.balance += amount;
    await wallet.save();

    res.json({ success: true, wallet });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Debit money from wallet
 */
exports.debitWallet = async (req, res) => {
  try {
    const { walletId } = req.params;
    const { amount } = req.body;

    const wallet = await Wallet.findById(walletId);
    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    wallet.balance -= amount;
    await wallet.save();

    res.json({ success: true, wallet });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
