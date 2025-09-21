  const { jsPDF } = window.jspdf;
        const translations = {
            en: {
                adminPanel: "Admin Panel",
                dashboard: "Dashboard",
                staff: "Staff",
                students: "Students",
                fees: "Fees",
                bookings: "Bookings",
                admin: "Admin",
                signOut: "Sign out",
                dashboardOverview: "Dashboard Overview",
                totalStaff: "Total Staff",
                totalStudents: "Total Students",
                pendingFees: "Pending Fees",
                totalBookings: "Total Bookings",
                firstLoginNotice: "First login detected. Please update your credentials for security.",
                newPasswordLabel: "New Password",
                confirmPasswordLabel: "Confirm Password",
                updateCredentials: "Update Credentials",
                close: "Close",
                toggleLanguage: "العربية",
                admins: "Admins",
                academic: "Academic",
                demographics: "Demographics",
                staffManagement: "Staff Management",
                studentManagement: "Student Management",
                feesManagement: "Fees Management",
                bookingsManagement: "Bookings Management",
                adminManagement: "Admin Management",
                academicManagement: "Academic Management",
                generate: "ID/Report Generator",
                updateSuccess: "Credentials updated successfully!",
                passwordsMatchError: "Passwords do not match.",
                userNotFound: "User not found or not authorized.",
                staffSaved: "Staff record saved successfully.",
                studentSaved: "Student record saved successfully.",
                feesSaved: "Fees updated successfully.",
                bookingsFetched: "Bookings fetched successfully.",
                generateIdCard: "Generate ID Card",
                generateReportSheet: "Generate Report Sheet",
                selectType: "Select Type",
                entityId: "Entity ID",
                studentId: "Student ID",
                reportType: "Report Type",
                session: "Session",
                term: "Term",
                terminalReport: "Terminal",
                sessionalReport: "Sessional",
                firstTerm: "1st Term",
                secondTerm: "2nd Term",
                thirdTerm: "3rd Term",
                session2024_2025: "2024/2025 Session",
                session2023_2024: "2023/2024 Session",
                idCardGenerated: "ID Card Generated",
                reportSheetGenerated: "Report Sheet Generated",
                exportPdf: "Export as PDF",
                exportExcel: "Export as Excel",
                setFees: "Set Fees per Level",
                basicFees: "Basic Level Fees",
                mediumFees: "Medium Level Fees",
                highFees: "High Level Fees",
                saveFees: "Save Fees",
                paymentTracking: "Payment Tracking",
                studentName: "Student Name",
                levelClass: "Level/Class",
                status: "Status",
                actions: "Actions",
                academicCalendar: "Academic Calendar",
                termStartDate: "Term Start Date",
                termEndDate: "Term End Date",
                saveDates: "Save Dates",
                reportsheets: "Reportsheets",
                generateReportSheets: "Generate Report Sheets",
                staffGenderDistribution: "Staff Gender Distribution",
                studentGenderDistribution: "Student Gender Distribution",
                addStaff: "Add New Staff",
                addStudent: "Add New Student",
                addAdmin: "Add New Admin",
                saveStaff: "Save Staff",
                saveStudent: "Save Student",
                saveAdmin: "Save Admin",
                name: "Name",
                email: "Email",
                role: "Role",
                phone: "Phone",
                class: "Class",
                level: "Level",
                gender: "Gender",
                username: "Username",
                password: "Password",
                securityQuestion: "Security Question",
                securityAnswer: "Security Answer",
                newUsername: "New Username",
                newName: "Name",
                dateOfBirth: "Date of Birth",
                address: "Address",
                message: "Message",
                timeSent: "Time Sent",
                formTeacher: "Form Teacher",
                regularTeacher: "Regular Teacher",
                basicClass: "Basic Class",
                mediumClass: "Medium Class",
                highClass: "High Class",
                male: "Male",
                female: "Female",
                other: "Other",
                superAdmin: "SuperAdmin",
                deputyAdmin: "DeputyAdmin",
                petNameQuestion: "What is your pet's name?",
                maidenNameQuestion: "What is your mother's maiden name?",
                carMakeQuestion: "What was your first car's make?"
            },
            ar: {
                adminPanel: "لوحة التحكم الإدارية",
                dashboard: "لوحة القيادة",
                staff: "العاملون",
                students: "الطلاب",
                fees: "الرسوم",
                bookings: "الحجوزات",
                admin: "المشرف",
                signOut: "تسجيل الخروج",
                dashboardOverview: "نظرة عامة على لوحة القيادة",
                totalStaff: "إجمالي العاملين",
                totalStudents: "إجمالي الطلاب",
                pendingFees: "الرسوم المعلقة",
                totalBookings: "إجمالي الحجوزات",
                firstLoginNotice: "تم اكتشاف تسجيل الدخول الأول. يرجى تحديث بيانات الاعتماد الخاصة بك للأمان.",
                newPasswordLabel: "كلمة المرور الجديدة",
                confirmPasswordLabel: "تأكيد كلمة المرور",
                updateCredentials: "تحديث بيانات الاعتماد",
                close: "إغلاق",
                toggleLanguage: "English",
                admins: "المشرفون",
                academic: "الأكاديمي",
                demographics: "البيانات الديموغرافية",
                staffManagement: "إدارة العاملين",
                studentManagement: "إدارة الطلاب",
                feesManagement: "إدارة الرسوم",
                bookingsManagement: "إدارة الحجوزات",
                adminManagement: "إدارة المشرفين",
                academicManagement: "الإدارة الأكاديمية",
                generate: "مولد الهوية/التقرير",
                updateSuccess: "تم تحديث بيانات الاعتماد بنجاح!",
                passwordsMatchError: "كلمات المرور لا تتطابق.",
                userNotFound: "المستخدم غير موجود أو غير مصرح له.",
                staffSaved: "تم حفظ سجل الموظف بنجاح.",
                studentSaved: "تم حفظ سجل الطالب بنجاح.",
                feesSaved: "تم تحديث الرسوم بنجاح.",
                bookingsFetched: "تم جلب الحجوزات بنجاح.",
                generateIdCard: "إنشاء بطاقة هوية",
                generateReportSheet: "إنشاء ورقة تقرير",
                selectType: "اختر النوع",
                entityId: "معرف الكيان",
                studentId: "معرف الطالب",
                reportType: "نوع التقرير",
                session: "الدورة",
                term: "الفصل",
                terminalReport: "تقرير فصلي",
                sessionalReport: "تقرير دوري",
                firstTerm: "الفصل الأول",
                secondTerm: "الفصل الثاني",
                thirdTerm: "الفصل الثالث",
                session2024_2025: "دورة 2024/2025",
                session2023_2024: "دورة 2023/2024",
                idCardGenerated: "تم إنشاء بطاقة الهوية",
                reportSheetGenerated: "تم إنشاء ورقة التقرير",
                exportPdf: "تصدير كـ PDF",
                exportExcel: "تصدير كـ Excel",
                setFees: "تحديد الرسوم لكل مستوى",
                basicFees: "رسوم المستوى الأساسي",
                mediumFees: "رسوم المستوى المتوسط",
                highFees: "رسوم المستوى العالي",
                saveFees: "حفظ الرسوم",
                paymentTracking: "تتبع الدفع",
                studentName: "اسم الطالب",
                levelClass: "المستوى/الفصل",
                status: "الحالة",
                actions: "الإجراءات",
                academicCalendar: "التقويم الأكاديمي",
                termStartDate: "تاريخ بدء الفصل",
                termEndDate: "تاريخ انتهاء الفصل",
                saveDates: "حفظ التواريخ",
                reportsheets: "أوراق التقارير",
                generateReportSheets: "إنشاء أوراق التقارير",
                staffGenderDistribution: "توزيع الجنس للعاملين",
                studentGenderDistribution: "توزيع الجنس للطلاب",
                addStaff: "إضافة موظف جديد",
                addStudent: "إضافة طالب جديد",
                addAdmin: "إضافة مشرف جديد",
                saveStaff: "حفظ الموظف",
                saveStudent: "حفظ الطالب",
                saveAdmin: "حفظ المشرف",
                name: "الاسم",
                email: "البريد الإلكتروني",
                role: "الدور",
                phone: "الهاتف",
                class: "الفصل",
                level: "المستوى",
                gender: "الجنس",
                username: "اسم المستخدم",
                password: "كلمة المرور",
                securityQuestion: "سؤال الأمان",
                securityAnswer: "إجابة الأمان",
                newUsername: "اسم المستخدم الجديد",
                newName: "الاسم",
                dateOfBirth: "تاريخ الميلاد",
                address: "العنوان",
                message: "الرسالة",
                timeSent: "وقت الإرسال",
                formTeacher: "معلم الفصل",
                regularTeacher: "معلم عادي",
                basicClass: "الفصل الأساسي",
                mediumClass: "الفصل المتوسط",
                highClass: "الفصل العالي",
                male: "ذكر",
                female: "أنثى",
                other: "آخر",
                superAdmin: "مشرف رئيسي",
                deputyAdmin: "نائب المشرف",
                petNameQuestion: "ما هو اسم حيوانك الأليف؟",
                maidenNameQuestion: "ما هو اسم عائلة والدتك قبل الزواج؟",
                carMakeQuestion: "ما هي ماركة سيارتك الأولى؟"
            }
        };

        const classMapping = {
            'Basic': ['Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Basic 6'],
            'Medium': ['JSS 1', 'JSS 2', 'JSS 3'],
            'High': ['SS 1', 'SS 2', 'SS 3']
        };

        let currentLang = localStorage.getItem('language') || 'en';
        const API_BASE_URL = 'http://localhost:5000';

        // Modal instances
        const firstLoginModal = new bootstrap.Modal(document.getElementById('firstLoginModal'), { backdrop: 'static', keyboard: false });
        const messageModal = new bootstrap.Modal(document.getElementById('messageModal'));
        const staffModal = new bootstrap.Modal(document.getElementById('staffModal'));
        const studentModal = new bootstrap.Modal(document.getElementById('studentModal'));
        const adminModal = new bootstrap.Modal(document.getElementById('adminModal'));

        // API Functions
        const fetchData = async (url, options = {}) => {
            try {
                const response = await fetch(`${API_BASE_URL}${url}`, {
                    ...options,
                    credentials: 'include'
                });
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                if (!data.success) throw new Error(data.message || 'API call failed');
                return data;
            } catch (error) {
                console.error('Fetch error:', error);
                return { success: false, message: error.message };
            }
        };

        const postData = async (url, data) => {
            return fetchData(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        };

        const deleteData = async (url) => {
            try {
                const response = await fetch(`${API_BASE_URL}${url}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                if (!response.ok) {
                    const contentType = response.headers.get("content-type");
                    if (contentType && contentType.indexOf("application/json") !== -1) {
                        const errorData = await response.json();
                        return { success: false, message: errorData.message || `Error ${response.status}` };
                    } else {
                        return { success: false, message: "Server returned a non-JSON response. You may have been redirected due to an expired session." };
                    }
                }
                const data = await response.json();
                return data;
            } catch (error) {
                console.error("Delete error:", error);
                return { success: false, message: error.message || "Request failed." };
            }
        };

        // UI Rendering Functions
        const formatCurrency = (amount) => {
            return `₦${parseFloat(amount || 0).toFixed(2)}`;
        };

        const formatDate = (dateString) => {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        };

        const renderStaff = (staff) => {
            const staffTableBody = document.getElementById('staffTableBody');
            staffTableBody.innerHTML = '';
            staff.forEach(person => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${person.name}</td>
                    <td>${person.email || 'N/A'}</td>
                    <td>${person.role || 'N/A'}</td>
                    <td>${person.phone || 'N/A'}</td>
                    <td>
                        <button class="btn btn-sm btn-primary edit-button" data-id="${person.id}" data-type="staff" data-translate="edit">Edit</button>
                        <button class="btn btn-sm btn-danger delete-button" data-id="${person.id}" data-type="staff" data-translate="delete">Delete</button>
                    </td>
                `;
                staffTableBody.appendChild(row);
            });
            translatePage(currentLang);
        };

        const renderStudents = (students) => {
            const studentTableBody = document.getElementById('studentTableBody');
            studentTableBody.innerHTML = '';
            students.forEach(student => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${student.name}</td>
                    <td>${student.class_name || 'N/A'}</td>
                    <td>${student.level || 'N/A'}</td>
                    <td>${student.gender || 'N/A'}</td>
                    <td>
                        <button class="btn btn-sm btn-primary edit-button" data-id="${student.id}" data-type="student" data-translate="edit">Edit</button>
                        <button class="btn btn-sm btn-danger delete-button" data-id="${student.id}" data-type="student" data-translate="delete">Delete</button>
                    </td>
                `;
                studentTableBody.appendChild(row);
            });
            translatePage(currentLang);
        };

        const renderAdmins = (admins) => {
            const adminTableBody = document.getElementById('adminTableBody');
            adminTableBody.innerHTML = '';
            admins.forEach(admin => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${admin.username}</td>
                    <td>${admin.name}</td>
                    <td>${admin.phone}</td>
                    <td>${admin.role}</td>
                    <td>
                        ${admin.role !== 'SuperAdmin' ? `
                            <button class="btn btn-sm btn-primary edit-button" data-id="${admin.id}" data-type="admin" data-translate="edit">Edit</button>
                            <button class="btn btn-sm btn-danger delete-button" data-id="${admin.id}" data-type="admin" data-translate="delete">Delete</button>
                        ` : ''}
                    </td>
                `;
                adminTableBody.appendChild(row);
            });
            translatePage(currentLang);
        };

        const renderPayments = (payments) => {
            const paymentTableBody = document.getElementById('paymentTableBody');
            paymentTableBody.innerHTML = '';
            payments.forEach(payment => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${payment.name}</td>
                    <td>${payment.level || 'N/A'}/${payment.class_name || 'N/A'}</td>
                    <td><span class="${payment.status === 'completed' ? 'text-success' : 'text-warning'}">${payment.status}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary edit-payment-button" data-id="${payment.id}" data-translate="edit">Edit</button>
                    </td>
                `;
                paymentTableBody.appendChild(row);
            });
            translatePage(currentLang);
        };

        const renderBookings = (bookings) => {
            const bookingsTableBody = document.getElementById('bookingsTableBody');
            bookingsTableBody.innerHTML = '';
            bookings.forEach(booking => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${booking.name}</td>
                    <td>${booking.email || 'N/A'}</td>
                    <td>${booking.gender}</td>
                    <td>${formatDate(booking.date_of_birth)}</td>
                    <td>${booking.phone}</td>
                    <td>${booking.address}</td>
                    <td>${booking.message || 'N/A'}</td>
                    <td>${new Date(booking.time_sent).toLocaleString()}</td>
                `;
                bookingsTableBody.appendChild(row);
            });
            translatePage(currentLang);
        };

        const renderDashboardOverview = async () => {
            const data = await fetchData('/api/demographics');
            if (data.success) {
                const totalRow = data.data.find(row => row.class_name === 'Total') || {};
                document.getElementById('totalStudentsCount').textContent = totalRow.total_class_count || 0;
            }
            const staffData = await fetchData('/api/staff');
            if (staffData.success) {
                document.getElementById('totalStaffCount').textContent = staffData.data.length || 0;
            }
            const bookingsData = await fetchData('/api/bookings');
            if (bookingsData.success) {
                document.getElementById('totalBookingsCount').textContent = bookingsData.data.length || 0;
            }
            // Placeholder for pending fees
            document.getElementById('pendingFeesCount').textContent = '0';
        };

        const refreshData = async () => {
            await fetchDataAndRender('/api/staff', renderStaff);
            await fetchDataAndRender('/api/students', renderStudents);
            await fetchDataAndRender('/api/bookings', renderBookings);
            const adminsData = await fetchData('/api/admins');
            if (adminsData.success) {
                renderAdmins(adminsData.data);
            }
            // Placeholder for payments
            // await fetchDataAndRender('/api/payments', renderPayments);
        };

        const fetchDataAndRender = async (url, renderFunc) => {
            const data = await fetchData(url);
            if (data.success) {
                renderFunc(data.data);
            }
        };

        // Export Functions
        const exportToPDF = () => {
            const doc = new jsPDF();
            doc.text(translations[currentLang].bookingsManagement, 10, 10);
            doc.autoTable({
                html: '#bookingsTable',
                startY: 20,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [66, 133, 244] },
                bodyStyles: { textColor: [0, 0, 0] }
            });
            doc.save('bookings.pdf');
        };

        const exportToExcel = () => {
            const table = document.getElementById('bookingsTable');
            const workbook = XLSX.utils.table_to_book(table, { sheet: "Bookings" });
            XLSX.writeFile(workbook, 'bookings.xlsx');
        };

        // Translation Function
        function translatePage(lang) {
            document.querySelectorAll('[data-translate]').forEach(element => {
                const key = element.getAttribute('data-translate');
                if (translations[lang] && translations[lang][key]) {
                    element.textContent = translations[lang][key];
                }
            });
            document.documentElement.lang = lang;
            localStorage.setItem('language', lang);
            document.getElementById('langToggle').textContent = translations[lang].toggleLanguage;
        }

        function showMessageModal(titleKey, messageKey) {
            const title = translations[currentLang][titleKey] || titleKey;
            const message = translations[currentLang][messageKey] || messageKey;
            document.getElementById('messageModalLabel').textContent = title;
            document.getElementById('messageText').textContent = message;
            messageModal.show();
        }

        function showView(viewId) {
            document.querySelectorAll('#mainContent > div').forEach(view => {
                view.style.display = 'none';
            });
            document.getElementById(viewId + '-view').style.display = 'block';
            document.querySelectorAll('#sidebarNav .nav-link').forEach(link => {
                link.classList.remove('active');
            });
            document.querySelector(`[data-view="${viewId}"]`).classList.add('active');
            document.querySelector('.main-content-header h2').textContent = translations[currentLang][viewId.split('-')[0] + 'Overview'] || translations[currentLang][viewId.split('-')[0] + 'Management'] || translations[currentLang][viewId];
            if (viewId === 'dashboard') {
                renderDashboardOverview();
            } else if (viewId === 'bookings-management') {
                fetchDataAndRender('/api/bookings', renderBookings);
            }
        }

        function updateUIBasedOnRole(role) {
            document.getElementById('feesNavItem').style.display = 'none';
            document.getElementById('bookingsNavItem').style.display = 'none';
            document.getElementById('adminManagementNavItem').style.display = 'none';
            document.getElementById('academicManagementNavItem').style.display = 'none';
            document.getElementById('pendingFeesCard').style.display = 'none';
            document.getElementById('totalBookingsCard').style.display = 'none';
            if (role === 'SuperAdmin') {
                document.getElementById('feesNavItem').style.display = 'block';
                document.getElementById('bookingsNavItem').style.display = 'block';
                document.getElementById('adminManagementNavItem').style.display = 'block';
                document.getElementById('academicManagementNavItem').style.display = 'block';
                document.getElementById('pendingFeesCard').style.display = 'block';
                document.getElementById('totalBookingsCard').style.display = 'block';
            } else if (role === 'DeputyAdmin') {
                document.getElementById('academicManagementNavItem').style.display = 'block';
            }
        }

       // Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggleMobile = document.getElementById('sidebarToggleMobile');
    const firstLoginForm = document.getElementById('firstLoginForm');
    const staffForm = document.getElementById('staffForm');
    const studentForm = document.getElementById('studentForm');
    const adminForm = document.getElementById('adminForm');
    const setFeesForm = document.getElementById('setFeesForm');
    const academicCalendarForm = document.getElementById('academicCalendarForm');
    const generateIdCardButton = document.getElementById('generate-id-card-button');
    const generateReportSheetButton = document.getElementById('generate-report-sheet-button');
    const generateReportSheetsBtn = document.getElementById('generateReportSheetsBtn');
    const addStaffBtn = document.getElementById('addStaffBtn');
    const addStudentBtn = document.getElementById('addStudentBtn');
    const addAdminBtn = document.getElementById('addAdminBtn');
    const exportBookingsPdfBtn = document.getElementById('exportBookingsPdfBtn');
    const exportBookingsExcelBtn = document.getElementById('exportBookingsExcelBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const reportTypeSelect = document.getElementById('report-type');
    const termContainer = document.getElementById('term-container');

    // ✅ Ensure correct initial state
    function setSidebarInitialState() {
        if (window.innerWidth <= 768) {
            sidebar.classList.add('collapsed');
            sidebar.classList.remove('open');
        } else {
            sidebar.classList.remove('collapsed');
            sidebar.classList.remove('open');
        }
    }
    setSidebarInitialState();

    // ✅ Handle resizing between mobile/desktop
    window.addEventListener('resize', setSidebarInitialState);

    // ✅ Toggle only on mobile
    sidebarToggleMobile.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            sidebar.classList.toggle('open');
            sidebar.classList.toggle('collapsed');
        }
    });

    // ✅ Language toggle
    document.getElementById('langToggle').addEventListener('click', () => {
        currentLang = currentLang === 'en' ? 'ar' : 'en';
        translatePage(currentLang);
    });

    // ✅ Sidebar navigation
    document.getElementById('sidebarNav').addEventListener('click', (event) => {
        const link = event.target.closest('.nav-link');
        if (link) {
            const view = link.getAttribute('data-view');
            showView(view);

            // Collapse only on mobile after clicking a link
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
                sidebar.classList.add('collapsed');
            }
        }
    });
            // Add Modal Triggers
            addStaffBtn.addEventListener('click', () => {
                document.getElementById('staffId').value = '';
                document.getElementById('staffFullName').value = '';
                document.getElementById('staffEmail').value = '';
                document.getElementById('staffPhone').value = '';
                document.getElementById('staffRole').value = 'Form Teacher';
                document.getElementById('staffModalLabel').textContent = translations[currentLang].addStaff;
                staffModal.show();
            });

            addStudentBtn.addEventListener('click', () => {
                document.getElementById('studentId').value = '';
                document.getElementById('studentFullName').value = '';
                document.getElementById('studentLevel').value = 'Basic';
                const classSelect = document.getElementById('studentClass');
                classSelect.innerHTML = '';
                classMapping['Basic'].forEach(className => {
                    const option = document.createElement('option');
                    option.value = className;
                    option.textContent = className;
                    classSelect.appendChild(option);
                });
                document.getElementById('studentGender').value = 'Male';
                document.getElementById('studentModalLabel').textContent = translations[currentLang].addStudent;
                studentModal.show();
            });

            addAdminBtn.addEventListener('click', () => {
                document.getElementById('adminId').value = '';
                document.getElementById('adminUsername').value = '';
                document.getElementById('adminName').value = '';
                document.getElementById('adminPhone').value = '';
                document.getElementById('adminPassword').value = '';
                document.getElementById('adminRole').value = 'Admin';
                document.getElementById('adminSecurityQuestion').value = "What is your pet's name?";
                document.getElementById('adminSecurityAnswer').value = '';
                document.getElementById('adminModalLabel').textContent = translations[currentLang].addAdmin;
                adminModal.show();
            });

            // Report Type Change Handling
            reportTypeSelect.addEventListener('change', () => {
                termContainer.style.display = reportTypeSelect.value === 'terminal' ? 'block' : 'none';
            });

            // Export Buttons
            exportBookingsPdfBtn.addEventListener('click', exportToPDF);
            exportBookingsExcelBtn.addEventListener('click', exportToExcel);

            // First Login Handling
            firstLoginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const newPassword = document.getElementById('newPassword').value;
                const confirmPassword = document.getElementById('confirmPassword').value;
                if (newPassword !== confirmPassword) {
                    showMessageModal('error', 'passwordsMatchError');
                    return;
                }
                const formData = Object.fromEntries(new FormData(e.target).entries());
                formData.username = document.getElementById('currentUsername').value;
                const result = await postData('/api/update-admin-credentials', formData);
                const errorMessage = document.getElementById('first-login-error-message');
                errorMessage.classList.add('d-none');
                if (result.success) {
                    firstLoginModal.hide();
                    sessionStorage.removeItem('currentUsername');
                    showMessageModal('updateCredentials', 'updateSuccess');
                    renderDashboardOverview();
                    refreshData();
                } else {
                    errorMessage.textContent = result.message || translations[currentLang].userNotFound;
                    errorMessage.classList.remove('d-none');
                }
            });

            // Staff Form Handling
            staffForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const staffId = document.getElementById('staffId').value;
                const staffData = {
                    name: document.getElementById('staffFullName').value,
                    email: document.getElementById('staffEmail').value,
                    phone: document.getElementById('staffPhone').value,
                    role: document.getElementById('staffRole').value
                };
                const endpoint = staffId ? `/api/staff/${staffId}` : '/api/staff';
                const method = staffId ? 'PUT' : 'POST';
                const result = await fetchData(endpoint, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(staffData)
                });
                if (result.success) {
                    showMessageModal('staffSaved', 'staffSaved');
                    staffModal.hide();
                    staffForm.reset();
                    refreshData();
                } else {
                    showMessageModal('error', result.message || 'Failed to save staff record.');
                }
            });

            // Student Form Handling
            studentForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const studentId = document.getElementById('studentId').value;
                const studentData = {
                    name: document.getElementById('studentFullName').value,
                    level: document.getElementById('studentLevel').value,
                    class_name: document.getElementById('studentClass').value,
                    gender: document.getElementById('studentGender').value
                };
                const endpoint = studentId ? `/api/students/${studentId}` : '/api/students';
                const method = studentId ? 'PUT' : 'POST';
                const result = await fetchData(endpoint, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(studentData)
                });
                if (result.success) {
                    showMessageModal('studentSaved', 'studentSaved');
                    studentModal.hide();
                    studentForm.reset();
                    refreshData();
                } else {
                    showMessageModal('error', result.message || 'Failed to save student record.');
                }
            });

            // Admin Form Handling
            adminForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const adminId = document.getElementById('adminId').value;
                const adminData = {
                    username: document.getElementById('adminUsername').value,
                    name: document.getElementById('adminName').value,
                    phone: document.getElementById('adminPhone').value,
                    password: document.getElementById('adminPassword').value,
                    role: document.getElementById('adminRole').value,
                    securityQuestion: document.getElementById('adminSecurityQuestion').value,
                    securityAnswer: document.getElementById('adminSecurityAnswer').value
                };
                const endpoint = adminId ? `/api/admins/${adminId}` : '/api/create-admin';
                const method = adminId ? 'PUT' : 'POST';
                const result = await fetchData(endpoint, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(adminData)
                });
                if (result.success) {
                    showMessageModal('adminSaved', adminId ? 'Admin updated successfully.' : 'Admin added successfully.');
                    adminModal.hide();
                    adminForm.reset();
                    refreshData();
                } else {
                    showMessageModal('error', result.message || 'Failed to save admin.');
                }
            });

            // Fees Form Handling (Placeholder)
            setFeesForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const feesData = {
                    basicFees: document.getElementById('basicFees').value,
                    mediumFees: document.getElementById('mediumFees').value,
                    highFees: document.getElementById('highFees').value
                };
                // Placeholder: Implement backend endpoint for fees
                showMessageModal('feesSaved', 'feesSaved');
                setFeesForm.reset();
            });

            // Academic Calendar Form Handling
            academicCalendarForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const startDate = document.getElementById('termStartDate').value;
                const endDate = document.getElementById('termEndDate').value;
                const result = await postData('/api/schedule', { startDate, endDate });
                if (result.success) {
                    showMessageModal('datesSaved', 'Academic calendar updated successfully.');
                    academicCalendarForm.reset();
                } else {
                    showMessageModal('error', result.message || 'Failed to save academic calendar.');
                }
            });

            // Generate ID Card
            generateIdCardButton.addEventListener('click', async () => {
                const entityType = document.getElementById('id-card-entity-type').value;
                const entityId = document.getElementById('id-card-entity-id').value;
                const result = await postData('/api/generate-id-card', { entityType, entityId });
                if (result.success) {
                    showMessageModal('idCardGenerated', `ID Card generated for ${entityType} ${entityId}`);
                } else {
                    showMessageModal('error', result.message || 'Failed to generate ID card.');
                }
            });

           // Generate Report Sheet
            generateReportSheetButton.addEventListener('click', async () => {
                const studentId = document.getElementById('report-student-id').value;
                const reportType = document.getElementById('report-type').value;
                const session = document.getElementById('report-session').value;
                const term = reportType === 'terminal' ? document.getElementById('report-term').value : null;
                const reportData = { studentId, reportType, session };
                if (term) reportData.term = term;
                const result = await postData('/api/generate-report-sheet', reportData);
                if (result.success) {
                    showMessageModal('reportSheetGenerated', `Report sheet generated for student ${studentId}`);
                } else {
                    showMessageModal('error', result.message || 'Failed to generate report sheet.');
                }
            });

            // Generate Report Sheets (Bulk)
            generateReportSheetsBtn.addEventListener('click', async () => {
                const result = await postData('/api/generate-report-sheets', {});
                if (result.success) {
                    showMessageModal('reportSheetsGenerated', 'Report sheets generated successfully.');
                } else {
                    showMessageModal('error', result.message || 'Failed to generate report sheets.');
                }
            });

            // Edit and Delete Button Handling
            document.addEventListener('click', async (e) => {
                if (e.target.classList.contains('edit-button')) {
                    const id = e.target.getAttribute('data-id');
                    const type = e.target.getAttribute('data-type');
                    if (type === 'staff') {
                        const staffData = await fetchData(`/api/staff/${id}`);
                        if (staffData.success) {
                            document.getElementById('staffId').value = staffData.data.id;
                            document.getElementById('staffFullName').value = staffData.data.name;
                            document.getElementById('staffEmail').value = staffData.data.email || '';
                            document.getElementById('staffPhone').value = staffData.data.phone || '';
                            document.getElementById('staffRole').value = staffData.data.role || 'Form Teacher';
                            document.getElementById('staffModalLabel').textContent = translations[currentLang].editStaff || 'Edit Staff';
                            staffModal.show();
                        }
                    } else if (type === 'student') {
                        const studentData = await fetchData(`/api/students/${id}`);
                        if (studentData.success) {
                            document.getElementById('studentId').value = studentData.data.id;
                            document.getElementById('studentFullName').value = studentData.data.name;
                            document.getElementById('studentLevel').value = studentData.data.level || 'Basic';
                            const classSelect = document.getElementById('studentClass');
                            classSelect.innerHTML = '';
                            classMapping[studentData.data.level].forEach(className => {
                                const option = document.createElement('option');
                                option.value = className;
                                option.textContent = className;
                                if (className === studentData.data.class_name) option.selected = true;
                                classSelect.appendChild(option);
                            });
                            document.getElementById('studentGender').value = studentData.data.gender || 'Male';
                            document.getElementById('studentModalLabel').textContent = translations[currentLang].editStudent || 'Edit Student';
                            studentModal.show();
                        }
                    } else if (type === 'admin') {
                        const adminData = await fetchData(`/api/admins/${id}`);
                        if (adminData.success) {
                            document.getElementById('adminId').value = adminData.data.id;
                            document.getElementById('adminUsername').value = adminData.data.username;
                            document.getElementById('adminName').value = adminData.data.name;
                            document.getElementById('adminPhone').value = adminData.data.phone;
                            document.getElementById('adminPassword').value = '';
                            document.getElementById('adminRole').value = adminData.data.role || 'Admin';
                            document.getElementById('adminSecurityQuestion').value = adminData.data.securityQuestion || "What is your pet's name?";
                            document.getElementById('adminSecurityAnswer').value = adminData.data.securityAnswer || '';
                            document.getElementById('adminModalLabel').textContent = translations[currentLang].editAdmin || 'Edit Admin';
                            adminModal.show();
                        }
                    }
                } else if (e.target.classList.contains('delete-button')) {
                    const id = e.target.getAttribute('data-id');
                    const type = e.target.getAttribute('data-type');
                    if (confirm(translations[currentLang].confirmDelete || 'Are you sure you want to delete this record?')) {
                        const endpoint = type === 'staff' ? `/api/staff/${id}` : type === 'student' ? `/api/students/${id}` : `/api/admins/${id}`;
                        const result = await deleteData(endpoint);
                        if (result.success) {
                            showMessageModal('recordDeleted', `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully.`);
                            refreshData();
                        } else {
                            showMessageModal('error', result.message || `Failed to delete ${type}.`);
                        }
                    }
                }
            });

            // Student Level Change Handling
            document.getElementById('studentLevel').addEventListener('change', (e) => {
                const level = e.target.value;
                const classSelect = document.getElementById('studentClass');
                classSelect.innerHTML = '';
                classMapping[level].forEach(className => {
                    const option = document.createElement('option');
                    option.value = className;
                    option.textContent = className;
                    classSelect.appendChild(option);
                });
            });

            // Logout Handling
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const result = await fetchData('/api/logout', { method: 'POST' });
                if (result.success) {
                    window.location.href = '/admin-login';
                } else {
                    showMessageModal('error', result.message || 'Failed to log out.');
                }
            });

            // Initial Page Load
            (async () => {
                const userData = await fetchData('/api/user-details');
                if (userData.success) {
                    document.getElementById('userRoleDisplay').textContent = userData.data.role;
                    document.getElementById('usernameDisplay').textContent = userData.data.username;
                    document.getElementById('adminNameDisplay').textContent = userData.data.name || 'Admin';
                    updateUIBasedOnRole(userData.data.role);
                    if (userData.data.firstLogin) {
                        document.getElementById('currentUsername').value = userData.data.username;
                        firstLoginModal.show();
                    } else {
                        renderDashboardOverview();
                        refreshData();
                    }
                } else {
                    showMessageModal('error', userData.message || 'Failed to load user details.');
                    setTimeout(() => window.location.href = '/login', 2000);
                }
                translatePage(currentLang);
            })();
        });