const express = require("express");
const cors = require("cors");

const db = require("./db");
const studentRoutes = require("./studentRoutes");
const facultyRoutes = require("./facultyRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Home route
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Student Attendance Management System Backend is running"
    });
});

// Health check
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Backend is running successfully"
    });
});

// Database check
app.get("/api/db-test", (req, res) => {
    db.query("SELECT 1 AS test", (err, results) => {
        if (err) {
            console.error("Database test failed:", err);

            return res.status(500).json({
                success: false,
                message: "Database connection failed",
                error: err.message
            });
        }

        res.json({
            success: true,
            message: "Database connected successfully",
            data: results
        });
    });
});

// Student routes
app.use("/api/students", studentRoutes);

// Faculty routes
app.use("/api/faculty", facultyRoutes);

// Handle unknown routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API route not found",
        requestedUrl: req.originalUrl
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error("Server error:", err);

    res.status(500).json({
        success: false,
        message: "Internal server error"
    });
});

// Start server
const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
    console.log("-----------------------------------");
    console.log("STUDENT ATTENDANCE SYSTEM STARTED");
    console.log("Server running on port:", PORT);
    console.log("-----------------------------------");
});