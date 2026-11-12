
const express = require("express");
const db = require("./db");

const router = express.Router();

// ======================================
// 1. GET ATTENDANCE SUMMARY FOR A DATE
// ======================================
router.get("/summary/today", (req, res) => {
    const date = req.query.date;

    if (!date) {
        return res.status(400).json({
            success: false,
            message: "Attendance date is required."
        });
    }

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


// ======================================
// 2. GET ATTENDANCE HISTORY FOR STUDENT
// ======================================
router.get("/student/:studentId", (req, res) => {
    const sql = `
        SELECT
            a.id AS attendance_id,
            a.student_id,
            a.faculty_id,
            a.attendance_date,
            a.period_number,
            a.subject,
            a.status,
            a.created_at,
            s.name AS student_name,
            s.roll_no,
            s.student_class
        FROM attendance a
        JOIN students s ON s.id = a.student_id
        WHERE a.student_id = ?
        ORDER BY a.attendance_date DESC, a.period_number ASC
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


// ======================================
// 3. GET ATTENDANCE PERCENTAGE
// ======================================
router.get("/percentage/:studentId", (req, res) => {
    const sql = `
        SELECT
            COUNT(*) AS totalPeriods,
            SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS presentPeriods,
            SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) AS absentPeriods
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

        const totalPeriods = Number(results[0].totalPeriods || 0);
        const presentPeriods = Number(results[0].presentPeriods || 0);
        const absentPeriods = Number(results[0].absentPeriods || 0);

        const percentage = totalPeriods > 0
            ? (presentPeriods / totalPeriods) * 100
            : 0;

        res.json({
            totalPeriods,
            presentPeriods,
            absentPeriods,
            percentage: Number(percentage.toFixed(2)),

            // Old field names retained for compatibility
            totalDays: totalPeriods,
            presentDays: presentPeriods,
            absentDays: absentPeriods
        });
    });
});


// ======================================
// 4. GET ALL ATTENDANCE FOR A CLASS
// ======================================
router.get("/class/:className", (req, res) => {
    const sql = `
        SELECT
            a.id AS attendance_id,
            a.student_id,
            s.roll_no,
            s.name AS student_name,
            s.student_class,
            a.faculty_id,
            a.attendance_date,
            a.period_number,
            a.subject,
            a.status
        FROM students s
        LEFT JOIN attendance a ON a.student_id = s.id
        WHERE s.student_class = ?
        ORDER BY s.roll_no, a.attendance_date DESC, a.period_number
    `;

    db.query(sql, [req.params.className], (err, results) => {
        if (err) {
            console.error("Class attendance error:", err);
            return res.status(500).json({
                success: false,
                message: "Could not load class attendance."
            });
        }

        res.json(results);
    });
});


// ======================================
// 5. SEARCH ATTENDANCE BY ROLL NUMBER
// ======================================
router.get("/search/:rollNo", (req, res) => {
    const sql = `
        SELECT
            a.id AS attendance_id,
            a.student_id,
            s.roll_no,
            s.name AS student_name,
            s.student_class,
            a.attendance_date,
            a.period_number,
            a.subject,
            a.status,
            a.faculty_id
        FROM students s
        LEFT JOIN attendance a ON a.student_id = s.id
        WHERE s.roll_no = ?
        ORDER BY a.attendance_date DESC, a.period_number ASC
    `;

    db.query(sql, [req.params.rollNo], (err, results) => {
        if (err) {
            console.error("Roll number search error:", err);
            return res.status(500).json({
                success: false,
                message: "Could not search attendance."
            });
        }

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Student not found."
            });
        }

        res.json(results);
    });
});


// ======================================
// 6. SAVE PERIOD-WISE ATTENDANCE
// ======================================
router.post("/save", (req, res) => {
    const { date, facultyId, periodNumber, subject, records } = req.body;

    if (
        !date ||
        !facultyId ||
        !Number.isInteger(Number(periodNumber)) ||
        Number(periodNumber) < 1 ||
        Number(periodNumber) > 6 ||
        !subject ||
        !subject.trim() ||
        !Array.isArray(records) ||
        records.length === 0
    ) {
        return res.status(400).json({
            success: false,
            message: "Date, faculty, period (1-6), subject and records are required."
        });
    }

    const studentIds = records.map(record => Number(record.studentId));

    if (
        records.some(record =>
            !Number.isInteger(Number(record.studentId)) ||
            Number(record.studentId) <= 0 ||
            !["Present", "Absent"].includes(record.status)
        ) ||
        new Set(studentIds).size !== studentIds.length
    ) {
        return res.status(400).json({
            success: false,
            message: "Attendance records are invalid or contain duplicate students."
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

        // Use a transaction so a failed save does not leave
        // only some students' attendance saved.
        db.beginTransaction(err => {
            if (err) {
                console.error("Transaction error:", err);
                return res.status(500).json({
                    success: false,
                    message: "Could not start attendance saving."
                });
            }

            let index = 0;

            function saveNext() {
                if (index >= records.length) {
                    return db.commit(err => {
                        if (err) {
                            return db.rollback(() => {
                                console.error("Commit error:", err);
                                res.status(500).json({
                                    success: false,
                                    message: "Could not finish saving attendance."
                                });
                            });
                        }

                        res.json({
                            success: true,
                            message: "Period-wise attendance saved successfully!",
                            savedRecords: records.length,
                            periodNumber: Number(periodNumber),
                            subject: subject.trim()
                        });
                    });
                }

                const record = records[index];

                const sql = `
                    INSERT INTO attendance
                    (
                        student_id,
                        faculty_id,
                        attendance_date,
                        period_number,
                        subject,
                        status
                    )
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        faculty_id = VALUES(faculty_id),
                        subject = VALUES(subject),
                        status = VALUES(status)
                `;

                db.query(
                    sql,
                    [
                        record.studentId,
                        facultyId,
                        date,
                        Number(periodNumber),
                        subject.trim(),
                        record.status
                    ],
                    err => {
                        if (err) {
                            return db.rollback(() => {
                                console.error("Attendance save error:", err);
                                res.status(500).json({
                                    success: false,
                                    message: "Could not save attendance. No partial changes were committed."
                                });
                            });
                        }

                        index++;
                        saveNext();
                    }
                );
            }

            saveNext();
        });
    });
});

module.exports = router;
