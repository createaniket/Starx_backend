const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
    },

    email: {
      type: String,
      unique: true,
      required: true,
      tolowercase: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      trim: true,
      minlength: 8,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },

    tokens: [
      {
        token: {
          type: String,
        },
      },
    ],
  },
  { timestamps: true }
);

// Method for generating the Auth Token which is being called by the function of login and signup from Router files
UserSchema.methods.generateAuthToken = async function () {
  const user = this;
  const token = jwt.sign({ _id: user._id }, process.env.UserTokenKey);
  user.tokens = user.tokens.concat({ token });
  await user.save();
  console.log(token); // consoling the token
  return token;
};

UserSchema.methods.CreateWallet = async function () {
  const user = this;
  const Wallet = require("./Wallet");
  const wallet = new Wallet({
    ownerType: "user",
    ownerId: user._id,
    balance: 0,
    currency: "INR",
  });
  await wallet.save();
  return wallet;
}

// Finding the user by its credentials and checking the password with our hashed one
UserSchema.statics.findByCredentials = async (email, password) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error(
      "Looks like you're not registered yet! Ready to join us? Sign up now and Expand Your Brand Demand!"
    );
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new Error("Password didn't Match");
  }
  return user;
};

UserSchema.pre("save", async function (next) {
  const User = this;
  if (User.isModified("password")) {
    User.password = await bcrypt.hash(User.password, 8);
  }
  next();
});

const User = mongoose.model("User", UserSchema);
module.exports = User;