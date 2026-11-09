
const mysql = require("mysql2");

// MySQL database connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "", // Enter your MySQL password here if you have one
    database: "student_attendance"
});

// Connect to MySQL
db.connect((err) => {
    if (err) {
        console.error("Database connection failed:", err.message);
        return;
    }

    console.log("MySQL database connected successfully!");
});

module.exports = db;
