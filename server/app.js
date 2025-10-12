const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const recommendationsRouter = require("./routes/recommendations");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const tokens = require("./routes/token");
const users = require("./routes/user");

require("dotenv").config({ path: "./config/.env.local" });

// Create a new Express application
const app = express();

const assetsDir = path.resolve(__dirname, "../myApp/assets");
app.use("/assets", express.static(assetsDir));

// Middleware for CORS
app.use(cors());

// Middleware to parse JSON bodies
app.use(express.json({ limit: "2mb" }));

// Increase payload size limit
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.CONNECTION_STRING);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

connectDB();

// Ensure the profilePics directory exists
const profilePicsPath = path.join(__dirname, "profilePics");
if (!fs.existsSync(profilePicsPath)) {
  fs.mkdirSync(profilePicsPath);
}
app.use("/profilePics", express.static(profilePicsPath));

app.use(express.json());
// Set up routes
app.use("/api/tokens", tokens);
app.use("/api/users", users);
app.use("/api/recommendations", recommendationsRouter);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
