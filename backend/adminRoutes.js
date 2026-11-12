
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db");

const router = express.Router();

// Admin login
router.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: "Username and password are required"
        });
    }

    const sql = `
        SELECT id, username, password_hash, role
        FROM users
        WHERE username = ? AND role = 'admin'
        LIMIT 1
    `;

    db.query(sql, [username], async (err, results) => {
        if (err) {
            console.error("ADMIN DATABASE ERROR:", err);
            return res.status(500).json({
                success: false,
                message: "Database error"
            });
        }

        console.log("ADMIN LOGIN REQUEST");
        console.log("Username searched:", username);
        console.log("Admin found:", results.length > 0);

        if (results.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password"
            });
        }

        const admin = results[0];

        console.log("Username found:", admin.username);
        console.log("Role:", admin.role);
        console.log("Stored hash length:", admin.password_hash.length);

        try {
            const validPassword = await bcrypt.compare(
                password,
                admin.password_hash
            );

            console.log("Password match:", validPassword);

            if (!validPassword) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid username or password"
                });
            }

            if (!process.env.JWT_SECRET) {
                console.error("JWT_SECRET is missing");
                return res.status(500).json({
                    success: false,
                    message: "Server authentication configuration error"
                });
            }

            const token = jwt.sign(
                {
                    id: admin.id,
                    username: admin.username,
                    role: "admin"
                },
                process.env.JWT_SECRET,
                { expiresIn: "8h" }
            );

            return res.json({
                success: true,
                message: "Admin login successful",
                token,
                admin: {
                    id: admin.id,
                    username: admin.username,
                    role: admin.role
                }
            });

        } catch (error) {
            console.error("ADMIN LOGIN ERROR:", error);

            return res.status(500).json({
                success: false,
                message: "Login failed"
            });
        }
    });
});

module.exports = router;
