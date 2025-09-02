const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const nodemailer = require('nodemailer'); // For sending email
const PDFDocument = require('pdfkit'); // For creating PDF
const fs = require('fs'); // To save PDF locally
const path = require('path'); // For path management
const ExcelJS = require('exceljs'); // For exporting attendance to Excel

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// MySQL Database Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Basu@123', // Your MySQL password
    database: 'newschema'
});

// Connect to the database
db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.message);
        return;
    }
    console.log('Connected to MySQL database');
});

// Function to generate a modern and visually appealing PDF
const generateModernPDF = (studentDetails) => {
    const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait'
    });

    // Path where the PDF will be saved
    const filePath = path.join(__dirname, 'student_admission.pdf');

    // Pipe the PDF to a file
    doc.pipe(fs.createWriteStream(filePath));

    // College Logo (If Available)
    // Uncomment this part if you have a logo
    // const logoPath = path.join(__dirname, 'college_logo.png');
    // doc.image(logoPath, { width: 100, align: 'center' });
    doc.moveDown(1);

    // Header - College & Department Name
    doc.fontSize(22).fillColor('#0A74DA').text('BLDEACET Engineering College', { align: 'center', font: 'Helvetica-Bold' });
    doc.fontSize(16).fillColor('#1A73E8').text('Department of Information Science and Engineering', { align: 'center', font: 'Helvetica-Oblique' });
    doc.moveDown(1);  // Space between the header and next section

    // Admission Confirmation Title
    doc.fontSize(18).fillColor('#0288d1').text('Student Admission Confirmation', { align: 'center', underline: true });
    doc.moveDown(2); // Space after title

    // Student Greeting Message
    doc.fontSize(14).fillColor('#333').text('Dear ' + studentDetails.studentName + ',', { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(12).text('We are excited to confirm your admission to BLDEACET Engineering College, Bijapur. Below are your details:', { align: 'left' });
    doc.moveDown(2); // Space before student details

    // Add a line separator for visual appeal
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#0288d1').lineWidth(1).stroke();
    doc.moveDown(1);

    // Student Details (Styled)
    const studentInfo = [
        ['Student ID', studentDetails.studentId],
        ['Name', studentDetails.studentName],
        ['Semester', studentDetails.semester],
        ['Phone Number', studentDetails.phone_number],
        ['Email', studentDetails.email],
        ['Date of Birth', studentDetails.dob],
        ['Gender', studentDetails.gender]
    ];

    // Loop over student info and display each detail in a modern way
    studentInfo.forEach((item, index) => {
        doc.fontSize(12).fillColor('#0A74DA').text(item[0] + ':', 50, doc.y, { width: 150, align: 'left', bold: true });
        doc.fontSize(12).fillColor('#555').text(item[1], 180, doc.y, { width: 350, align: 'left' });
        doc.moveDown(1); // Space between lines
    });

    // Decorative Line
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#0288d1').lineWidth(1).stroke();
    doc.moveDown(1); // Space after line

    // Footer Section with Warm Welcome Message
    doc.fontSize(12).fillColor('#333').text('We are thrilled to have you join our community!', { align: 'center' });
    doc.moveDown(0.5);
    doc.text('Best regards,', { align: 'center' });
    doc.text('HOD, Department of ISE', { align: 'center' });
    doc.text('Dr. Prakash Unki', { align: 'center' });
    doc.moveDown(2); // Space for final part

    // Optional: Footer - Contact Information or Address (if needed)
    doc.fontSize(10).fillColor('#aaa').text('For any inquiries, please contact us at: admissions@bldeacet.edu.in', { align: 'center' });
    doc.text('BLDEACET Engineering College, Bijapur, India', { align: 'center' });

    // End the document
    doc.end();

    return filePath; // Returning the file path
};


// Function to send an email with the PDF attached
const sendEmailWithPDF = (to, subject, text, filePath) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'basavarajsindgi91@gmail.com',  // Sender email address
            pass: '**** **** ****'          // Sender email password (App-specific password)
        }
    });

    const mailOptions = {
        from: 'basavarajsindgi91@gmail.com',  // Sender email address
        to: to,                             // Recipient email address
        subject: subject,                   // Subject of the email
        text: text,                          // Email body
        attachments: [
            {
                filename: 'student_admission.pdf',
                path: filePath // Path of the generated PDF file
            }
        ]
    };

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.error('Error sending email:', err);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
};

// Route to add a new student and send a confirmation email with a PDF
app.post('/add-student', (req, res) => {
    const { studentId, studentName, semester, phone_number, email, dob, gender } = req.body;

    // Check if all required fields are provided
    if (!studentId || !studentName || !semester || !phone_number || !email || !dob || !gender) {
        return res.status(400).send('All student details are required');
    }

    // Insert student data into the database
    const query = 'INSERT INTO students (studentId, studentName, semester, phone_number, email, dob, gender) VALUES (?, ?, ?, ?, ?, ?, ?)';
    db.query(query, [studentId, studentName, semester, phone_number, email, dob, gender], (err, result) => {
        if (err) {
            console.error('Error adding student:', err.message);
            return res.status(500).send('Error adding student');
        }

        // Create PDF for the student details
        const studentDetails = { studentId, studentName, semester, phone_number, email, dob, gender };
        const pdfPath = generateModernPDF(studentDetails);

        // Email content
        const emailSubject = 'Admission Confirmation at BLDEACET Engineering College, Bijapur';
        const emailText = `Dear ${studentName},

        Congratulations! You have successfully completed the admission process at **BLDEACET Engineering College, Bijapur**.

        Please find attached your admission details in a PDF.

        Best regards,
        **BLDEACET Engineering College, Bijapur**
        `;

        // Send email with the PDF attached
        sendEmailWithPDF(email, emailSubject, emailText, pdfPath);

        res.send('Student added successfully and confirmation email with PDF sent!');
    });
});

// Route to fetch students by semester
app.get('/students/:semester', (req, res) => {
    const semester = req.params.semester;
    const query = 'SELECT studentId, studentName, semester, phone_number, email, dob, gender FROM students WHERE semester = ?';
    db.query(query, [semester], (err, results) => {
        if (err) {
            console.error('Error fetching students:', err.message);
            return res.status(500).send('Error fetching students');
        }
        res.json(results);
    });
});

// Route to delete a student by ID
app.delete('/delete-student/:studentId', (req, res) => {
    const studentId = req.params.studentId;
    const query = 'DELETE FROM students WHERE studentId = ?';
    db.query(query, [studentId], (err, result) => {
        if (err) {
            console.error('Error deleting student:', err.message);
            return res.status(500).send('Error deleting student');
        }
        if (result.affectedRows > 0) {
            res.send('Student deleted successfully');
        } else {
            res.status(404).send('Student not found');
        }
    });
});

// Route to save attendance, with update on duplicate entries
app.post('/attendance', (req, res) => {
    const { date, attendance } = req.body;
    if (!date || !attendance || !Array.isArray(attendance)) {
        return res.status(400).send('Date and attendance details are required');
    }

    const query = `
        INSERT INTO attendance (date, roll_number, status)
        VALUES ? ON DUPLICATE KEY UPDATE status = VALUES(status)
    `;
    const attendanceData = attendance.map(record => [date, record.roll_number, record.status]);

    db.query(query, [attendanceData], (err, results) => {
        if (err) {
            console.error('Error saving attendance:', err.message);
            return res.status(500).send('Error saving attendance');
        }
        res.json({ message: 'Attendance saved successfully' });
    });
});

// Route to export attendance to Excel
app.get('/export-attendance', (req, res) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance');

    worksheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Roll Number', key: 'roll_number', width: 10 },
        { header: 'Status', key: 'status', width: 15 }
    ];

    // Fetch attendance from the database
    const query = 'SELECT * FROM attendance';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching attendance:', err.message);
            return res.status(500).send('Error fetching attendance');
        }

        results.forEach(record => {
            worksheet.addRow({
                date: record.date,
                roll_number: record.roll_number,
                status: record.status
            });
        });

        // Generate Excel file and send it as a response
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=attendance.xlsx');
        workbook.xlsx.write(res)
            .then(() => res.end());
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

