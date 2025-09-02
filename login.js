const express = require('express');
const mysql = require('mysql');
const cors = require('cors');

const app = express();
const PORT = 3006;

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Basu@123',
    database: 'newschema'
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
        process.exit(1);
    }
    console.log('Connected to MySQL database');
});

db.query(`
    CREATE TABLE IF NOT EXISTS attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        roll_number VARCHAR(20),
        subjectName VARCHAR(100),
        status ENUM('Present', 'Absent'),
        date DATE,
        FOREIGN KEY (roll_number) REFERENCES students(studentId)
    )
`, (err) => {
    if (err) console.error('Error creating attendance table:', err);
});

const executeQuery = (query, params) => {
    return new Promise((resolve, reject) => {
        db.query(query, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
};

app.get('/dashboard/:rollNumber', async (req, res) => {
    const { rollNumber } = req.params;

    try {
        const studentQuery = `SELECT studentId, studentName, semester, email FROM students WHERE studentId = ?`;
        const studentData = await executeQuery(studentQuery, [rollNumber]);

        if (studentData.length === 0) {
            console.log(`Student with rollNumber ${rollNumber} not found`);
            return res.status(404).json({ message: 'Student not found.' });
        }

        const student = studentData[0];

        const attendanceQuery = `
            SELECT subjectName, 
                   COUNT(CASE WHEN status = 'Present' THEN 1 END) AS totalPresent,
                   COUNT(CASE WHEN status = 'Absent' THEN 1 END) AS totalAbsent
            FROM attendance
            WHERE roll_number = ?
            GROUP BY subjectName
        `;
        const attendanceData = await executeQuery(attendanceQuery, [rollNumber]);

        const totalAttendanceQuery = `
            SELECT COUNT(*) AS totalClasses,
                   COUNT(CASE WHEN status = 'Present' THEN 1 END) AS totalPresent
            FROM attendance
            WHERE roll_number = ?
        `;
        const totalAttendance = await executeQuery(totalAttendanceQuery, [rollNumber]);

        const totalPercentage = totalAttendance[0].totalClasses > 0
            ? ((totalAttendance[0].totalPresent / totalAttendance[0].totalClasses) * 100).toFixed(2)
            : 0;

        res.json({
            studentDetails: student,
            attendance: attendanceData.length > 0 ? attendanceData : [],
            totalPercentage,
            totalClasses: totalAttendance[0].totalClasses || 0
        });
    } catch (err) {
        console.error(`Error fetching dashboard for ${rollNumber}:`, err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
});

app.get('/total-students', async (req, res) => {
    try {
        const query = `SELECT COUNT(*) AS totalStudents FROM students`;
        const result = await executeQuery(query);
        res.json({ totalStudents: result[0].totalStudents || 0 });
    } catch (err) {
        console.error('Error fetching total students:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});