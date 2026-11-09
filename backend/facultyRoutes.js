const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("./db");

const router = express.Router();

// Test faculty API
router.get("/", (req, res) => {
    db.query("SELECT id, name, email, mobile, department FROM faculty", (err, results) => {
        if (err) {
            console.error("Faculty fetch error:", err);
            return res.status(500).json({
                success: false,
                message: "Could not fetch faculty."
            });
        }

        res.json(results);
    });
});

// Faculty registration
router.post("/register", async (req, res) => {
    const { name, mobile, department, email, password } = req.body;

    if (!name || !mobile || !department || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "Please fill all faculty registration fields."
        });
    }

    try {
        const passwordHash = await bcrypt.hash(password, 10);

        const sql = `
            INSERT INTO faculty (name, mobile, department, email, password_hash)
            VALUES (?, ?, ?, ?, ?)
        `;

        db.query(
            sql,
            [name, mobile, department, email, passwordHash],
            (err, result) => {
                if (err) {
                    console.error("Faculty registration error:", err);
                    return res.status(500).json({
                        success: false,
                        message: "Faculty registration failed."
                    });
                }

                res.json({
                    success: true,
                    message: "Faculty registered successfully!",
                    facultyId: result.insertId
                });
            }
        );
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Password processing failed."
        });
    }
});

// Faculty login
router.post("/login", (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({
            success: false,
            message: "Enter your email/mobile and password."
        });
    }

    const sql = `
        SELECT * FROM faculty
        WHERE email = ? OR mobile = ?
        LIMIT 1
    `;

    db.query(sql, [identifier, identifier], async (err, results) => {
        if (err) {
            console.error("Faculty login error:", err);
            return res.status(500).json({
                success: false,
                message: "Login failed."
            });
        }

        if (results.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Faculty account not found."
            });
        }

        try {
            const faculty = results[0];
            const validPassword = await bcrypt.compare(
                password,
                faculty.password_hash
            );

            if (!validPassword) {
                return res.status(401).json({
                    success: false,
                    message: "Incorrect password."
                });
            }

            res.json({
                success: true,
                message: "Login successful!",
                faculty: {
                    id: faculty.id,
                    name: faculty.name,
                    email: faculty.email,
                    mobile: faculty.mobile,
                    department: faculty.department
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({
                success: false,
                message: "Login could not be completed."
            });
        }
    });
});

// Delete faculty
router.delete("/:id", (req, res) => {
    db.query(
        "DELETE FROM faculty WHERE id = ?",
        [req.params.id],
        (err, result) => {
            if (err) {
                console.error("Faculty delete error:", err);
                return res.status(500).json({
                    success: false,
                    message: "Could not delete faculty."
                });
            }

            res.json({
                success: true,
                message: "Faculty deleted successfully."
            });
        }
    );
});

module.exports = router;