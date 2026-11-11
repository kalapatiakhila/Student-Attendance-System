const express = require("express");
const db = require("./db");

const router = express.Router();

// Get attendance summary for today
router.get("/summary/today", (req, res) => {
    const date = req.query.date;

    const sql = `
        SELECT
            SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS present,
            SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) AS absent
        FROM attendance
        WHERE attendance_date = ?
    `;

    db.query(sql, [date], (err, results) => {
        if (err) {
            console.error("Summary error:", err);
            return res.status(500).json({
                success: false,
                message: "Could not load attendance summary."
            });
        }

        res.json({
            success: true,
            present: Number(results[0].present || 0),
            absent: Number(results[0].absent || 0)
        });
    });
});

// Get attendance history for one student
router.get("/student/:studentId", (req, res) => {
    const sql = `
        SELECT
            a.student_id,
            a.attendance_date,
            a.status,
            s.name AS student_name,
            s.roll_no,
            s.student_class
        FROM attendance a
        JOIN students s ON s.id = a.student_id
        WHERE a.student_id = ?
        ORDER BY a.attendance_date DESC
    `;

    db.query(sql, [req.params.studentId], (err, results) => {
        if (err) {
            console.error("Student attendance error:", err);
            return res.status(500).json({
                success: false,
                message: "Could not load student attendance."
            });
        }

        res.json(results);
    });
});

// Get attendance percentage
router.get("/percentage/:studentId", (req, res) => {
    const sql = `
        SELECT
            COUNT(*) AS totalDays,
            SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS presentDays,
            SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) AS absentDays
        FROM attendance
        WHERE student_id = ?
    `;

    db.query(sql, [req.params.studentId], (err, results) => {
        if (err) {
            console.error("Percentage error:", err);
            return res.status(500).json({
                success: false,
                message: "Could not calculate attendance percentage."
            });
        }

        const totalDays = Number(results[0].totalDays || 0);
        const presentDays = Number(results[0].presentDays || 0);
        const absentDays = Number(results[0].absentDays || 0);

        const percentage = totalDays > 0
            ? (presentDays / totalDays) * 100
            : 0;

        res.json({
            totalDays,
            presentDays,
            absentDays,
            percentage: Number(percentage.toFixed(2))
        });
    });
});

// Save attendance
router.post("/save", (req, res) => {
    const { date, facultyId, records } = req.body;

    if (!date || !facultyId || !Array.isArray(records) || records.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Date, faculty ID and attendance records are required."
        });
    }

    const checkFaculty = "SELECT id FROM faculty WHERE id = ?";

    db.query(checkFaculty, [facultyId], (err, facultyResults) => {
        if (err) {
            console.error("Faculty check error:", err);
            return res.status(500).json({
                success: false,
                message: "Could not verify faculty."
            });
        }

        if (facultyResults.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Faculty account not found."
            });
        }

        let completed = 0;
        let failed = false;

        records.forEach(record => {
            const { studentId, status } = record;

            if (!studentId || !["Present", "Absent"].includes(status)) {
                if (!failed) {
                    failed = true;
                    return res.status(400).json({
                        success: false,
                        message: "Invalid attendance record."
                    });
                }
                return;
            }

            const sql = `
                INSERT INTO attendance
                    (student_id, faculty_id, attendance_date, status)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    faculty_id = VALUES(faculty_id),
                    status = VALUES(status)
            `;

            db.query(sql, [studentId, facultyId, date, status], err => {
                if (err) {
                    console.error("Attendance save error:", err);

                    if (!failed) {
                        failed = true;
                        return res.status(500).json({
                            success: false,
                            message: "Could not save attendance."
                        });
                    }
                    return;
                }

                if (failed) return;

                completed++;

                if (completed === records.length) {
                    res.json({
                        success: true,
                        message: "Attendance saved successfully!"
                    });
                }
            });
        });
    });
});

module.exports = router;