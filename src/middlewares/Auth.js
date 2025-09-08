const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Auth = async (req, res, next) => {
  try {
    if (req.header("Authorization")) {
      const token = req.header("Authorization").replace("Bearer ", "");
      const decoded = jwt.verify(token, process.env.UserTokenKey);

      const user = await User.findOne({
        _id: decoded._id,
        "tokens.token": token,
      });
      if (!user) {
        throw new Error();
      } else {
        req.user = user;
        next();
      }
    } else {
      res.status(400).json({
        message: "please provide token or You don't have the Access",
      });
    }
  } catch (e) {
    res.status(401).json({ error: e.message }); // to be commeted (in future)
    next();
  }
};
module.exports = Auth;