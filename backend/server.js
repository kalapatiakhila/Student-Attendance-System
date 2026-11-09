const express = require("express");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
require("./db");

// Import route files
const studentRoutes = require("./studentRoutes");
const attendanceRoutes = require("./attendanceRoutes");
const facultyRoutes = require("./facultyRoutes");

// API routes
app.use("/api/students", studentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/faculty", facultyRoutes);

// Home page
app.get("/", (req, res) => {
    res.send("Student Attendance API is running!");
});

// Server status
app.get("/api/status", (req, res) => {
    res.json({
        success: true,
        message: "Student Attendance API is working!"
    });
});

// Unknown API route
app.use("/api", (req, res) => {
    res.status(404).json({
        success: false,
        message: "API route not found: " + req.method + " " + req.originalUrl
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error("Server error:", err);

    res.status(500).json({
        success: false,
        message: "Internal server error."
    });
});

// Start server
const PORT = 5000;

app.listen(PORT, () => {
    console.log("-----------------------------------");
    console.log("STUDENT ATTENDANCE SYSTEM STARTED");
    console.log("Server: http://localhost:" + PORT);
    console.log("Faculty API: http://localhost:" + PORT + "/api/faculty");
    console.log("-----------------------------------");
});