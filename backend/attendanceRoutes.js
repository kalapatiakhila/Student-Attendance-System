
const express = require("express");
const router = express.Router();
const db = require("./db");

// GET: Today's attendance summary
router.get("/summary/today", (req, res) => {
    const date = req.query.date;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
            success: false,
            message: "Please provide a valid date in YYYY-MM-DD format"
        });
    }

    const sql = `
        SELECT
            COUNT(CASE WHEN status = 'Present' THEN 1 END) AS present,
            COUNT(CASE WHEN status = 'Absent' THEN 1 END) AS absent
        FROM attendance
        WHERE attendance_date = ?
    `;

    db.query(sql, [date], (err, results) => {
        if (err) {
            console.error("Attendance summary error:", err);
            return res.status(500).json({
                success: false,
                message: "Could not load attendance summary"
            });
        }

        const present = Number(results[0].present) || 0;
        const absent = Number(results[0].absent) || 0;

        res.json({
            success: true,
            present: present,
            absent: absent,
            presentToday: present,
            absentToday: absent,
            presentCount: present,
            absentCount: absent
        });
    });
});


// GET: Get attendance for one student
router.get("/student/:studentId", (req, res) => {
    const studentId = req.params.studentId;

    if (!Number.isInteger(Number(studentId)) || Number(studentId) <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid student ID"
        });
    }

    const sql = `
        SELECT
            a.id,
            a.student_id,
            a.faculty_id,
            a.attendance_date,
            a.status,
            s.name AS student_name,
            s.roll_no,
            s.student_class
        FROM attendance a
        JOIN students s ON a.student_id = s.id
        WHERE a.student_id = ?
        ORDER BY a.attendance_date DESC
    `;

    db.query(sql, [studentId], (err, results) => {
        if (err) {
            console.error("Student attendance error:", err);
            return res.status(500).json({
                success: false,
                message: "Could not retrieve student attendance."
            });
        }

        res.json(results);
    });
});


// GET: Get attendance percentage for one student
router.get("/percentage/:studentId", (req, res) => {
    const studentId = req.params.studentId;

    const sql = `
        SELECT
            COUNT(*) AS totalDays,
            SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS presentDays,
            SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) AS absentDays
        FROM attendance
        WHERE student_id = ?
    `;

    db.query(sql, [studentId], (err, results) => {
        if (err) {
            console.error("Attendance percentage error:", err);
            return res.status(500).json({
                success: false,
                message: "Could not calculate attendance percentage."
            });
        }

        const totalDays = Number(results[0].totalDays) || 0;
        const presentDays = Number(results[0].presentDays) || 0;
        const absentDays = Number(results[0].absentDays) || 0;

        const percentage = totalDays > 0
            ? Number(((presentDays / totalDays) * 100).toFixed(2))
            : 0;

        res.json({
            totalDays,
            presentDays,
            absentDays,
            percentage
        });
    });
});


// POST: Save student attendance
router.post("/save", (req, res) => {
    const { date, facultyId, records } = req.body;

    if (!date || !facultyId || !Array.isArray(records) || records.length === 0) {
        return res.status(400).json({
            message: "Date, faculty ID and attendance records are required"
        });
    }

    const validRecords = records.every(record =>
        record.studentId &&
        ["Present", "Absent"].includes(record.status)
    );

    if (!validRecords) {
        return res.status(400).json({
            message: "Invalid student ID or attendance status"
        });
    }

    db.query(
        "SELECT id FROM faculty WHERE id = ?",
        [facultyId],
        (facultyErr, facultyResults) => {
            if (facultyErr) {
                console.error(facultyErr);
                return res.status(500).json({
                    message: "Database error while checking faculty"
                });
            }

            if (facultyResults.length === 0) {
                return res.status(404).json({
                    message: "Faculty not found. Please login again."
                });
            }

            const studentIds = records.map(record => record.studentId);

            db.query(
                "SELECT id FROM students WHERE id IN (?)",
                [studentIds],
                (studentErr, studentResults) => {
                    if (studentErr) {
                        console.error(studentErr);
                        return res.status(500).json({
                            message: "Database error while checking students"
                        });
                    }

                    if (studentResults.length !== studentIds.length) {
                        return res.status(400).json({
                            message: "One or more students do not exist"
                        });
                    }

                    const values = records.map(record => [
                        record.studentId,
                        Number(facultyId),
                        date,
                        record.status
                    ]);

                    const sql = `
                        INSERT INTO attendance
                        (student_id, faculty_id, attendance_date, status)
                        VALUES ?
                        ON DUPLICATE KEY UPDATE
                        faculty_id = VALUES(faculty_id),
                        status = VALUES(status)
                    `;

                    db.query(sql, [values], (saveErr) => {
                        if (saveErr) {
                            console.error(saveErr);
                            return res.status(500).json({
                                message: "Failed to save attendance."
                            });
                        }

                        res.json({
                            success: true,
                            message: "Attendance saved successfully!"
                        });
                    });
                }
            );
        }
    );
});

module.exports = router;
