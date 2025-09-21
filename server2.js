const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcryptjs');
const session = require('express-session'); // Added for session management
const db = require('./mysql');
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
    secret: 'your-secret-key', // Replace with a strong, unique secret key
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Route to serve the index.html file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route to serve the admin_login.html file
app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin_login.html'));
});

// Protected route to serve the admin_dashboard.html file
app.get('/admin-dashboard', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.redirect('/admin-login');
    }
    res.sendFile(path.join(__dirname, 'public', 'admin_dashboard.html'));
});

// Route to handle form submission for bookings
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

    db.query(query, [name, email || null, gender, date_of_birth, phone, address, message], (err, result) => {
        if (err) {
            console.error('Error inserting data:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.status(200).json({ success: true, message: 'Booking submitted successfully!' });
    });
});

// Route to handle admin login
app.post('/api/admin-login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required.' });
    }

    const query = 'SELECT * FROM h_admins WHERE username = ?';
    db.query(query, [username], async (err, results) => {
        if (err) {
            console.error('Database error during login:', err);
            return res.status(500).json({ success: false, message: 'Server error.' });
        }

        if (results.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const admin = results[0];

        // First-time login for SuperAdmin
        if (admin.role === 'SuperAdmin' && admin.first_login) {
            if (password === 'admin' && username === 'Admin') {
                req.session.isAuthenticated = true;
                req.session.username = username;
                return res.status(200).json({
                    success: true,
                    message: 'First-time login successful.',
                    redirect: '/admin-dashboard?first_login=true'
                });
            } else {
                return res.status(401).json({ success: false, message: 'Invalid credentials.' });
            }
        }

        // Regular login using bcrypt
        const isMatch = await bcrypt.compare(password, admin.password);
        if (isMatch) {
            req.session.isAuthenticated = true;
            req.session.username = username;
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

// Route to handle password and username change after first login
app.post('/api/update-superadmin', async (req, res) => {
    const { username, newUsername, newPassword } = req.body;
    
    if (!username || !newUsername || !newPassword) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const query = 'UPDATE h_admins SET username = ?, password = ?, first_login = FALSE WHERE username = ? AND role = "SuperAdmin"';
    db.query(query, [newUsername, hashedPassword, username], (err, result) => {
        if (err) {
            console.error('Database error during update:', err);
            return res.status(500).json({ success: false, message: 'Server error.' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'SuperAdmin not found or could not be updated.' });
        }
        
        res.status(200).json({
            success: true,
            message: 'Username and password updated successfully.',
            redirect: '/admin-dashboard'
        });
    });
});

// Route to handle logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).json({ success: false, message: 'Logout failed.' });
        }
        res.redirect('/admin-login');
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});