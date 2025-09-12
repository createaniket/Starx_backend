const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

const AdAuth = async (req, res, next) => {

  try {
    if (req.header("Authorization")) {
      const token = req.header("Authorization").replace("Bearer ", "");
      const decoded = jwt.verify(token, process.env.AdminTokenKey);

      const admin = await Admin.findOne({
        _id: decoded._id,
        "tokens.token": token,
      });
      if (!admin) {
        throw new Error();
      } else {
        req.admin = admin;
        next();
      }
    } else {
      res.status(400).json({
        message: "please provide token or You don't have the Access",
      });
    }
  } catch (e) {
    console.log("the error from adauth is ", e);
    res.status(401).json({ error: e.message }); // to be commeted (in future)
    next();
  }
};
module.exports = AdAuth;