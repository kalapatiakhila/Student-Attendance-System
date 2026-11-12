
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./db");

// Import routes
const studentRoutes = require("./studentRoutes");
const facultyRoutes = require("./facultyRoutes");
const attendanceRoutes = require("./attendanceRoutes");
const adminRoutes = require("./adminRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =====================================
// HOME ROUTE
// =====================================
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Student Attendance API is working!"
    });
});

// =====================================
// API STATUS
// =====================================
app.get("/api/status", (req, res) => {
    res.json({
        success: true,
        message: "API is running successfully"
    });
});

// =====================================
// DATABASE HEALTH CHECK
// =====================================
app.get("/api/health", (req, res) => {
    db.query("SELECT 1 AS test", (err, results) => {
        if (err) {
            console.error("Database health error:", err);

            return res.status(500).json({
                success: false,
                message: "Database connection failed"
            });
        }

        res.json({
            success: true,
            message: "Database connected successfully",
            data: results
        });
    });
});

// =====================================
// DATABASE TEST
// =====================================
app.get("/api/db-test", (req, res) => {
    db.query("SELECT 1 AS test", (err, results) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: "Database error"
            });
        }

        res.json({
            success: true,
            message: "Database connected successfully",
            data: results
        });
    });
});

// =====================================
// API ROUTES
// =====================================
app.use("/api/students", studentRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/admin", adminRoutes);

// =====================================
// INVALID ROUTE
// =====================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API route not found",
        requestedUrl: req.originalUrl
    });
});

// =====================================
// ERROR HANDLER
// =====================================
app.use((err, req, res, next) => {
    console.error("SERVER ERROR:", err);

    res.status(500).json({
        success: false,
        message: "Internal server error"
    });
});

// =====================================
// START SERVER
// =====================================
const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
    console.log("==================================");
    console.log(`Server running on port ${PORT}`);
    console.log("Student Attendance Management System");
    console.log("==================================");
});
