const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const AdminSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    email: { type: String, unique: true, required: true, trim: true, lowercase: true },
    password: { type: String, required: true, trim: true, minlength: 8 },
    phone: { type: String, required: true, trim: true },
    tokens: [{ token: { type: String } }],
  },
  { timestamps: true }
);

// Generate Auth Token
AdminSchema.methods.generateAuthToken = async function () {
  const admin = this;
  const token = jwt.sign({ _id: admin._id }, process.env.AdminTokenKey);
  admin.tokens = admin.tokens.concat({ token });
  await admin.save();
  return token;
};

// Create Wallet
AdminSchema.methods.CreateWallet = async function () {
  const admin = this;
  const Wallet = require("./Wallet");
  const wallet = new Wallet({
    ownerType: "admin",
    ownerId: admin._id,
    balance: 0,
    currency: "INR",
  });
  await wallet.save();
  return wallet;
};

// Find Admin by Credentials
AdminSchema.statics.findByCredentials = async (email, password) => {
  const admin = await Admin.findOne({ email });
  if (!admin) {
    throw new Error("Admin not registered!");
  }

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  return admin;
};

// Hash password before save
AdminSchema.pre("save", async function (next) {
  const admin = this;
  if (admin.isModified("password")) {
    admin.password = await bcrypt.hash(admin.password, 8);
  }
  next();
});

const Admin = mongoose.model("Admin", AdminSchema);
module.exports = Admin;
