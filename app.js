const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const app = express();
app.use(express.json());
app.get("/", (req, res) => {
    res.json({
        message: "RecycleConnect Backend is running"
    });
});
module.exports = app;