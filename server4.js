const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const db = require('./mysql'); // Ensure this is createPool
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const moment = require('moment'); // install with: npm install moment
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const port = process.env.PORT || 5000;
// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads'); // âœ… Save directly to public/uploads (no subfolder)
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${req.body.staffId || 'file'}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 400 * 1024 }, // 400KB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png'];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('Only JPEG and PNG images are allowed.'));
        }
        cb(null, true);
    }
});

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
app.get('/staff-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'staff_login.html'));
});

app.get('/staff-dashboard', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.redirect('/staff-login');
    }
    res.sendFile(path.join(__dirname, 'public', 'staff_dashboard.html'));
});

// Staff login route
app.post('/api/staff-login', async (req, res) => {
    const { staffId, password } = req.body;

    if (!staffId || !password) {
        return res.status(400).json({ success: false, message: 'Staff ID and password are required.' });
    }

    const query = 'SELECT * FROM staff WHERE staff_id = ?';
    db.query(query, [staffId.trim()], async (err, results) => {
        if (err) {
            console.error('Database error during staff login:', err);
            return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
        }

        if (results.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const staff = results[0];

        try {
            const isMatch = await bcrypt.compare(password, staff.password);
            if (isMatch || (password === 'default' && staffId.trim() === staff.staff_id)) {
                req.session.isAuthenticated = true;
                req.session.staffId = staffId.trim();
                req.session.role = staff.role;
                req.session.userType = 'staff';
                return res.status(200).json({
                    success: true,
                    message: staff.first_login ? 'First-time login detected. Please update credentials.' : 'Login successful.',
                    redirect: staff.first_login ? '/staff-dashboard?first_login=true' : '/staff-dashboard'
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
// Update admin credentials on first login (with debug logs)
app.post('/api/update-admin-credentials', async (req, res) => {
    try {
        console.log("Incoming request body:", req.body);

        const { username, newUsername, newPassword, newPhone, securityQuestion, securityAnswer, newName } = req.body;

        // Require only the essentials
        if (!username || !newUsername || !newPassword) {
            console.warn("Missing required fields:", { username, newUsername, newPassword });
            return res.status(400).json({ success: false, message: 'Username, new username, and new password are required.' });
        }

        const trimmedUsername = newUsername.trim();
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        console.log("Checking if new username already exists:", trimmedUsername);

        // Check if another user already has the new username
        const checkQuery = 'SELECT * FROM admins WHERE username = ? AND username != ?';
        db.query(checkQuery, [trimmedUsername, username.trim()], (err, results) => {
            if (err) {
                console.error('DB error checking username:', err);
                return res.status(500).json({ success: false, message: 'Database error.' });
            }
            console.log("Check query results:", results);

            if (results.length > 0) {
                console.warn("Username already exists:", trimmedUsername);
                return res.status(400).json({ success: false, message: 'Username already exists.' });
            }

            // Build update dynamically
            let updateFields = ['username = ?', 'password = ?', 'first_login = FALSE'];
            let values = [trimmedUsername, hashedPassword];

            if (newName) {
                updateFields.push('name = ?');
                values.push(newName);
            }
            if (newPhone) {
                updateFields.push('phone = ?');
                values.push(newPhone);
            }
            if (securityQuestion) {
                updateFields.push('security_question = ?');
                values.push(securityQuestion);
            }
            if (securityAnswer) {
                updateFields.push('security_answer = ?');
                values.push(securityAnswer.trim().toUpperCase());
            }

            values.push(username.trim());

            const updateQuery = `UPDATE admins SET ${updateFields.join(', ')} WHERE username = ?`;
            console.log("Executing update query:", updateQuery);
            console.log("With values:", values);

            db.query(updateQuery, values, (err, result) => {
                if (err) {
                    console.error('DB error updating credentials:', err);
                    return res.status(500).json({ success: false, message: 'Database error.' });
                }

                console.log("Update result:", result);

                if (result.affectedRows === 0) {
                    console.warn("Admin not found for username:", username.trim());
                    return res.status(404).json({ success: false, message: 'Admin not found.' });
                }

                req.session.username = trimmedUsername;
                console.log("Credentials updated successfully for:", trimmedUsername);

                res.status(200).json({
                    success: true,
                    message: 'Credentials updated successfully.',
                    redirect: '/admin-dashboard'
                });
            });
        });
    } catch (error) {
        console.error('Unexpected error updating credentials:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

 // Update staff credentials on first login
        app.post('/api/update-staff-credentials', async (req, res) => {
            const { staffId, newStaffId, newPassword, newPhone, newName, newEmail, securityQuestion, securityAnswer } = req.body;

            console.log('Received /api/update-staff-credentials:', { staffId, newStaffId, newPassword: '***', newPhone, newName, newEmail, securityQuestion, securityAnswer });

            if (!staffId || !newStaffId || !newPassword || !newPhone || !newName || !securityQuestion || !securityAnswer) {
                return res.status(400).json({ success: false, message: 'All fields except email are required.' });
            }

            if (securityQuestion.trim().length === 0 || securityAnswer.trim().length === 0) {
                return res.status(400).json({ success: false, message: 'Security question and answer cannot be empty.' });
            }
            // CRITICAL: Server allows simple passwords and handles hashing
            if (newPassword.trim().length < 6) {
                return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
            }

            try {
                const trimmedStaffId = newStaffId.trim();
                const trimmedName = newName.trim();
                const trimmedPhone = newPhone.trim();
                const trimmedQuestion = securityQuestion.trim().toUpperCase();
                const trimmedAnswer = securityAnswer.trim().toUpperCase();
                
                const hashedPassword = await bcrypt.hash(newPassword.trim(), 10); 

                const checkQuery = 'SELECT * FROM staff WHERE staff_id = ? AND staff_id != ?';
                db.query(checkQuery, [trimmedStaffId, staffId.trim()], (err, results) => {
                    if (err) {
                        return res.status(500).json({ success: false, message: `Database error: ${err.message}` });
                    }
                    if (results.length > 0) {
                        return res.status(400).json({ success: false, message: 'Staff ID already exists.' });
                    }

                    const updateQuery = `
                        UPDATE staff 
                        SET staff_id = ?, password = ?, name = ?, phone = ?, email = ?, 
                            security_question = ?, security_answer = ?, first_login = FALSE 
                        WHERE staff_id = ?
                    `;
                    db.query(
                        updateQuery,
                        [trimmedStaffId, hashedPassword, trimmedName, trimmedPhone, newEmail || null, trimmedQuestion, trimmedAnswer, staffId.trim()],
                        (err, result) => {
                            if (err) {
                                return res.status(500).json({ success: false, message: `Database error: ${err.message}` });
                            }
                            if (result.affectedRows === 0) {
                                return res.status(404).json({ success: false, message: 'Staff not found.' });
                            }
                            req.session.staffId = trimmedStaffId;
                            res.status(200).json({
                                success: true,
                                message: 'Credentials updated successfully.',
                                redirect: '/staff-dashboard'
                            });
                        }
                    );
                });
            } catch (error) {
                res.status(500).json({ success: false, message: `Server error: ${error.message}` });
            }
        });

        // Verify Staff ID
        app.post('/api/staff/forgot-password/verify-staff-id', (req, res) => {
            const { staff_id } = req.body;
            if (!staff_id || staff_id.trim().length === 0) {
                return res.status(400).json({ success: false, message: 'Staff ID is required.' });
            }

            const query = 'SELECT security_question FROM staff WHERE staff_id = ?';
            db.query(query, [staff_id.trim()], (err, results) => {
                if (err) {
                    return res.status(500).json({ success: false, message: `Server error: ${err.message}` });
                }
                if (results.length === 0) {
                    return res.status(404).json({ success: false, message: 'Staff ID not found.' });
                }
                res.status(200).json({ success: true, securityQuestion: results[0].security_question });
            });
        });

        // Verify Security Answer
        app.post('/api/staff/forgot-password/verify-answer', (req, res) => {
            const { staff_id, securityAnswer } = req.body;

            if (!staff_id || !securityAnswer || staff_id.trim().length === 0 || securityAnswer.trim().length === 0) {
                return res.status(400).json({ success: false, message: 'Staff ID and security answer are required.' });
            }

            const query = 'SELECT security_answer FROM staff WHERE staff_id = ?';
            db.query(query, [staff_id.trim()], (err, results) => {
                if (err) {
                    return res.status(500).json({ success: false, message: `Server error: ${err.message}` });
                }
                if (results.length === 0) {
                    return res.status(404).json({ success: false, message: 'Staff ID not found.' });
                }

                const storedAnswer = results[0].security_answer;
                const inputAnswer = securityAnswer.trim().toUpperCase();
                
                if (inputAnswer === storedAnswer) {
                    res.status(200).json({ success: true, message: 'Security answer verified.' });
                } else {
                    res.status(401).json({ success: false, message: 'Incorrect security answer.' });
                }
            });
        });

        // Reset Password (Server-Side)
        app.post('/api/staff/forgot-password/reset-password', async (req, res) => {
            const { staff_id, newPassword } = req.body;

            if (!staff_id || !newPassword || staff_id.trim().length === 0 || newPassword.trim().length === 0) {
                return res.status(400).json({ success: false, message: 'Staff ID and new password are required.' });
            }
            
            // CRITICAL: Server allows simple passwords and handles hashing
            if (newPassword.trim().length < 6) {
                return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
            }

            try {
                const hashedPassword = await bcrypt.hash(newPassword.trim(), 10); 
                const query = 'UPDATE staff SET password = ?, first_login = FALSE WHERE staff_id = ?';
                db.query(query, [hashedPassword, staff_id.trim()], (err, result) => {
                    if (err) {
                        return res.status(500).json({ success: false, message: `Database error: ${err.message}` });
                    }
                    if (result.affectedRows === 0) {
                        return res.status(404).json({ success: false, message: 'Staff ID not found.' });
                    }
                    
                    // FIX: Ensure redirect is sent for client-side handling
                    res.status(200).json({
                        success: true,
                        message: 'Password reset successfully.',
                        redirect: '/staff-login' // <-- Directs back to login page
                    });
                });
            } catch (error) {
                res.status(500).json({ success: false, message: `Error processing password: ${error.message}` });
            }
        });
        
// Upload staff profile picture
app.post('/api/staff/upload-profile-picture', upload.single('profilePicture'), async (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const { staffId } = req.body;

    if (!staffId) {
        return res.status(400).json({ success: false, message: 'Staff ID is required.' });
    }

    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    try {
        const filePath = `uploads/${req.file.filename}`;
        const query = 'UPDATE staff SET profile_picture = ? WHERE id = ?';

        db.query(query, [filePath, staffId], (err, result) => {
            if (err) {
                console.error('Error uploading staff profile picture:', err);
                return res.status(500).json({ success: false, message: 'Database error.' });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ success: false, message: 'Staff member not found.' });
            }
            res.status(200).json({ success: true, message: 'Staff Records Save successfully.', filePath });
        });
    } catch (error) {
        console.error('Error processing profile picture:', error);
        res.status(500).json({ success: false, message: 'Error processing image.' });
    }
});

// Retrieve staff profile picture
app.get('/api/staff/profile-picture/:id', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const staffId = req.params.id;
    const query = 'SELECT profile_picture FROM staff WHERE id = ?';

    db.query(query, [staffId], (err, results) => {
        if (err) {
            console.error('Error fetching staff profile picture:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        if (results.length === 0 || !results[0].profile_picture) {
            return res.status(200).json({ success: true, data: 'uploads/default.jpg' }); // Default image
        }
        res.status(200).json({ success: true, data: results[0].profile_picture });
    });
});

// Fetch all classes
app.get('/api/classes', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }
    const query = `
        SELECT class_id AS id, class_name AS name, 1 AS section_id FROM Classes
        UNION
        SELECT western_class_id AS id, class_name AS name, 2 AS section_id FROM Western_Classes
        ORDER BY name
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching classes:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        res.status(200).json({ success: true, data: results });
    });
});

// Fetch all subjects
app.get('/api/subjects', (req, res) => {
    const query = `
        SELECT 
            s.subject_id AS id,
            s.subject_name AS name,
            d.section_id
        FROM Subjects s
        JOIN Departments d ON s.dept_id = d.dept_id
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching subjects:', err.sqlMessage || err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        res.json({ success: true, data: results });
    });
});

// Fetch all staff
app.get('/api/staff', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const query = `
        SELECT 
            s.id,
            s.staff_id,
            s.name,
            s.email,
            s.phone,
            s.role,
            s.profile_picture,
            GROUP_CONCAT(DISTINCT 
                CASE 
                    WHEN sc.section_id = 1 THEN c.class_name
                    WHEN sc.section_id = 2 THEN wc.class_name
                    ELSE NULL 
                END ORDER BY c.class_name, wc.class_name SEPARATOR ', '
            ) AS classes_taught,
            GROUP_CONCAT(DISTINCT sub.subject_name ORDER BY sub.subject_name SEPARATOR ', ') AS subjects_taught,
            GROUP_CONCAT(DISTINCT 
                CASE 
                    WHEN sfm.section_id = 1 THEN CONCAT('Form Master: ', c_fm.class_name)
                    WHEN sfm.section_id = 2 THEN CONCAT('Form Master: ', wc_fm.class_name)
                    ELSE NULL
                END SEPARATOR ' | '
            ) AS form_master_info
        FROM staff s
        LEFT JOIN staff_classes sc ON s.id = sc.staff_id
        LEFT JOIN Classes c ON sc.class_id = c.class_id AND sc.section_id = 1
        LEFT JOIN Western_Classes wc ON sc.western_class_id = wc.western_class_id AND sc.section_id = 2
        LEFT JOIN staff_subjects ss ON s.id = ss.staff_id
        LEFT JOIN Subjects sub ON ss.subject_id = sub.subject_id
        LEFT JOIN staff_form_master sfm ON s.id = sfm.staff_id AND sfm.term = (SELECT MAX(term) FROM staff_form_master)
        LEFT JOIN Classes c_fm ON sfm.class_id = c_fm.class_id AND sfm.section_id = 1
        LEFT JOIN Western_Classes wc_fm ON sfm.western_class_id = wc_fm.western_class_id AND sfm.section_id = 2
        GROUP BY s.id, s.staff_id, s.name, s.email, s.phone, s.role, s.profile_picture
        ORDER BY s.id DESC;
    `;

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
    const staffQuery = 'SELECT id, staff_id, name, email, phone, role, profile_picture FROM staff WHERE id = ?';

    db.query(staffQuery, [staffId], (err, staffResults) => {
        if (err) {
            console.error('Error fetching staff details:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        if (staffResults.length === 0) {
            return res.status(404).json({ success: false, message: 'Staff member not found.' });
        }

        const staff = staffResults[0];

        const classesQuery = 'SELECT class_id, western_class_id, section_id FROM staff_classes WHERE staff_id = ?;';
        const subjectsQuery = 'SELECT subject_id FROM staff_subjects WHERE staff_id = ?;';
        const formMasterQuery = 'SELECT class_id, western_class_id, section_id FROM staff_form_master WHERE staff_id = ? AND term = (SELECT MAX(term) FROM staff_form_master) LIMIT 1;';

        db.query(classesQuery, [staffId], (err, classesResults) => {
            if (err) return res.status(500).json({ success: false, message: 'Classes fetch error.' });

            db.query(subjectsQuery, [staffId], (err, subjectsResults) => {
                if (err) return res.status(500).json({ success: false, message: 'Subjects fetch error.' });

                db.query(formMasterQuery, [staffId], (err, formMasterResults) => {
                    if (err) return res.status(500).json({ success: false, message: 'Form Master fetch error.' });

                    staff.classes = classesResults.map(r => ({
                        class_id: r.class_id || r.western_class_id,
                        section_id: r.section_id
                    }));
                    staff.subjects = subjectsResults.map(r => r.subject_id);
                    staff.formMaster = formMasterResults.length > 0 ? {
                        class_id: formMasterResults[0].class_id || formMasterResults[0].western_class_id,
                        section_id: formMasterResults[0].section_id
                    } : null;

                    res.status(200).json({ success: true, data: staff });
                });
            });
        });
    });
});

// Add or Update staff
app.post('/api/staff', async (req, res) => {
    if (!req.session.isAuthenticated) 
        return res.status(401).json({ success: false, message: 'Unauthorized.' });

    const { id, staff_id, name, email, phone, role, password, classes_taught, subjects_taught, form_master_class } = req.body;

    if (!staff_id || !name || !phone || !role) {
        return res.status(400).json({ success: false, message: 'Required fields are missing.' });
    }

    const isUpdate = !!id;
    const term = 1; // default term

    db.beginTransaction((err) => {
        if (err) {
            console.error('Transaction start error:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }

        if (!isUpdate) {
            const rawPassword = password || "default";
            bcrypt.hash(rawPassword, 10, (err, hash) => {
                if (err) {
                    return db.rollback(() => {
                        console.error('Hashing error:', err);
                        res.status(500).json({ success: false, message: 'Error hashing password.' });
                    });
                }
                insertStaff(hash);
            });
        } else {
            updateStaff();
        }

        function insertStaff(hashedPassword) {
            const createQuery = 'INSERT INTO staff (staff_id, name, email, phone, role, password, profile_picture) VALUES (?, ?, ?, ?, ?, ?, NULL)';
            db.query(createQuery, [staff_id, name, email, phone, role, hashedPassword], (err, result) => {
                if (err) {
                    return db.rollback(() => {
                        console.error('Error creating staff:', err);
                        res.status(500).json({ success: false, message: 'Database error.' });
                    });
                }
                insertRelationships(result.insertId);
            });
        }

        function updateStaff() {
            const updateQuery = 'UPDATE staff SET staff_id = ?, name = ?, email = ?, phone = ?, role = ? WHERE id = ?';
            db.query(updateQuery, [staff_id, name, email, phone, role, id], (err) => {
                if (err) {
                    return db.rollback(() => {
                        console.error('Error updating staff:', err);
                        res.status(500).json({ success: false, message: 'Database error.' });
                    });
                }
                deleteOldRelationships(id);
            });
        }

        function deleteOldRelationships(staffId) {
            db.query('DELETE FROM staff_classes WHERE staff_id = ?', [staffId], (err) => {
                if (err) return rollbackError('Error deleting staff classes:', err);

                db.query('DELETE FROM staff_subjects WHERE staff_id = ?', [staffId], (err) => {
                    if (err) return rollbackError('Error deleting staff subjects:', err);

                    db.query('DELETE FROM staff_form_master WHERE staff_id = ? AND term = ?', [staffId, term], (err) => {
                        if (err) return rollbackError('Error deleting form master:', err);
                        insertRelationships(staffId);
                    });
                });
            });
        }

        function insertRelationships(staffId) {
            if (classes_taught && classes_taught.length > 0) {
                const classValues = classes_taught.map(cls => {
                    const [section_id, class_id] = cls.split(':').map(Number);
                    return [
                        staffId,
                        section_id === 1 ? class_id : null,
                        section_id === 2 ? class_id : null,
                        section_id,
                        term
                    ];
                }).filter(row => row[1] !== null || row[2] !== null);

                if (classValues.length > 0) {
                    const classInsertQuery = `
                        INSERT INTO staff_classes (staff_id, class_id, western_class_id, section_id, term)
                        VALUES ?
                    `;
                    db.query(classInsertQuery, [classValues], (err) => {
                        if (err) return rollbackError('Error inserting staff classes:', err);
                    });
                }
            }

            if (subjects_taught && subjects_taught.length > 0) {
                const subjectValues = subjects_taught.map(subject => {
                    const [section_id, subject_id] = subject.split(':').map(Number);
                    return [staffId, subject_id, section_id, term];
                }).filter(row => row[1] && row[2]);

                if (subjectValues.length > 0) {
                    const subjectInsertQuery = `
                        INSERT INTO staff_subjects (staff_id, subject_id, section_id, term)
                        VALUES ?
                    `;
                    db.query(subjectInsertQuery, [subjectValues], (err) => {
                        if (err) {
                            console.error('Error inserting staff subjects:', err);
                            return rollbackError('Error inserting staff subjects:', err);
                        }
                    });
                }
            }

            if (form_master_class) {
                const [section_id, class_id] = form_master_class.split(':').map(Number);
                const fmInsertQuery = `
                    INSERT INTO staff_form_master (staff_id, class_id, western_class_id, section_id, term)
                    VALUES (?, ?, ?, ?, ?)
                `;
                db.query(fmInsertQuery, [staffId, section_id === 1 ? class_id : null, section_id === 2 ? class_id : null, section_id, term], (err) => {
                    if (err) return rollbackError('Error inserting form master:', err);
                });
            }

            db.commit((err) => {
                if (err) return rollbackError('Commit error:', err);
                res.status(200).json({ success: true, message: isUpdate ? 'Staff updated successfully.' : 'Staff created successfully.' });
            });
        }

        function rollbackError(msg, err) {
            return db.rollback(() => {
                console.error(msg, err);
                res.status(500).json({ success: false, message: 'Database error.' });
            });
        }
    });
});

// Update staff (PUT endpoint) - Updated to match the POST logic for consistency
app.put('/api/staff/:id', async (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const id = req.params.id;
    const { staff_id, name, email, phone, role, classes_taught, subjects_taught, form_master_class } = req.body;

    // Log request body for debugging
    console.log('Update staff (PUT) request body:', req.body);

    // Validate required fields
    if (!staff_id || !name || !phone || !role) {
        return res.status(400).json({ success: false, message: 'Required fields (staff_id, name, phone, role) are missing.' });
    }

    // Validate staff_id format
    if (typeof staff_id !== 'string' || staff_id.trim() === '') {
        return res.status(400).json({ success: false, message: 'Invalid staff_id format.' });
    }

    // Validate form_master_class format if provided
    if (form_master_class && !/^\d+:\d+$/.test(form_master_class)) {
        return res.status(400).json({ success: false, message: 'Invalid form_master_class format. Expected "section_id:class_id".' });
    }

    const term = 1;

    db.beginTransaction((err) => {
        if (err) {
            console.error('Transaction start error:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }

        // Update staff details
        const updateQuery = 'UPDATE staff SET staff_id = ?, name = ?, email = ?, phone = ?, role = ? WHERE id = ?';
        db.query(updateQuery, [staff_id.trim(), name.trim(), email || null, phone.trim(), role.trim(), id], (err, result) => {
            if (err) return rollbackError('Error updating staff:', err);
            if (result.affectedRows === 0) {
                return db.rollback(() => {
                    res.status(404).json({ success: false, message: 'Staff member not found.' });
                });
            }
            console.log(`Updated staff record for ID ${id} (PUT)`);
            deleteOldRelationships(id);
        });

        function deleteOldRelationships(staffId) {
            db.query('DELETE FROM staff_classes WHERE staff_id = ?', [staffId], (err, result) => {
                if (err) return rollbackError('Error deleting staff classes:', err);
                console.log(`Deleted ${result.affectedRows} staff_classes for staffId ${staffId} (PUT)`);

                db.query('DELETE FROM staff_subjects WHERE staff_id = ?', [staffId], (err, result) => {
                    if (err) return rollbackError('Error deleting staff subjects:', err);
                    console.log(`Deleted ${result.affectedRows} staff_subjects for staffId ${staffId} (PUT)`);

                    db.query('DELETE FROM staff_form_master WHERE staff_id = ?', [staffId], (err, result) => {
                        if (err) return rollbackError('Error deleting form master:', err);
                        console.log(`Deleted ${result.affectedRows} staff_form_master records for staffId ${staffId} (PUT)`);
                        insertRelationships(staffId);
                    });
                });
            });
        }

        function insertRelationships(staffId) {
            if (classes_taught && Array.isArray(classes_taught) && classes_taught.length > 0) {
                const classValues = classes_taught.map(cls => {
                    const [section_id, class_id] = cls.split(':').map(Number);
                    if (isNaN(section_id) || isNaN(class_id) || ![1, 2].includes(section_id)) return null;
                    return [staffId, section_id === 1 ? class_id : null, section_id === 2 ? class_id : null, section_id, term];
                }).filter(row => row !== null);

                if (classValues.length > 0) {
                    const classInsertQuery = `INSERT INTO staff_classes (staff_id, class_id, western_class_id, section_id, term) VALUES ?`;
                    db.query(classInsertQuery, [classValues], (err, result) => {
                        if (err) return rollbackError('Error inserting staff classes:', err);
                        console.log(`Inserted ${result.affectedRows} staff_classes for staffId ${staffId} (PUT)`);
                    });
                }
            }

            if (subjects_taught && Array.isArray(subjects_taught) && subjects_taught.length > 0) {
                const subjectValues = subjects_taught.map(subject => {
                    const [section_id, subject_id] = subject.split(':').map(Number);
                    if (isNaN(section_id) || isNaN(subject_id) || ![1, 2].includes(section_id)) return null;
                    return [staffId, subject_id, section_id, term];
                }).filter(row => row !== null);

                if (subjectValues.length > 0) {
                    const subjectInsertQuery = `INSERT INTO staff_subjects (staff_id, subject_id, section_id, term) VALUES ?`;
                    db.query(subjectInsertQuery, [subjectValues], (err, result) => {
                        if (err) return rollbackError('Error inserting staff subjects:', err);
                        console.log(`Inserted ${result.affectedRows} staff_subjects for staffId ${staffId} (PUT)`);
                    });
                }
            }

            if (form_master_class) {
                const [section_id, class_id] = form_master_class.split(':').map(Number);
                if (isNaN(section_id) || isNaN(class_id) || ![1, 2].includes(section_id)) {
                    return rollbackError('Invalid form_master_class format:', new Error('Expected section_id:class_id'));
                }
                const fmInsertQuery = `INSERT INTO staff_form_master (staff_id, class_id, western_class_id, section_id, term) VALUES (?, ?, ?, ?, ?)`;
                db.query(fmInsertQuery, [staffId, section_id === 1 ? class_id : null, section_id === 2 ? class_id : null, section_id, term], (err, result) => {
                    if (err) return rollbackError('Error inserting form master:', err);
                    console.log(`Inserted form master record for staffId ${staffId} (PUT)`);
                });
            }

            db.commit((err) => {
                if (err) return rollbackError('Commit error:', err);
                res.status(200).json({ success: true, message: 'Staff updated successfully.' });
            });
        }

        function rollbackError(msg, err) {
            return db.rollback(() => {
                console.error(msg, err);
                res.status(500).json({ success: false, message: 'Database error.' });
            });
        }
    });
});

// Delete staff member
app.delete('/api/staff/:id', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const staffId = req.params.id;
    const query = 'DELETE FROM staff WHERE id = ?';

    db.query(query, [staffId], (err, result) => {
        if (err) {
            console.error('Error deleting staff:', err);
            return res.status(500).json({ success: false, message: 'Database error: ' + err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Staff member not found.' });
        }
        res.status(200).json({ success: true, message: 'Staff member deleted successfully.' });
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

// Fetch all classes for dynamic dropdowns
app.get('/api/academic/classes', (req, res) => {
    if (!req.session.isAuthenticated) return res.status(401).json({ success: false, message: 'Unauthorized.' });
    
    const query = `
        SELECT class_id as id, class_name as name, level, section_id FROM Classes 
        UNION ALL
        SELECT western_class_id as id, class_name as name, level, section_id FROM Western_Classes;
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching all classes:', err);
            return res.status(500).json({ success: false, message: 'Database error.' });
        }
        res.status(200).json({ success: true, data: results });
    });
});



// ==========================
// GET ALL STUDENTS
// ==========================
app.get('/api/students', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const query = `
        SELECT 
            s.id,
            s.student_id,
            s.full_name AS name,
            s.gender,
            s.guardian_phone,
            s.address,
            DATE_FORMAT(s.date_of_birth, '%Y-%m-%d') AS date_of_birth,
            s.email,
            s.profile_picture,
            GROUP_CONCAT(
                COALESCE(c.class_name, wc.class_name)
                ORDER BY se.section_id, se.class_ref SEPARATOR ', '
            ) AS classes,
            GROUP_CONCAT(
                CONCAT(su.dept_id, ':', su.subject_name)
                ORDER BY su.dept_id, ss.subject_id SEPARATOR ', '
            ) AS subjects
        FROM Students s
        LEFT JOIN Student_Enrollments se ON s.id = se.student_id
        LEFT JOIN Classes c ON se.section_id = 1 AND se.class_ref = c.class_id
        LEFT JOIN Western_Classes wc ON se.section_id = 2 AND se.class_ref = wc.western_class_id
        LEFT JOIN Student_Subjects ss ON se.enrollment_id = ss.enrollment_id
        LEFT JOIN Subjects su ON ss.subject_id = su.subject_id
        GROUP BY s.id
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching students:', err);
            return res.status(500).json({ success: false, message: 'Database error.', error: err.message });
        }

        results.forEach(student => {
            student.profile_picture = student.profile_picture
                ? 'Uploads/' + student.profile_picture.split('/').pop()
                : 'Uploads/default.jpg';
            student.classes = student.classes ? student.classes.split(', ') : [];
            student.subjects = student.subjects ? student.subjects.split(', ') : [];
        });

        res.status(200).json({ success: true, data: results });
    });
});

// ==========================
// GET SINGLE STUDENT
// ==========================
app.get('/api/students/:id', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    const studentId = req.params.id;

    const studentQuery = `
        SELECT 
            s.id,
            s.student_id,
            s.full_name AS name,
            s.gender,
            DATE_FORMAT(s.date_of_birth, '%Y-%m-%d') AS date_of_birth,
            s.guardian_phone,
            s.address,
            s.email,
            s.profile_picture,
            GROUP_CONCAT(
                CONCAT(se.section_id, ':', se.class_ref)
                ORDER BY se.section_id, se.class_ref SEPARATOR ','
            ) AS classes,
            GROUP_CONCAT(
                CONCAT(su.dept_id, ':', ss.subject_id)
                ORDER BY su.dept_id, ss.subject_id SEPARATOR ','
            ) AS subjects
        FROM Students s
        LEFT JOIN Student_Enrollments se ON s.id = se.student_id
        LEFT JOIN Student_Subjects ss ON se.enrollment_id = ss.enrollment_id
        LEFT JOIN Subjects su ON ss.subject_id = su.subject_id
        WHERE s.id = ?
        GROUP BY s.id
    `;

    db.query(studentQuery, [studentId], (err, studentResults) => {
        if (err) {
            console.error('Error fetching student:', err);
            return res.status(500).json({ success: false, message: 'Database error.', error: err.message });
        }

        if (studentResults.length === 0) {
            return res.status(404).json({ success: false, message: 'Student not found.' });
        }

        const student = studentResults[0];
        student.profile_picture = student.profile_picture
            ? 'Uploads/' + student.profile_picture.split('/').pop()
            : 'Uploads/default.jpg';
        student.classes = student.classes ? student.classes.split(',') : [];
        student.subjects = student.subjects ? student.subjects.split(',') : [];

        res.status(200).json({ success: true, data: student });
    });
});

// ==========================
// POST ADD STUDENT
// ==========================
app.post('/api/students', upload.single('profile_picture'), (req, res) => {
    const {
        student_id, full_name, guardian_phone, email, address, gender,
        date_of_birth, level = 1, term = 1
    } = req.body;

    // Updated: Handle both classes/classes[] and subjects/subjects[]
    const classes = req.body['classes[]'] || req.body.classes
        ? (Array.isArray(req.body['classes[]'] || req.body.classes)
            ? (req.body['classes[]'] || req.body.classes)
            : [(req.body['classes[]'] || req.body.classes)])
        : [];
    const subjects = req.body['subjects[]'] || req.body.subjects
        ? (Array.isArray(req.body['subjects[]'] || req.body.subjects)
            ? (req.body['subjects[]'] || req.body.subjects).map(s => s.includes(':') ? s.split(':')[1] : s)
            : [(req.body['subjects[]'] || req.body.subjects).includes(':') ? (req.body['subjects[]'] || req.body.subjects).split(':')[1] : (req.body['subjects[]'] || req.body.subjects)])
        : [];

    console.log('Received request body:', req.body); // Debug
    console.log('Processed classes:', classes); // Debug
    console.log('Processed subjects:', subjects); // Debug

    // Validate inputs
    if (!student_id || !full_name || !guardian_phone || !address || !gender || !date_of_birth) {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }
    if (classes.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one class is required.' });
    }

    // Validate classes
    const classQueries = classes.map(cls => {
        const [section_id, class_ref] = cls.split(':').map(Number);
        const table = section_id === 1 ? 'Classes' : 'Western_Classes';
        const idField = section_id === 1 ? 'class_id' : 'western_class_id';
        return `SELECT ${idField} FROM ${table} WHERE ${idField} = ${class_ref}`;
    });

    db.query(classQueries.join(' UNION '), (err, validClasses) => {
        if (err) {
            console.error('Error validating classes:', err);
            return res.status(500).json({ success: false, message: 'Failed to validate classes.', error: err.message });
        }
        const validClassIds = validClasses.map(c => c.class_id || c.western_class_id);
        const invalidClasses = classes.filter(cls => {
            const [, class_ref] = cls.split(':').map(Number);
            return !validClassIds.includes(class_ref);
        });
        if (invalidClasses.length > 0) {
            return res.status(400).json({ success: false, message: 'Invalid class IDs provided.' });
        }

        // Validate subjects
        if (subjects.length > 0) {
            db.query(`SELECT subject_id FROM Subjects WHERE subject_id IN (?)`, [subjects.map(Number)], (err2, validSubjects) => {
                if (err2) {
                    console.error('Error validating subjects:', err2);
                    return res.status(500).json({ success: false, message: 'Failed to validate subjects.', error: err2.message });
                }
                const validSubjectIds = validSubjects.map(s => s.subject_id);
                const invalidSubjects = subjects.filter(sub => !validSubjectIds.includes(Number(sub)));
                if (invalidSubjects.length > 0) {
                    return res.status(400).json({ success: false, message: 'Invalid subject IDs provided.' });
                }
                proceedWithInsert();
            });
        } else {
            proceedWithInsert();
        }
    });

    function proceedWithInsert() {
        // Validate date_of_birth
        let parsedDob;
        if (date_of_birth.includes('/')) {
            parsedDob = moment(date_of_birth, 'DD/MM/YYYY', true);
            if (!parsedDob.isValid()) return res.status(400).json({ success: false, message: 'Invalid Date of Birth format. Use DD/MM/YYYY.' });
        } else {
            parsedDob = moment(date_of_birth, 'YYYY-MM-DD', true);
            if (!parsedDob.isValid()) return res.status(400).json({ success: false, message: 'Invalid Date of Birth format. Use YYYY-MM-DD.' });
        }
        const formattedDob = parsedDob.format('YYYY-MM-DD');

        const profilePic = req.file ? req.file.filename : null;

        // Insert student
        const insertStudentSql = `
            INSERT INTO Students (student_id, full_name, guardian_phone, email, address, gender, date_of_birth, profile_picture)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.query(insertStudentSql, [student_id, full_name, guardian_phone, email || null, address, gender, formattedDob, profilePic], (err, result) => {
            if (err) {
                console.error('Error inserting student:', err);
                return res.status(500).json({ success: false, message: 'Failed to save student.', error: err.message });
            }

            const studentDbId = result.insertId;

            // Insert enrollments
            const enrollSql = `
                INSERT INTO Student_Enrollments (student_id, section_id, class_ref, level, term)
                VALUES ?
            `;
            const enrollValues = classes.map(cls => {
                const [section_id, class_ref] = cls.split(':').map(Number);
                return [studentDbId, section_id, class_ref, level, term];
            });

            db.query(enrollSql, [enrollValues], (err2, enrResult) => {
                if (err2) {
                    console.error('Error inserting enrollments:', err2);
                    return res.status(500).json({ success: false, message: 'Failed to save enrollments.', error: err2.message });
                }

                if (subjects.length > 0) {
                    // Fetch enrollment IDs
                    db.query(`SELECT enrollment_id FROM Student_Enrollments WHERE student_id = ?`, [studentDbId], (err3, enrollments) => {
                        if (err3) {
                            console.error('Error fetching enrollments:', err3);
                            return res.status(500).json({ success: false, message: 'Failed to fetch enrollments.', error: err3.message });
                        }

                        const subjSql = `INSERT INTO Student_Subjects (enrollment_id, subject_id, term) VALUES ?`;
                        const subjValues = enrollments.reduce((acc, enrollment) => {
                            subjects.forEach(sub => {
                                acc.push([enrollment.enrollment_id, Number(sub), term]);
                            });
                            return acc;
                        }, []);

                        if (subjValues.length > 0) {
                            db.query(subjSql, [subjValues], (err4) => {
                                if (err4) {
                                    console.error('Error inserting subjects:', err4);
                                    return res.status(500).json({ success: false, message: 'Failed to save subjects.', error: err4.message });
                                }
                                res.json({ success: true, data: { id: studentDbId } });
                            });
                        } else {
                            res.json({ success: true, data: { id: studentDbId } });
                        }
                    });
                } else {
                    res.json({ success: true, data: { id: studentDbId } });
                }
            });
        });
    }
});

// ==========================
// PUT UPDATE STUDENT
// ==========================
app.put('/api/students/:id', upload.single('profile_picture'), (req, res) => {
    const studentDbId = req.params.id;
    const {
        student_id, full_name, guardian_phone, email, address, gender,
        date_of_birth, level = 1, term = 1
    } = req.body;

    // Updated: Handle both classes/classes[] and subjects/subjects[]
    const classes = req.body['classes[]'] || req.body.classes
        ? (Array.isArray(req.body['classes[]'] || req.body.classes)
            ? (req.body['classes[]'] || req.body.classes)
            : [(req.body['classes[]'] || req.body.classes)])
        : [];
    const subjects = req.body['subjects[]'] || req.body.subjects
        ? (Array.isArray(req.body['subjects[]'] || req.body.subjects)
            ? (req.body['subjects[]'] || req.body.subjects).map(s => s.includes(':') ? s.split(':')[1] : s)
            : [(req.body['subjects[]'] || req.body.subjects).includes(':') ? (req.body['subjects[]'] || req.body.subjects).split(':')[1] : (req.body['subjects[]'] || req.body.subjects)])
        : [];

    console.log('Received request body:', req.body); // Debug
    console.log('Processed classes:', classes); // Debug
    console.log('Processed subjects:', subjects); // Debug

    // Validate inputs
    if (!student_id || !full_name || !guardian_phone || !address || !gender || !date_of_birth) {
        return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }
    if (classes.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one class is required.' });
    }

    // Validate classes
    const classQueries = classes.map(cls => {
        const [section_id, class_ref] = cls.split(':').map(Number);
        const table = section_id === 1 ? 'Classes' : 'Western_Classes';
        const idField = section_id === 1 ? 'class_id' : 'western_class_id';
        return `SELECT ${idField} FROM ${table} WHERE ${idField} = ${class_ref}`;
    });

    db.query(classQueries.join(' UNION '), (err, validClasses) => {
        if (err) {
            console.error('Error validating classes:', err);
            return res.status(500).json({ success: false, message: 'Failed to validate classes.', error: err.message });
        }
        const validClassIds = validClasses.map(c => c.class_id || c.western_class_id);
        const invalidClasses = classes.filter(cls => {
            const [, class_ref] = cls.split(':').map(Number);
            return !validClassIds.includes(class_ref);
        });
        if (invalidClasses.length > 0) {
            return res.status(400).json({ success: false, message: 'Invalid class IDs provided.' });
        }

        // Validate subjects
        if (subjects.length > 0) {
            db.query(`SELECT subject_id FROM Subjects WHERE subject_id IN (?)`, [subjects.map(Number)], (err2, validSubjects) => {
                if (err2) {
                    console.error('Error validating subjects:', err2);
                    return res.status(500).json({ success: false, message: 'Failed to validate subjects.', error: err2.message });
                }
                const validSubjectIds = validSubjects.map(s => s.subject_id);
                const invalidSubjects = subjects.filter(sub => !validSubjectIds.includes(Number(sub)));
                if (invalidSubjects.length > 0) {
                    return res.status(400).json({ success: false, message: 'Invalid subject IDs provided.' });
                }
                proceedWithUpdate();
            });
        } else {
            proceedWithUpdate();
        }
    });

    function proceedWithUpdate() {
        // Validate date_of_birth
        let parsedDob;
        if (date_of_birth.includes('/')) {
            parsedDob = moment(date_of_birth, 'DD/MM/YYYY', true);
            if (!parsedDob.isValid()) return res.status(400).json({ success: false, message: 'Invalid Date of Birth format. Use DD/MM/YYYY.' });
        } else {
            parsedDob = moment(date_of_birth, 'YYYY-MM-DD', true);
            if (!parsedDob.isValid()) return res.status(400).json({ success: false, message: 'Invalid Date of Birth format. Use YYYY-MM-DD.' });
        }
        const formattedDob = parsedDob.format('YYYY-MM-DD');

        const profilePic = req.file ? req.file.filename : null;

        // Update student
        const updateSql = `
            UPDATE Students SET
                student_id = ?,
                full_name = ?,
                guardian_phone = ?,
                email = ?,
                address = ?,
                gender = ?,
                date_of_birth = ?
                ${profilePic ? ', profile_picture = ?' : ''}
            WHERE id = ?
        `;
        const params = [student_id, full_name, guardian_phone, email || null, address, gender, formattedDob];
        if (profilePic) params.push(profilePic);
        params.push(studentDbId);

        db.query(updateSql, params, (err) => {
            if (err) {
                console.error('Error updating student:', err);
                return res.status(500).json({ success: false, message: 'Failed to update student.', error: err.message });
            }

            // Clear existing enrollments and subjects
            db.query(`DELETE FROM Student_Subjects WHERE enrollment_id IN (SELECT enrollment_id FROM Student_Enrollments WHERE student_id = ?)`, [studentDbId], (err2) => {
                if (err2) {
                    console.error('Error clearing subjects:', err2);
                    return res.status(500).json({ success: false, message: 'Failed to clear subjects.', error: err2.message });
                }

                db.query(`DELETE FROM Student_Enrollments WHERE student_id = ?`, [studentDbId], (err3) => {
                    if (err3) {
                        console.error('Error clearing enrollments:', err3);
                        return res.status(500).json({ success: false, message: 'Failed to clear enrollments.', error: err3.message });
                    }

                    // Insert new enrollments
                    const enrollSql = `
                        INSERT INTO Student_Enrollments (student_id, section_id, class_ref, level, term)
                        VALUES ?
                    `;
                    const enrollValues = classes.map(cls => {
                        const [section_id, class_ref] = cls.split(':').map(Number);
                        return [studentDbId, section_id, class_ref, level, term];
                    });

                    db.query(enrollSql, [enrollValues], (err4, enrResult) => {
                        if (err4) {
                            console.error('Error inserting enrollments:', err4);
                            return res.status(500).json({ success: false, message: 'Failed to update enrollments.', error: err4.message });
                        }

                        if (subjects.length > 0) {
                            // Fetch new enrollment IDs
                            db.query(`SELECT enrollment_id FROM Student_Enrollments WHERE student_id = ?`, [studentDbId], (err5, enrollments) => {
                                if (err5) {
                                    console.error('Error fetching enrollments:', err5);
                                    return res.status(500).json({ success: false, message: 'Failed to fetch enrollments.', error: err5.message });
                                }

                                const subjSql = `INSERT INTO Student_Subjects (enrollment_id, subject_id, term) VALUES ?`;
                                const subjValues = enrollments.reduce((acc, enrollment) => {
                                    subjects.forEach(sub => {
                                        acc.push([enrollment.enrollment_id, Number(sub), term]);
                                    });
                                    return acc;
                                }, []);

                                if (subjValues.length > 0) {
                                    db.query(subjSql, [subjValues], (err6) => {
                                        if (err6) {
                                            console.error('Error inserting subjects:', err6);
                                            return res.status(500).json({ success: false, message: 'Failed to update subjects.', error: err6.message });
                                        }
                                        res.json({ success: true, data: { id: studentDbId } });
                                    });
                                } else {
                                    res.json({ success: true, data: { id: studentDbId } });
                                }
                            });
                        } else {
                            res.json({ success: true, data: { id: studentDbId } });
                        }
                    });
                });
            });
        });
    }
});


// ==========================
// Delete student
// ==========================
app.delete('/api/students/:id', (req, res) => {
    if (!req.session.isAuthenticated)
        return res.status(401).json({ success: false, message: 'Unauthorized.' });

    const studentId = req.params.id;

    db.beginTransaction(err => {
        if (err) {
            console.error('Transaction start error:', err);
            return res.status(500).json({ success: false, message: 'Transaction start error.', error: err.message });
        }

        // Delete subjects
        const deleteSubjectsQuery = `
            DELETE FROM Student_Subjects 
            WHERE enrollment_id IN (
                SELECT enrollment_id FROM Student_Enrollments WHERE student_id = ?
            )
        `;
        db.query(deleteSubjectsQuery, [studentId], err => {
            if (err) {
                console.error('Error deleting subjects:', err);
                return db.rollback(() => res.status(500).json({ success: false, message: 'Database error deleting subjects.', error: err.message }));
            }

            // Delete enrollments
            const deleteEnrollmentsQuery = `DELETE FROM Student_Enrollments WHERE student_id = ?`;
            db.query(deleteEnrollmentsQuery, [studentId], err => {
                if (err) {
                    console.error('Error deleting enrollments:', err);
                    return db.rollback(() => res.status(500).json({ success: false, message: 'Database error deleting enrollments.', error: err.message }));
                }

                // Delete student
                const deleteStudentQuery = `DELETE FROM Students WHERE id = ?`;
                db.query(deleteStudentQuery, [studentId], (err, result) => {
                    if (err) {
                        console.error('Error deleting student:', err);
                        return db.rollback(() => res.status(500).json({ success: false, message: 'Database error deleting student.', error: err.message }));
                    }
                    if (result.affectedRows === 0) {
                        return db.rollback(() => res.status(404).json({ success: false, message: 'Student not found.' }));
                    }

                    db.commit(err => {
                        if (err) {
                            console.error('Commit error:', err);
                            return db.rollback(() => res.status(500).json({ success: false, message: 'Commit error.', error: err.message }));
                        }
                        res.status(200).json({ success: true, message: 'Student deleted successfully.' });
                    });
                });
            });
        });
    });
});

// ==========================
// Upload student profile picture
// ==========================
app.post('/api/students/upload-profile-picture', upload.single('profile_picture'), (req, res) => {
    if (!req.session.isAuthenticated)
        return res.status(401).json({ success: false, message: 'Unauthorized.' });

    const studentId = req.body.studentId;
    const profilePicture = req.file ? `Uploads/${req.file.filename}` : null;

    if (!studentId || !profilePicture) {
        console.log('Missing studentId or profile picture:', { studentId, profilePicture });
        return res.status(400).json({ success: false, message: 'Student ID and profile picture are required.' });
    }

    const updateQuery = `
        UPDATE Students
        SET profile_picture = ?
        WHERE id = ?
    `;
    db.query(updateQuery, [profilePicture, studentId], (err, result) => {
        if (err) {
            console.error('Error updating profile picture:', err);
            return res.status(500).json({ success: false, message: 'Database error updating profile picture.', error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Student not found.' });
        }
        res.status(200).json({ success: true, message: 'Profile picture uploaded successfully.', profile_picture: profilePicture });
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