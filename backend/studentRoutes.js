
const express = require("express");
const router = express.Router();
const db = require("./db");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

// =====================================
// 1. GET ALL STUDENTS
// =====================================
router.get("/", function (req, res) {
    const sql = `
        SELECT
            s.*,
            CASE
                WHEN u.id IS NULL THEN 0
                ELSE 1
            END AS is_registered
        FROM students s
        LEFT JOIN users u
            ON u.student_id = s.id
            AND u.role = 'student'
        ORDER BY s.id DESC
    `;

    db.query(sql, function (err, results) {
        if (err) {
            console.error(err);
            return res.status(500).json({
                message: "Unable to fetch students."
            });
        }

        res.json(results);
    });
});

// =====================================
// 2. ADD STUDENT
// =====================================
router.post("/", function (req, res) {
    const { rollNo, name, studentClass, mobileNo } = req.body;

    if (!rollNo || !name || !studentClass) {
        return res.status(400).json({
            message: "Please provide roll number, name and class."
        });
    }

    const sql = `
        INSERT INTO students
        (roll_no, name, student_class, parent_mobile)
        VALUES (?, ?, ?, ?)
    `;

    db.query(
        sql,
        [rollNo.trim(), name.trim(), studentClass.trim(), mobileNo || null],
        function (err, result) {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    message: "Unable to add student. Check roll number."
                });
            }

            res.status(201).json({
                message: "Student added successfully.",
                studentId: result.insertId
            });
        }
    );
});

// =====================================
// 3. UPDATE STUDENT
// =====================================
router.put("/:id", function (req, res) {
    const { name, studentClass, mobileNo } = req.body;
    const studentId = req.params.id;

    if (!name || !studentClass) {
        return res.status(400).json({
            message: "Name and class are required."
        });
    }

    const sql = `
        UPDATE students
        SET name = ?, student_class = ?, parent_mobile = ?
        WHERE id = ?
    `;

    db.query(
        sql,
        [name.trim(), studentClass.trim(), mobileNo || null, studentId],
        function (err, result) {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    message: "Unable to update student."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Student not found."
                });
            }

            res.json({
                message: "Student updated successfully."
            });
        }
    );
});

// =====================================
// 4. DELETE STUDENT
// =====================================
router.delete("/:id", function (req, res) {
    db.query(
        "DELETE FROM students WHERE id = ?",
        [req.params.id],
        function (err, result) {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    message: "Unable to delete student."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "Student not found."
                });
            }

            res.json({
                message: "Student deleted successfully."
            });
        }
    );
});

// =====================================
// 5. STUDENT REGISTRATION
// =====================================
router.post("/register", function (req, res) {
    const { name, roll_number, email, password } = req.body;

    if (!name || !roll_number || !password) {
        return res.status(400).json({
            message: "Name, roll number and password are required."
        });
    }

    db.query(
        "SELECT * FROM students WHERE roll_no = ?",
        [roll_number.trim()],
        function (err, students) {
            if (err) {
                return res.status(500).json({
                    message: "Database error."
                });
            }

            if (students.length === 0) {
                return res.status(404).json({
                    message: "Student not found. Contact administrator."
                });
            }

            const student = students[0];

            if (
                student.name.trim().toLowerCase() !==
                name.trim().toLowerCase()
            ) {
                return res.status(400).json({
                    message: "Student name does not match."
                });
            }

            db.query(
                "SELECT id FROM users WHERE username = ?",
                [roll_number.trim()],
                function (err, existingUsers) {
                    if (err) {
                        return res.status(500).json({
                            message: "Database error."
                        });
                    }

                    if (existingUsers.length > 0) {
                        return res.status(409).json({
                            message: "Student already registered."
                        });
                    }

                    bcrypt.hash(password, 10, function (err, hashedPassword) {
                        if (err) {
                            return res.status(500).json({
                                message: "Password processing failed."
                            });
                        }

                        const sql = `
                            INSERT INTO users
                            (username, password_hash, role, student_id)
                            VALUES (?, ?, 'student', ?)
                        `;

                        db.query(
                            sql,
                            [
                                roll_number.trim(),
                                hashedPassword,
                                student.id
                            ],
                            function (err) {
                                if (err) {
                                    console.error(err);
                                    return res.status(500).json({
                                        message: "Registration failed."
                                    });
                                }

                                res.status(201).json({
                                    message: "Student registered successfully."
                                });
                            }
                        );
                    });
                }
            );
        }
    );
});

// =====================================
// 6. STUDENT LOGIN
// =====================================
router.post("/login", function (req, res) {
    const { roll_number, password } = req.body;

    if (!roll_number || !password) {
        return res.status(400).json({
            message: "Enter roll number and password."
        });
    }

    const sql = `
        SELECT
            u.id AS user_id,
            u.username,
            u.password_hash,
            u.role,
            s.id AS student_id,
            s.name,
            s.roll_no,
            s.student_class
        FROM users u
        JOIN students s ON s.id = u.student_id
        WHERE u.username = ? AND u.role = 'student'
    `;

    db.query(sql, [roll_number.trim()], function (err, results) {
        if (err) {
            console.error(err);
            return res.status(500).json({
                message: "Database error."
            });
        }

        if (results.length === 0) {
            return res.status(401).json({
                message: "Invalid roll number or password."
            });
        }

        const user = results[0];

        bcrypt.compare(
            password,
            user.password_hash,
            function (err, matched) {
                if (err || !matched) {
                    return res.status(401).json({
                        message: "Invalid roll number or password."
                    });
                }

                res.json({
                    message: "Login successful.",
                    token: crypto.randomBytes(32).toString("hex"),
                    student: {
                        id: user.student_id,
                        name: user.name,
                        roll_no: user.roll_no,
                        student_class: user.student_class
                    }
                });
            }
        );
    });
});

// =====================================
// 7. PARENT LOGIN USING MOBILE NUMBER
// =====================================
router.post("/parent-login", function (req, res) {
    const mobile = String(req.body.mobile || "").trim();

    if (!/^[0-9]{10}$/.test(mobile)) {
        return res.status(400).json({
            message: "Enter a valid 10-digit mobile number."
        });
    }

    const sql = `
        SELECT id, roll_no, name, student_class, parent_mobile
        FROM students
        WHERE parent_mobile = ?
        ORDER BY name
    `;

    db.query(sql, [mobile], function (err, results) {
        if (err) {
            console.error("Parent login error:", err);

            return res.status(500).json({
                message: "Database error during parent login."
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                message: "Mobile number not registered."
            });
        }

        res.json({
            message: "Parent login successful.",
            students: results
        });
    });
});

module.exports = router;
