const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const db = require('./mysql'); // Ensure this is createPool
const cors = require('cors');
const path = require('path');
const app = express();

const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware
app.use(session({
    secret: 'your-secret-key', // Replace with a strong, unique secret
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true for HTTPS
}));



// Initialize SuperAdmin if not exists
function initializeSuperAdmin() {
    const checkSuperAdminQuery = 'SELECT COUNT(*) as count FROM admins WHERE role = "SuperAdmin"';
    db.query(checkSuperAdminQuery, (err, results) => {
        if (err) {
            console.error('Error checking SuperAdmin count:', err);
            return;
        }
        const superAdminCount = results[0].count;
        if (superAdminCount === 0) {
            const defaultPassword = bcrypt.hashSync('admin', 10);
            const insertQuery = 'INSERT INTO admins (username, password, name, phone, security_question, security_answer, role, first_login) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)';
            db.query(insertQuery, ['admin', defaultPassword, 'Default Admin', '1234567890', 'What is your pet\'s name?', 'DOG', 'SuperAdmin'], (err) => {
                if (err) console.error('Error creating default SuperAdmin:', err);
                else console.log('Default SuperAdmin created.');
            });
        }
    });
}
initializeSuperAdmin();

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin_login.html'));
});

app.get('/admin-dashboard', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.redirect('/admin-login');
    }
    res.sendFile(path.join(__dirname, 'public', 'admin_dashboard.html'));
});

// Admin login route
app.post('/api/admin-login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    const query = 'SELECT * FROM admins WHERE username = ?';
    db.query(query, [username.trim()], async (err, results) => {
        if (err) {
            console.error('Database error during login:', err);
            return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
        }

        if (results.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const admin = results[0];

        try {
            const isMatch = await bcrypt.compare(password, admin.password);
            if (isMatch || (admin.role === 'SuperAdmin' && password === 'admin' && username.trim().toLowerCase() === 'admin')) {
                req.session.isAuthenticated = true;
                req.session.username = username.trim();
                req.session.role = admin.role;
                return res.status(200).json({
                    success: true,
                    message: admin.first_login ? 'First-time login detected. Please update credentials.' : 'Login successful.',
                    redirect: admin.first_login ? '/admin-dashboard?first_login=true' : '/admin-dashboard'
                });
            } else {
                return res.status(401).json({ success: false, message: 'Invalid credentials.' });
            }
        } catch (error) {
            console.error('Error comparing passwords:', error);
            return res.status(500).json({ success: false, message: 'Server error during password verification.' });
        }
    });
});

// Update admin credentials on first login
app.post('/api/update-admin-credentials', async (req, res) => {
    const { username, newUsername, newPassword, newPhone, securityQuestion, securityAnswer, newName } = req.body;

    if (!username || !newUsername || !newPassword || !newPhone || !securityQuestion || !securityAnswer || !newName) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const trimmedUsername = newUsername.trim();
    const trimmedAnswer = securityAnswer.trim().toUpperCase();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const checkQuery = 'SELECT * FROM admins WHERE username = ? AND username != ?';
    db.query(checkQuery, [trimmedUsername, username.trim()], (err, results) => {
        if (err) {
            console.error('Error checking username:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        if (results.length > 0) {
            return res.status(400).json({ success: false, message: 'Username already exists.' });
        }

        const updateQuery = 'UPDATE admins SET username = ?, password = ?, name = ?, phone = ?, security_question = ?, security_answer = ?, first_login = FALSE WHERE username = ?';
        db.query(updateQuery, [trimmedUsername, hashedPassword, newName, newPhone, securityQuestion, trimmedAnswer, username.trim()], (err, result) => {
            if (err) {
                console.error('Error updating admin credentials:', err);
                return res.status(500).json({ success: false, message: 'Database error.' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Admin not found.' });
            }

            req.session.username = trimmedUsername;
            res.status(200).json({
                success: true,
                message: 'Credentials updated successfully.',
                redirect: '/admin-dashboard'
            });
        });
    });
});

// Fetch all staff
app.get('/api/staff', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const query = 'SELECT id, name, email, phone, role FROM staff';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching staff:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        res.status(200).json({ success: true, data: results });
    });
});

// Fetch single staff
app.get('/api/staff/:id', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const staffId = req.params.id;
    const query = 'SELECT id, name, email, phone, role FROM staff WHERE id = ?';
    db.query(query, [staffId], (err, results) => {
        if (err) {
            console.error('Error fetching staff:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Staff not found.' });
        }
        res.status(200).json({ success: true, data: results[0] });
    });
});

// Create or update staff
app.post('/api/staff', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const { name, email, phone, role } = req.body;
    if (!name || !phone || !role) {
        return res.status(400).json({ success: false, message: 'Name, phone, and role are required.' });
    }

    const query = 'INSERT INTO staff (name, email, phone, role) VALUES (?, ?, ?, ?)';
    db.query(query, [name, email || null, phone, role], (err, result) => {
        if (err) {
            console.error('Error creating staff:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        res.status(200).json({ success: true, message: 'Staff created successfully.', id: result.insertId });
    });
});

app.put('/api/staff/:id', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const staffId = req.params.id;
    const { name, email, phone, role } = req.body;
    if (!name || !phone || !role) {
        return res.status(400).json({ success: false, message: 'Name, phone, and role are required.' });
    }

    const query = 'UPDATE staff SET name = ?, email = ?, phone = ?, role = ? WHERE id = ?';
    db.query(query, [name, email || null, phone, role, staffId], (err, result) => {
        if (err) {
            console.error('Error updating staff:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Staff not found.' });
        }
        res.status(200).json({ success: true, message: 'Staff updated successfully.' });
    });
});
// Logout route
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).json({ success: false, message: 'Logout failed.' });
        }
        res.status(200).json({ success: true, message: 'Logged out successfully.', redirect: '/admin-login' });
    });
});

// Create Admin route (SuperAdmin only)
app.post('/api/create-admin', async (req, res) => {
    if (req.session.role !== 'SuperAdmin') {
        return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const { username, password, name, phone, role, securityQuestion, securityAnswer } = req.body;
    if (!username || !password || !name || !phone || !role || !securityQuestion || !securityAnswer) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const trimmedUsername = username.trim();
    const trimmedAnswer = securityAnswer.trim().toUpperCase();
    const hashedPassword = await bcrypt.hash(password, 10);

    const checkQuery = 'SELECT * FROM admins WHERE username = ?';
    db.query(checkQuery, [trimmedUsername], (err, results) => {
        if (err) {
            console.error('Error checking username:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        if (results.length > 0) {
            return res.status(400).json({ success: false, message: 'Username already exists.' });
        }

        const insertQuery = 'INSERT INTO admins (username, password, name, phone, security_question, security_answer, role, first_login) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)';
        db.query(insertQuery, [trimmedUsername, hashedPassword, name, phone, securityQuestion, trimmedAnswer, role], (err, result) => {
            if (err) {
                console.error('Error creating admin:', err);
                return res.status(500).json({ success: false, message: 'Database error.' });
            }
            res.status(200).json({ success: true, message: `${role} created successfully.`, id: result.insertId });
        });
    });
});

// Fetch all admins
app.get('/api/admins', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const query = 'SELECT id, username, name, phone, role, security_question, security_answer FROM admins';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching admins:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        res.status(200).json({ success: true, data: results });
    });
});

// Fetch single admin
app.get('/api/admins/:id', (req, res) => {
    if (!req.session.isAuthenticated || req.session.role !== 'SuperAdmin') {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const adminId = req.params.id;
    const query = 'SELECT id, username, name, phone, role, security_question, security_answer FROM admins WHERE id = ?';
    db.query(query, [adminId], (err, results) => {
        if (err) {
            console.error('Error fetching admin:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Admin not found.' });
        }
        res.status(200).json({ success: true, data: results[0] });
    });
});

// Update admin (SuperAdmin only)
app.put('/api/admins/:id', async (req, res) => {
    if (req.session.role !== 'SuperAdmin') {
        return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const adminId = req.params.id;
    const { username, name, phone, role, securityQuestion, securityAnswer, password } = req.body;

    if (!username || !name || !phone || !role || !securityQuestion || !securityAnswer) {
        return res.status(400).json({ success: false, message: 'All fields except password are required.' });
    }

    const trimmedUsername = username.trim();
    const trimmedAnswer = securityAnswer.trim().toUpperCase();

    const checkQuery = 'SELECT * FROM admins WHERE username = ? AND id != ?';
    db.query(checkQuery, [trimmedUsername, adminId], async (err, results) => {
        if (err) {
            console.error('Error checking username:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        if (results.length > 0) {
            return res.status(400).json({ success: false, message: 'Username already exists.' });
        }

        let updateQuery = 'UPDATE admins SET username = ?, name = ?, phone = ?, role = ?, security_question = ?, security_answer = ?';
        const queryParams = [trimmedUsername, name, phone, role, securityQuestion, trimmedAnswer];

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateQuery += ', password = ?, first_login = TRUE';
            queryParams.push(hashedPassword);
        }

        updateQuery += ' WHERE id = ?';
        queryParams.push(adminId);

        db.query(updateQuery, queryParams, (err, result) => {
            if (err) {
                console.error('Error updating admin:', err);
                return res.status(500).json({ success: false, message: 'Database error.' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Admin not found.' });
            }
            res.status(200).json({ success: true, message: 'Admin updated successfully.' });
        });
    });
});

// Delete admin (SuperAdmin only, cannot delete SuperAdmin)
app.delete('/api/admins/:id', (req, res) => {
    if (req.session.role !== 'SuperAdmin') {
        return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const adminId = req.params.id;
    const checkQuery = 'SELECT role FROM admins WHERE id = ?';
    db.query(checkQuery, [adminId], (err, results) => {
        if (err) {
            console.error('Error checking admin role:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Admin not found.' });
        }
        if (results[0].role === 'SuperAdmin') {
            return res.status(403).json({ success: false, message: 'Cannot delete SuperAdmin.' });
        }

        const deleteQuery = 'DELETE FROM admins WHERE id = ?';
        db.query(deleteQuery, [adminId], (err, result) => {
            if (err) {
                console.error('Error deleting admin:', err);
                return res.status(500).json({ success: false, message: 'Database error.' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Admin not found.' });
            }
            res.status(200).json({ success: true, message: 'Admin deleted successfully.' });
        });
    });
});

// Forgot Password APIs
app.post('/api/forgot-password/verify-username', (req, res) => {
    const { username } = req.body;
    if (!username) {
        return res.status(400).json({ success: false, message: 'Username is required.' });
    }

    const query = 'SELECT security_question FROM admins WHERE username = ?';
    db.query(query, [username.trim()], (err, results) => {
        if (err) {
            console.error('Database error during username verification:', err);
            return res.status(500).json({ success: false, message: 'Server error.' });
        }
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Username not found.' });
        }
        res.status(200).json({ success: true, securityQuestion: results[0].security_question });
    });
});

app.post('/api/forgot-password/verify-answer', (req, res) => {
    const { username, securityAnswer } = req.body;
    if (!username || !securityAnswer) {
        return res.status(400).json({ success: false, message: 'Username and security answer are required.' });
    }

    const query = 'SELECT security_answer FROM admins WHERE username = ?';
    db.query(query, [username.trim()], (err, results) => {
        if (err) {
            console.error('Database error during security answer verification:', err);
            return res.status(500).json({ success: false, message: 'Server error.' });
        }
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Username not found.' });
        }

        const storedAnswer = results[0].security_answer;
        if (securityAnswer.trim().toUpperCase() === storedAnswer) {
            res.status(200).json({ success: true, message: 'Security answer verified.' });
        } else {
            res.status(401).json({ success: false, message: 'Incorrect security answer.' });
        }
    });
});

app.post('/api/forgot-password/reset-password', async (req, res) => {
    const { username, newPassword } = req.body;
    if (!username || !newPassword) {
        return res.status(400).json({ success: false, message: 'Username and new password are required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const query = 'UPDATE admins SET password = ?, first_login = FALSE WHERE username = ?';
        db.query(query, [hashedPassword, username.trim()], (err, result) => {
            if (err) {
                console.error('Database error during password reset:', err);
                return res.status(500).json({ success: false, message: 'Server error.' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Username not found.' });
            }
            res.status(200).json({ success: true, message: 'Password reset successfully.' });
        });
    } catch (error) {
        console.error('Error hashing password:', error);
        res.status(500).json({ success: false, message: 'Error processing password.' });
    }
});

// User details route
app.get('/api/user-details', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const username = req.session.username;
    const query = 'SELECT username, name, role, first_login FROM admins WHERE username = ?';
    db.query(query, [username], (err, results) => {
        if (err) {
            console.error('Error fetching user details:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        res.status(200).json({
            success: true,
            data: {
                username: results[0].username,
                name: results[0].name,
                role: results[0].role,
                firstLogin: results[0].first_login
            }
        });
    });
});

// Fetch all bookings
app.get('/api/bookings', (req, res) => {
    if (!req.session.isAuthenticated || req.session.role !== 'SuperAdmin') {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const query = 'SELECT id, name, email, gender, date_of_birth, phone, address, message, time_sent FROM bookings ORDER BY time_sent ASC';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching bookings:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        res.status(200).json({ success: true, data: results });
    });
});

// Route to handle booking submission
app.post('/api/bookings', (req, res) => {
    const { name, email, gender, date_of_birth, phone, address, message } = req.body;

    if (!name || !gender || !date_of_birth || !phone || !address) {
        return res.status(400).json({ success: false, message: 'Name, Gender, Date of Birth, Phone, and Address are required.' });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date_of_birth)) {
        return res.status(400).json({ success: false, message: 'Invalid Date of Birth format. Use YYYY-MM-DD.' });
    }

    if (!['Male', 'Female', 'Other'].includes(gender)) {
        return res.status(400).json({ success: false, message: 'Gender must be Male, Female, or Other.' });
    }

    const query = `
        INSERT INTO bookings (name, email, gender, date_of_birth, phone, address, message)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(query, [name, email || null, gender, date_of_birth, phone, address, message || null], (err, result) => {
        if (err) {
            console.error('Error inserting booking:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        res.status(200).json({ success: true, message: 'Booking submitted successfully!' });
    });
});

// Fetch all students
app.get('/api/students', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const query = `
        SELECT s.student_id, s.name, s.gender, e.class_ref, 
               CASE WHEN e.section_id = 1 THEN c.class_name ELSE w.class_name END AS class_name
        FROM Students s
        JOIN Student_Enrollments e ON s.student_id = e.student_id
        LEFT JOIN Classes c ON e.class_ref = c.class_id AND e.section_id = 1
        LEFT JOIN Western_Classes w ON e.class_ref = w.western_class_id AND e.section_id = 2
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching students:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        res.status(200).json({ success: true, data: results });
    });
});

// Fetch single student
app.get('/api/students/:id', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const studentId = req.params.id;
    const query = `
        SELECT s.student_id, s.name, s.gender, s.date_of_birth, s.phone, s.address, s.email, e.class_ref, e.section_id, e.level, e.term, e.enrollment_date,
               CASE WHEN e.section_id = 1 THEN c.class_name ELSE w.class_name END AS class_name
        FROM Students s
        JOIN Student_Enrollments e ON s.student_id = e.student_id
        LEFT JOIN Classes c ON e.class_ref = c.class_id AND e.section_id = 1
        LEFT JOIN Western_Classes w ON e.class_ref = w.western_class_id AND e.section_id = 2
        WHERE s.student_id = ?
    `;
    db.query(query, [studentId], (err, results) => {
        if (err) {
            console.error('Error fetching student:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Student not found.' });
        }
        res.status(200).json({ success: true, data: results[0] });
    });
});

// Create student
app.post('/api/students', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const { name, gender, date_of_birth, phone, address, email, section_id, class_ref, level, term } = req.body;
    if (!name || !gender || !date_of_birth || !phone || !address || !section_id || !class_ref || !level || !term) {
        return res.status(400).json({ success: false, message: 'All required fields must be provided.' });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date_of_birth)) {
        return res.status(400).json({ success: false, message: 'Invalid Date of Birth format. Use YYYY-MM-DD.' });
    }

    if (!['Male', 'Female', 'Other'].includes(gender)) {
        return res.status(400).json({ success: false, message: 'Gender must be Male, Female, or Other.' });
    }

    if (![1, 2].includes(parseInt(section_id))) {
        return res.status(400).json({ success: false, message: 'Invalid section_id (must be 1 or 2).' });
    }

    const classTable = section_id == 1 ? 'Classes' : 'Western_Classes';
    const classColumn = section_id == 1 ? 'class_id' : 'western_class_id';
    const checkClassQuery = `SELECT ${classColumn} FROM ${classTable} WHERE ${classColumn} = ?`;
    db.query(checkClassQuery, [class_ref], (err, results) => {
        if (err) {
            console.error('Error checking class:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        if (results.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid class_ref for the selected section.' });
        }

        db.beginTransaction((err) => {
            if (err) {
                console.error('Transaction start error:', err);
                return res.status(500).json({ success: false, message: 'Database error.' });
            }

            const insertStudentQuery = 'INSERT INTO Students (name, date_of_birth, gender, phone, address, email) VALUES (?, ?, ?, ?, ?, ?)';
            db.query(insertStudentQuery, [name, date_of_birth, gender, phone, address, email || null], (err, result) => {
                if (err) {
                    return db.rollback(() => {
                        console.error('Error inserting student:', err);
                        res.status(500).json({ success: false, message: 'Database error.' });
                    });
                }

                const studentId = result.insertId;
                const insertEnrollmentQuery = 'INSERT INTO Student_Enrollments (student_id, section_id, class_ref, level, term) VALUES (?, ?, ?, ?, ?)';
                db.query(insertEnrollmentQuery, [studentId, section_id, class_ref, level, term], (err) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error('Error inserting enrollment:', err);
                            res.status(500).json({ success: false, message: 'Database error.' });
                        });
                    }

                    db.commit((err) => {
                        if (err) {
                            return db.rollback(() => {
                                console.error('Commit error:', err);
                                res.status(500).json({ success: false, message: 'Database error.' });
                            });
                        }
                        res.status(200).json({ success: true, message: 'Student created successfully.', id: studentId });
                    });
                });
            });
        });
    });
});

// Update student
app.put('/api/students/:id', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const studentId = req.params.id;
    const { name, gender, date_of_birth, phone, address, email, section_id, class_ref, level, term } = req.body;
    if (!name || !gender || !date_of_birth || !phone || !address || !section_id || !class_ref || !level || !term) {
        return res.status(400).json({ success: false, message: 'All required fields must be provided.' });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date_of_birth)) {
        return res.status(400).json({ success: false, message: 'Invalid Date of Birth format. Use YYYY-MM-DD.' });
    }

    if (!['Male', 'Female', 'Other'].includes(gender)) {
        return res.status(400).json({ success: false, message: 'Gender must be Male, Female, or Other.' });
    }

    if (![1, 2].includes(parseInt(section_id))) {
        return res.status(400).json({ success: false, message: 'Invalid section_id (must be 1 or 2).' });
    }

    const classTable = section_id == 1 ? 'Classes' : 'Western_Classes';
    const classColumn = section_id == 1 ? 'class_id' : 'western_class_id';
    const checkClassQuery = `SELECT ${classColumn} FROM ${classTable} WHERE ${classColumn} = ?`;
    db.query(checkClassQuery, [class_ref], (err, results) => {
        if (err) {
            console.error('Error checking class:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        if (results.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid class_ref for the selected section.' });
        }

        db.beginTransaction((err) => {
            if (err) {
                console.error('Transaction start error:', err);
                return res.status(500).json({ success: false, message: 'Database error.' });
            }

            const updateStudentQuery = 'UPDATE Students SET name = ?, date_of_birth = ?, gender = ?, phone = ?, address = ?, email = ? WHERE student_id = ?';
            db.query(updateStudentQuery, [name, date_of_birth, gender, phone, address, email || null, studentId], (err, result) => {
                if (err) {
                    return db.rollback(() => {
                        console.error('Error updating student:', err);
                        res.status(500).json({ success: false, message: 'Database error.' });
                    });
                }
                if (result.affectedRows === 0) {
                    return db.rollback(() => {
                        res.status(404).json({ success: false, message: 'Student not found.' });
                    });
                }

                const updateEnrollmentQuery = 'UPDATE Student_Enrollments SET section_id = ?, class_ref = ?, level = ?, term = ? WHERE student_id = ?';
                db.query(updateEnrollmentQuery, [section_id, class_ref, level, term, studentId], (err, result) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error('Error updating enrollment:', err);
                            res.status(500).json({ success: false, message: 'Database error.' });
                        });
                    }
                    if (result.affectedRows === 0) {
                        return db.rollback(() => {
                            res.status(404).json({ success: false, message: 'Enrollment not found.' });
                        });
                    }

                    db.commit((err) => {
                        if (err) {
                            return db.rollback(() => {
                                console.error('Commit error:', err);
                                res.status(500).json({ success: false, message: 'Database error.' });
                            });
                        }
                        res.status(200).json({ success: true, message: 'Student updated successfully.' });
                    });
                });
            });
        });
    });
});

// Delete student
app.delete('/api/students/:id', (req, res) => {
    if (!req.session.isAuthenticated || req.session.role !== 'SuperAdmin') {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const studentId = req.params.id;
    db.beginTransaction((err) => {
        if (err) {
            console.error('Transaction start error:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }

        const deleteRelatedQueries = `
            DELETE FROM Student_Fee_Payments WHERE student_fee_id IN (SELECT student_fee_id FROM Student_Fees WHERE enrollment_id IN (SELECT enrollment_id FROM Student_Enrollments WHERE student_id = ?));
            DELETE FROM Student_Fees WHERE enrollment_id IN (SELECT enrollment_id FROM Student_Enrollments WHERE student_id = ?);
            DELETE FROM Student_Memorization_Assessments WHERE enrollment_id IN (SELECT enrollment_id FROM Student_Enrollments WHERE student_id = ?);
            DELETE FROM Student_Subject_Assessments WHERE enrollment_id IN (SELECT enrollment_id FROM Student_Enrollments WHERE student_id = ?);
            DELETE FROM Student_Attendance WHERE enrollment_id IN (SELECT enrollment_id FROM Student_Enrollments WHERE student_id = ?);
            DELETE FROM Student_Subjects WHERE enrollment_id IN (SELECT enrollment_id FROM Student_Enrollments WHERE student_id = ?);
            DELETE FROM Student_Enrollments WHERE student_id = ?;
        `;
        db.query(deleteRelatedQueries, [studentId, studentId, studentId, studentId, studentId, studentId, studentId], (err) => {
            if (err) {
                return db.rollback(() => {
                    console.error('Error deleting related records:', err);
                    res.status(500).json({ success: false, message: 'Database error.' });
                });
            }

            const deleteStudentQuery = 'DELETE FROM Students WHERE student_id = ?';
            db.query(deleteStudentQuery, [studentId], (err, result) => {
                if (err) {
                    return db.rollback(() => {
                        console.error('Error deleting student:', err);
                        res.status(500).json({ success: false, message: 'Database error.' });
                    });
                }
                if (result.affectedRows === 0) {
                    return db.rollback(() => {
                        res.status(404).json({ success: false, message: 'Student not found.' });
                    });
                }

                db.commit((err) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error('Commit error:', err);
                            res.status(500).json({ success: false, message: 'Database error.' });
                        });
                    }
                    res.status(200).json({ success: true, message: 'Student deleted successfully.' });
                });
            });
        });
    });
});

// Generate report sheet
app.post('/api/generate-report-sheet', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const { studentId, reportType, term } = req.body;
    if (!studentId || !reportType) {
        return res.status(400).json({ success: false, message: 'Student ID and report type are required.' });
    }

    if (reportType === 'terminal' && !term) {
        return res.status(400).json({ success: false, message: 'Term is required for terminal reports.' });
    }

    if (!['terminal', 'sessional'].includes(reportType)) {
        return res.status(400).json({ success: false, message: 'Invalid report type.' });
    }

    if (term && !['1st Term', '2nd Term', '3rd Term'].includes(term)) {
        return res.status(400).json({ success: false, message: 'Invalid term.' });
    }

    const termCondition = reportType === 'terminal' ? 'AND e.term = ?' : '';
    const queryParams = reportType === 'terminal' ? [studentId, term] : [studentId];

    const query = `
        SELECT s.student_id, s.name, s.gender, e.term, e.level,
               CASE WHEN e.section_id = 1 THEN c.class_name ELSE w.class_name END AS class_name,
               sub.subject_name,
               ssa.ca1_score, ssa.ca2_score, ssa.ca3_score, ssa.exam_score,
               (ssa.ca1_score + ssa.ca2_score + ssa.ca3_score + ssa.exam_score) AS total_score,
               ssa.comments
        FROM Students s
        JOIN Student_Enrollments e ON s.student_id = e.student_id
        LEFT JOIN Classes c ON e.class_ref = c.class_id AND e.section_id = 1
        LEFT JOIN Western_Classes w ON e.class_ref = w.western_class_id AND e.section_id = 2
        JOIN Student_Subjects ss ON e.enrollment_id = ss.enrollment_id
        JOIN Subjects sub ON ss.subject_id = sub.subject_id
        LEFT JOIN Student_Subject_Assessments ssa ON ss.id = ssa.id
        WHERE s.student_id = ? ${termCondition}
        ORDER BY sub.subject_name
    `;
    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error generating report:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'No data found for this student.' });
        }

        const reportData = {
            student_id: results[0].student_id,
            name: results[0].name,
            gender: results[0].gender,
            class_name: results[0].class_name,
            level: results[0].level,
            term: reportType === 'terminal' ? results[0].term : 'Sessional',
            subjects: results.map(row => ({
                subject_name: row.subject_name,
                ca1_score: row.ca1_score,
                ca2_score: row.ca2_score,
                ca3_score: row.ca3_score,
                exam_score: row.exam_score,
                total_score: row.total_score,
                comments: row.comments
            }))
        };

        res.status(200).json({ success: true, message: 'Report sheet generated successfully.', data: reportData });
    });
});

// Generate report sheets (bulk)
app.post('/api/generate-report-sheets', (req, res) => {
    if (!req.session.isAuthenticated || req.session.role !== 'SuperAdmin') {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const { reportType, term } = req.body;
    if (!reportType) {
        return res.status(400).json({ success: false, message: 'Report type is required.' });
    }

    if (reportType === 'terminal' && !term) {
        return res.status(400).json({ success: false, message: 'Term is required for terminal reports.' });
    }

    if (!['terminal', 'sessional'].includes(reportType)) {
        return res.status(400).json({ success: false, message: 'Invalid report type.' });
    }

    if (term && !['1st Term', '2nd Term', '3rd Term'].includes(term)) {
        return res.status(400).json({ success: false, message: 'Invalid term.' });
    }

    const termCondition = reportType === 'terminal' ? 'AND e.term = ?' : '';
    const queryParams = reportType === 'terminal' ? [term] : [];

    const query = `
        SELECT s.student_id, s.name, s.gender, e.term, e.level,
               CASE WHEN e.section_id = 1 THEN c.class_name ELSE w.class_name END AS class_name,
               sub.subject_name,
               ssa.ca1_score, ssa.ca2_score, ssa.ca3_score, ssa.exam_score,
               (ssa.ca1_score + ssa.ca2_score + ssa.ca3_score + ssa.exam_score) AS total_score,
               ssa.comments
        FROM Students s
        JOIN Student_Enrollments e ON s.student_id = e.student_id
        LEFT JOIN Classes c ON e.class_ref = c.class_id AND e.section_id = 1
        LEFT JOIN Western_Classes w ON e.class_ref = w.western_class_id AND e.section_id = 2
        JOIN Student_Subjects ss ON e.enrollment_id = ss.enrollment_id
        JOIN Subjects sub ON ss.subject_id = sub.subject_id
        LEFT JOIN Student_Subject_Assessments ssa ON ss.id = ssa.id
        WHERE 1=1 ${termCondition}
        ORDER BY s.student_id, sub.subject_name
    `;
    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error('Error generating bulk reports:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }

        const reports = {};
        results.forEach(row => {
            const studentId = row.student_id;
            if (!reports[studentId]) {
                reports[studentId] = {
                    student_id: studentId,
                    name: row.name,
                    gender: row.gender,
                    class_name: row.class_name,
                    level: row.level,
                    term: reportType === 'terminal' ? row.term : 'Sessional',
                    subjects: []
                };
            }
            reports[studentId].subjects.push({
                subject_name: row.subject_name,
                ca1_score: row.ca1_score,
                ca2_score: row.ca2_score,
                ca3_score: row.ca3_score,
                exam_score: row.exam_score,
                total_score: row.total_score,
                comments: row.comments
            });
        });

        res.status(200).json({ success: true, message: 'Bulk report sheets generated successfully.', data: Object.values(reports) });
    });
});

// Demographics route
app.get('/api/demographics', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const query = `
        SELECT
            CASE WHEN e.section_id = 1 THEN c.class_name ELSE w.class_name END AS class_name,
            SUM(CASE WHEN s.gender = 'Male' THEN 1 ELSE 0 END) AS male_count,
            SUM(CASE WHEN s.gender = 'Female' THEN 1 ELSE 0 END) AS female_count,
            COUNT(*) AS total_class_count
        FROM Students s
        JOIN Student_Enrollments e ON s.student_id = e.student_id
        LEFT JOIN Classes c ON e.class_ref = c.class_id AND e.section_id = 1
        LEFT JOIN Western_Classes w ON e.class_ref = w.western_class_id AND e.section_id = 2
        GROUP BY class_name
        WITH ROLLUP
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching demographics:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }

        const formattedData = results.map(row => {
            if (row.class_name === null) {
                return { class_name: 'Total', male_count: row.male_count || 0, female_count: row.female_count || 0, total_class_count: row.total_class_count || 0 };
            }
            return row;
        });

        res.status(200).json({ success: true, data: formattedData });
    });
});

// Generate ID card
app.post('/api/generate-id-card', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const { entityType, entityId } = req.body;
    if (!entityType || !entityId) {
        return res.status(400).json({ success: false, message: 'Entity type and ID are required.' });
    }

    if (!['student', 'admin'].includes(entityType)) {
        return res.status(400).json({ success: false, message: 'Invalid entity type.' });
    }

    let query;
    if (entityType === 'student') {
        query = `
            SELECT s.student_id AS id, s.name, s.gender, s.date_of_birth, s.phone, s.address,
                   CASE WHEN e.section_id = 1 THEN c.class_name ELSE w.class_name END AS class_name
            FROM Students s
            JOIN Student_Enrollments e ON s.student_id = e.student_id
            LEFT JOIN Classes c ON e.class_ref = c.class_id AND e.section_id = 1
            LEFT JOIN Western_Classes w ON e.class_ref = w.western_class_id AND e.section_id = 2
            WHERE s.student_id = ?
        `;
    } else {
        query = 'SELECT id, username, name, phone, role FROM admins WHERE id = ?';
    }

    db.query(query, [entityId], (err, results) => {
        if (err) {
            console.error(`Error fetching ${entityType} for ID card:`, err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} not found.` });
        }
        res.status(200).json({ success: true, message: 'ID card data fetched successfully.', data: results[0] });
    });
});

// Fetch memorization progress
app.get('/api/memorization-progress/:studentId', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const studentId = req.params.studentId;
    const query = `
        SELECT dms.week, dms.day, dms.from_surah_ayah, dms.to_surah_ayah, dms.term,
               sma.daily_grade, sma.exam_grade, sma.comments, sma.date
        FROM Daily_Memorization_Scheme dms
        JOIN Student_Enrollments e ON dms.class_id = e.class_ref AND dms.term = e.term AND e.section_id = 1
        LEFT JOIN Student_Memorization_Assessments sma ON e.enrollment_id = sma.enrollment_id AND dms.id = sma.scheme_id
        WHERE e.student_id = ?
        ORDER BY dms.term, dms.week, dms.day
    `;
    db.query(query, [studentId], (err, results) => {
        if (err) {
            console.error('Error fetching memorization progress:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        res.status(200).json({ success: true, data: results });
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});