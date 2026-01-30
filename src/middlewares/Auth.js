const jwt = require("jsonwebtoken");
const User = require("../models/User");

const Auth = async (req, res, next) => {
  try {
    // ✅ Check token exists
    const authHeader = req.header("Authorization");

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "No token provided. Access denied.",
      });
    }

    // ✅ Extract token
    const token = authHeader.replace("Bearer ", "");

    // ✅ Verify token
    const decoded = jwt.verify(token, process.env.UserTokenKey);

    // ✅ Find user + check soft delete
    const user = await User.findOne({
      _id: decoded._id,
      "tokens.token": token,
      isDeleted: false, // ❗ deleted users blocked
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token or user not found",
      });
    }

    // ✅ Attach to request
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

module.exports = Auth;
