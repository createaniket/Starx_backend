const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
var cors = require('cors')
const app = express();
app.use(cors())
app.use(express.json());
require("dotenv").config();
const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));



const User = require("./src/routes/user");
const Admin = require("./src/routes/admin");
const QRCODE = require("./src/routes/qrcode");
const Product = require("./src/routes/product");
const Transaction = require("./src/routes/transaction");
const Wallet = require("./src/routes/wallet");


const port = process.env.PORT || 9000;

app.use("/Public", express.static(path.join(__dirname, "Public")));


// Connect to MongoDB
mongoose.connect(process.env.DBURL);

// Check connection status
const db = mongoose.connection;

db.on("error", (error) => {
  console.error("MongoDB connection error:", error);
  process.exit(0);
});

db.once("open", () => {
  console.log("Connected to MongoDB");
});

db.on("disconnected", () => {
  console.log("Disconnected from MongoDB");
});





// Routes


app.use('/api/user', User);
app.use('/api/qrcode', QRCODE);
app.use('/api/product', Product);
app.use('/api/admin', Admin);
app.use('/api/transaction', Transaction);
app.use('/api/wallet', Wallet);



app.listen(port, () => {
  console.log(`port has been up at ${port}`);
});
app.timeout = 900000; // Set timeout to 15 minutes