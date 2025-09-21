const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const db = require('./mysql'); // Ensure mysql.js is configured correctly

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
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
            db.query(insertQuery, ['admin', defaultPassword, 'Default Admin', '1234567890', 'What is your pet\'s name?', 'DOG', 'SuperAdmin', true], (err) => {
                if (err) console.error('Error creating default SuperAdmin:', err);
                else console.log('Default SuperAdmin created.');
            });
        }
    });
}
initializeSuperAdmin();

// Serve static HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin_login.html'));
});

app.get('/staff-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'staff_login.html'));
});

app.get('/student-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'student_login.html'));
});

app.get('/admin-dashboard', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.redirect('/admin-login');
    }
    res.sendFile(path.join(__dirname, 'public', 'admin_dashboard.html'));
});

// Admin login route
app.post('/api/admin-login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    const query = 'SELECT * FROM admins WHERE username = ?';
    db.query(query, [username.trim()], async (err, results) => {
        if (err) {
            console.error('Database error during login:', err);
            return res.status(500).json({ success: false, message: 'Server error.' });
        }

        if (results.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const admin = results[0];

        if (admin.first_login) {
            const isMatch = await bcrypt.compare(password, admin.password);
            if (isMatch || (admin.role === 'SuperAdmin' && password === 'admin' && username.trim() === 'admin')) {
                req.session.isAuthenticated = true;
                req.session.username = username.trim();
                req.session.role = admin.role;
                return res.status(200).json({
                    success: true,
                    message: 'First-time login detected. Please update credentials.',
                    redirect: '/admin-dashboard?first_login=true'
                });
            } else {
                return res.status(401).json({ success: false, message: 'Invalid credentials for first login.' });
            }
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (isMatch) {
            req.session.isAuthenticated = true;
            req.session.username = username.trim();
            req.session.role = admin.role;
            return res.status(200).json({
                success: true,
                message: 'Login successful.',
                redirect: '/admin-dashboard'
            });
        } else {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
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

// Forgot Password Endpoints
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

// Change password with security question
app.post('/api/change-password', async (req, res) => {
    const { username, securityAnswer, newPassword, confirmPassword } = req.body;

    if (!username || !securityAnswer || !newPassword || !confirmPassword) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    const trimmedUsername = username.trim();
    const trimmedAnswer = securityAnswer.trim().toUpperCase();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const query = 'SELECT security_answer FROM admins WHERE username = ?';
    db.query(query, [trimmedUsername], (err, results) => {
        if (err) {
            console.error('Error checking security answer:', err);
            return res.status(500).json({ success: false, message: 'Server error.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (results[0].security_answer !== trimmedAnswer) {
            return res.status(401).json({ success: false, message: 'Incorrect security answer.' });
        }

        const updateQuery = 'UPDATE admins SET password = ?, first_login = FALSE WHERE username = ?';
        db.query(updateQuery, [hashedPassword, trimmedUsername], (err, result) => {
            if (err) {
                console.error('Error updating password:', err);
                return res.status(500).json({ success: false, message: 'Database error.' });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'User not found.' });
            }

            res.status(200).json({
                success: true,
                message: 'Password updated successfully.',
                redirect: '/admin-login'
            });
        });
    });
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

// Create or update booking
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

    const query = 'INSERT INTO bookings (name, email, gender, date_of_birth, phone, address, message) VALUES (?, ?, ?, ?, ?, ?, ?)';
    db.query(query, [name, email || null, gender, date_of_birth, phone, address, message], (err, result) => {
        if (err) {
            console.error('Error inserting booking:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        res.status(200).json({ success: true, message: 'Booking submitted successfully!' });
    });
});

// Fetch all staff
app.get('/api/staff', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const query = 'SELECT id, name, email, phone, role FROM h_staff';
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
    const query = 'SELECT id, name, email, phone, role FROM h_staff WHERE id = ?';
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

    const query = 'INSERT INTO h_staff (name, email, phone, role) VALUES (?, ?, ?, ?)';
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

    const query = 'UPDATE h_staff SET name = ?, email = ?, phone = ?, role = ? WHERE id = ?';
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

// Delete staff
app.delete('/api/staff/:id', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const staffId = req.params.id;
    const query = 'DELETE FROM h_staff WHERE id = ?';
    db.query(query, [staffId], (err, result) => {
        if (err) {
            console.error('Error deleting staff:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Staff not found.' });
        }
        res.status(200).json({ success: true, message: 'Staff deleted successfully.' });
    });
});

// Fetch all students
app.get('/api/students', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const query = 'SELECT id, name, class_name, gender, level FROM h_students';
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
    const query = 'SELECT id, name, level, class_name, gender FROM h_students WHERE id = ?';
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

// Create or update student
app.post('/api/students', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const { name, level, class_name, gender } = req.body;
    if (!name || !level || !class_name || !gender) {
        return res.status(400).json({ success: false, message: 'Name, level, class, and gender are required.' });
    }

    const validLevels = ['Basic', 'Medium', 'High'];
    const validClasses = {
        Basic: ['Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Basic 6'],
        Medium: ['JSS 1', 'JSS 2', 'JSS 3'],
        High: ['SS 1', 'SS 2', 'SS 3']
    };
    const validGenders = ['Male', 'Female', 'Other'];

    if (!validLevels.includes(level) || !validClasses[level].includes(class_name) || !validGenders.includes(gender)) {
        return res.status(400).json({ success: false, message: 'Invalid level, class, or gender.' });
    }

    const query = 'INSERT INTO h_students (name, level, class_name, gender) VALUES (?, ?, ?, ?)';
    db.query(query, [name, level, class_name, gender], (err, result) => {
        if (err) {
            console.error('Error creating student:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        res.status(200).json({ success: true, message: 'Student created successfully.', id: result.insertId });
    });
});

app.put('/api/students/:id', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const studentId = req.params.id;
    const { name, level, class_name, gender } = req.body;
    if (!name || !level || !class_name || !gender) {
        return res.status(400).json({ success: false, message: 'Name, level, class, and gender are required.' });
    }

    const validLevels = ['Basic', 'Medium', 'High'];
    const validClasses = {
        Basic: ['Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Basic 6'],
        Medium: ['JSS 1', 'JSS 2', 'JSS 3'],
        High: ['SS 1', 'SS 2', 'SS 3']
    };
    const validGenders = ['Male', 'Female', 'Other'];

    if (!validLevels.includes(level) || !validClasses[level].includes(class_name) || !validGenders.includes(gender)) {
        return res.status(400).json({ success: false, message: 'Invalid level, class, or gender.' });
    }

    const query = 'UPDATE h_students SET name = ?, level = ?, class_name = ?, gender = ? WHERE id = ?';
    db.query(query, [name, level, class_name, gender, studentId], (err, result) => {
        if (err) {
            console.error('Error updating student:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Student not found.' });
        }
        res.status(200).json({ success: true, message: 'Student updated successfully.' });
    });
});

// Delete student
app.delete('/api/students/:id', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const studentId = req.params.id;
    const query = 'DELETE FROM h_students WHERE id = ?';
    db.query(query, [studentId], (err, result) => {
        if (err) {
            console.error('Error deleting student:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Student not found.' });
        }
        res.status(200).json({ success: true, message: 'Student deleted successfully.' });
    });
});

// Generate report sheet
app.post('/api/generate-report-sheet', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const { studentId, reportType, session, term } = req.body;
    if (!studentId || !reportType || !session) {
        return res.status(400).json({ success: false, message: 'Student ID, report type, and session are required.' });
    }

    if (reportType === 'terminal' && !term) {
        return res.status(400).json({ success: false, message: 'Term is required for terminal reports.' });
    }

    if (!['terminal', 'sessional'].includes(reportType)) {
        return res.status(400).json({ success: false, message: 'Invalid report type.' });
    }

    const validSessions = ['2023/2024', '2024/2025'];
    if (!validSessions.includes(session)) {
        return res.status(400).json({ success: false, message: 'Invalid session.' });
    }

    if (term && !['1st Term', '2nd Term', '3rd Term'].includes(term)) {
        return res.status(400).json({ success: false, message: 'Invalid term.' });
    }

    const query = 'SELECT name, level, class_name FROM h_students WHERE id = ?';
    db.query(query, [studentId], (err, results) => {
        if (err) {
            console.error('Error fetching student for report:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Student not found.' });
        }

        const reportData = {
            studentId,
            name: results[0].name,
            level: results[0].level,
            class_name: results[0].class_name,
            reportType,
            session,
            term: reportType === 'terminal' ? term : null,
        };

        res.status(200).json({ success: true, message: 'Report sheet generated successfully.', data: reportData });
    });
});

// Generate report sheets (bulk)
app.post('/api/generate-report-sheets', (req, res) => {
    if (!req.session.isAuthenticated || req.session.role !== 'SuperAdmin') {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const query = 'SELECT id, name, level, class_name FROM h_students';
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching students for bulk reports:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }

        const reports = results.map(student => ({
            studentId: student.id,
            name: student.name,
            level: student.level,
            class_name: student.class_name,
            reportType: 'sessional',
            session: '2024/2025',
        }));

        res.status(200).json({ success: true, message: 'Bulk report sheets generated successfully.', data: reports });
    });
});

// Schedule route
app.post('/api/schedule', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) {
        return res.status(400).json({ success: false, message: 'Start and end dates are required.' });
    }

    const query = 'INSERT INTO schedules (date, event) VALUES (?, ?)';
    db.query(query, [startDate, 'Term Start'], (err) => {
        if (err) {
            console.error('Error saving schedule:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        db.query(query, [endDate, 'Term End'], (err) => {
            if (err) {
                console.error('Error saving schedule:', err);
                return res.status(500).json({ success: false, message: 'Database error.' });
            }
            res.status(200).json({ success: true, message: 'Schedule saved successfully.' });
        });
    });
});

// Demographics route
app.get('/api/demographics', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const query = `
        SELECT
            class_name,
            SUM(CASE WHEN gender = 'Male' THEN 1 ELSE 0 END) AS male_count,
            SUM(CASE WHEN gender = 'Female' THEN 1 ELSE 0 END) AS female_count,
            COUNT(*) AS total_class_count
        FROM h_students
        GROUP BY class_name
        WITH ROLLUP;
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching demographics:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }

        const formattedData = results.map(row => {
            if (row.class_name === null) {
                return { class_name: 'Total', male_count: row.male_count, female_count: row.female_count, total_class_count: row.total_class_count };
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

    if (!['student', 'staff'].includes(entityType)) {
        return res.status(400).json({ success: false, message: 'Invalid entity type.' });
    }

    const table = entityType === 'student' ? 'h_students' : 'h_staff';
    const query = `SELECT id, name${entityType === 'student' ? ', level, class_name, gender' : ', email, phone, role'} FROM ${table} WHERE id = ?`;
    db.query(query, [entityId], (err, results) => {
        if (err) {
            console.error(`Error fetching ${entityType} for ID card:`, err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} not found.` });
        }

        res.status(200).json({ success: true, message: 'ID card generated successfully.', data: results[0] });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});