const mysql = require("mysql2");

// Railway MySQL database connection
const db = mysql.createConnection({
    host: process.env.MYSQLHOST || process.env.DB_HOST || "localhost",

    user: process.env.MYSQLUSER || process.env.DB_USER || "root",

    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || "",

    database: process.env.MYSQLDATABASE || process.env.DB_NAME || "student_attendance",

    port: Number(process.env.MYSQLPORT || process.env.DB_PORT || 3306),

    connectTimeout: 20000
});

// Connect to MySQL
db.connect((err) => {
    if (err) {
        console.error("DATABASE ERROR DETAILS:", err);
        return;
    }

    console.log("==================================");
    console.log("MySQL database connected successfully!");
    console.log("Database:", process.env.MYSQLDATABASE || process.env.DB_NAME);
    console.log("==================================");
});

// Export database connection
module.exports = db;