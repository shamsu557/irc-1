// Ensure HTTPS is enforced in production for secure data transmission
        const translations = {
            en: {
                backToHome: "Back to Home",
                secureAccess: "Secure access to the Halqatu Ibadurrahman Litahfizil Qur'an staff system.",
                secure: "Secure",
                control: "Control",
                analytics: "Analytics",
                staffLogin: "Staff Login",
                signInDesc: "Sign in to access the staff dashboard. Default password is 'default' for first login.",
                staffIdLabel: "Staff ID",
                passwordLabel: "Password",
                rememberMe: "Remember me",
                forgotPassword: "Forgot Password?",
                signIn: "Sign In",
                authorizedOnly: "Authorized personnel only",
                close: "Close",
                toggleLanguage: "العربية",
                next: "Next",
                verify: "Verify",
                resetPassword: "Reset Password",
                securityQuestion: "Security Question",
                securityAnswer: "Security Answer",
                selectQuestion: "Select a security question",
                securityQuestion1: "What is your pet's name?",
                securityQuestion2: "What is your mother's maiden name?",
                securityQuestion3: "What is the name of your first school?",
                securityQuestion4: "What is your favorite book?",
                securityQuestion5: "What is the name of your hometown?",
                newSecurityQuestion: "Security Question",
                newSecurityAnswer: "Security Answer",
                newPasswordLabel: "New Password",
                confirmPasswordLabel: "Confirm Password",
                staffIdNotFound: "Staff ID not found.",
                wrongAnswer: "Incorrect security answer.",
                passwordMismatch: "Passwords do not match.",
                passwordResetSuccess: "Password reset successfully. Please log in with your new password.",
                invalidCredentials: "Invalid credentials.",
                serverError: "Server error.",
                updateCredentials: "Update Your Credentials",
                updateCredentialsDesc: "Please update your credentials to continue.",
                newStaffIdLabel: "New Staff ID",
                nameLabel: "Full Name",
                phoneLabel: "Phone Number",
                emailLabel: "Email (Optional)",
                updateCredentialsBtn: "Update Credentials",
                credentialsUpdated: "Credentials updated successfully.",
                allFieldsRequired: "All fields are required.",
                staffIdExists: "Staff ID already exists."
            },
            ar: {
                backToHome: "العودة إلى الرئيسية",
                secureAccess: "الوصول الآمن إلى نظام حلقة عباد الرحمن لتحفيظ القرآن للموظفين.",
                secure: "آمن",
                control: "التحكم",
                analytics: "التحليلات",
                staffLogin: "تسجيل دخول الموظفين",
                signInDesc: "قم بتسجيل الدخول للوصول إلى لوحة تحكم الموظفين. كلمة المرور الافتراضية هي 'default' لتسجيل الدخول الأول.",
                staffIdLabel: "معرف الموظف",
                passwordLabel: "كلمة المرور",
                rememberMe: "تذكرني",
                forgotPassword: "هل نسيت كلمة المرور؟",
                signIn: "تسجيل الدخول",
                authorizedOnly: "الأشخاص المخولون فقط",
                close: "إغلاق",
                toggleLanguage: "English",
                next: "التالي",
                verify: "تحقق",
                resetPassword: "إعادة تعيين كلمة المرور",
                securityQuestion: "سؤال الأمان",
                securityAnswer: "إجابة الأمان",
                selectQuestion: "اختر سؤال أمان",
                securityQuestion1: "ما هو اسم حيوانك الأليف؟",
                securityQuestion2: "ما هو اسم عائلة والدتك قبل الزواج؟",
                securityQuestion3: "ما هو اسم مدرستك الأولى؟",
                securityQuestion4: "ما هو كتابك المفضل؟",
                securityQuestion5: "ما هو اسم مدينتك الأصلية؟",
                newSecurityQuestion: "سؤال الأمان",
                newSecurityAnswer: "إجابة الأمان",
                newPasswordLabel: "كلمة المرور الجديدة",
                confirmPasswordLabel: "تأكيد كلمة المرور",
                staffIdNotFound: "معرف الموظف غير موجود.",
                wrongAnswer: "إجابة الأمان غير صحيحة.",
                passwordMismatch: "كلمتا المرور غير متطابقتين.",
                passwordResetSuccess: "تم إعادة تعيين كلمة المرور بنجاح. يرجى تسجيل الدخول بكلمة المرور الجديدة.",
                invalidCredentials: "بيانات الاعتماد غير صالحة.",
                serverError: "خطأ في الخادم.",
                updateCredentials: "تحديث بياناتك",
                updateCredentialsDesc: "يرجى تحديث بياناتك للمتابعة.",
                newStaffIdLabel: "معرف الموظف الجديد",
                nameLabel: "الاسم الكامل",
                phoneLabel: "رقم الهاتف",
                emailLabel: "البريد الإلكتروني (اختياري)",
                updateCredentialsBtn: "تحديث بيانات الاعتماد",
                credentialsUpdated: "تم تحديث بيانات الاعتماد بنجاح.",
                allFieldsRequired: "يجب تقديم جميع الحقول المطلوبة.",
                staffIdExists: "معرف الموظف موجود بالفعل."
            }
        };

        let currentLang = localStorage.getItem('language') || 'en';

        function translatePage(lang) {
            document.querySelectorAll('[data-translate]').forEach(element => {
                const key = element.getAttribute('data-translate');
                element.textContent = translations[lang][key] || element.textContent;
            });
            const selectOptions = document.querySelectorAll('#newSecurityQuestion option');
            selectOptions.forEach(option => {
                const key = option.getAttribute('data-translate');
                if (key) {
                    option.textContent = translations[lang][key] || option.textContent;
                }
            });
            document.documentElement.lang = lang;
            if (lang === 'ar') {
                document.body.classList.add('text-arabic');
                document.body.dir = 'rtl';
            } else {
                document.body.classList.remove('text-arabic');
                document.body.dir = 'ltr';
            }
            localStorage.setItem('language', lang);
            document.getElementById('langToggle').textContent = translations[lang]['toggleLanguage'];
        }

        document.addEventListener('DOMContentLoaded', () => {
            translatePage(currentLang);

            const staffLoginForm = document.getElementById('staffLoginForm');
            const updateCredentialsForm = document.getElementById('updateCredentialsForm');
            const loginFormSection = document.getElementById('loginFormSection');
            const updateCredentialsSection = document.getElementById('updateCredentialsSection');
            const staffIdInput = document.getElementById('staffId');
            const passwordInput = document.getElementById('password');
            const togglePasswordButton = document.getElementById('togglePassword');
            const newStaffIdInput = document.getElementById('newStaffId');
            const newNameInput = document.getElementById('newName');
            const newPasswordInput = document.getElementById('newPasswordInput'); // Corrected ID
            const newPhoneInput = document.getElementById('newPhone');
            const newEmailInput = document.getElementById('newEmail');
            const newSecurityQuestionInput = document.getElementById('newSecurityQuestion');
            const newSecurityAnswerInput = document.getElementById('newSecurityAnswerInput'); // Corrected ID
            const originalStaffIdInput = document.getElementById('originalStaffId');
            const toggleNewPasswordButton = document.getElementById('toggleNewPassword');
            const rememberMeCheckbox = document.getElementById('rememberMe');
            const messageModal = new bootstrap.Modal(document.getElementById('messageModal'));
            const messageModalLabel = document.getElementById('messageModalLabel');
            const messageText = document.getElementById('messageText');
            const forgotPasswordModal = new bootstrap.Modal(document.getElementById('forgotPasswordModal'));

            function showMessageModal(title, message) {
                messageModalLabel.textContent = title;
                messageText.textContent = message;
                messageModal.show();
            }

            // Load remembered staff ID
            if (localStorage.getItem('rememberStaffId')) {
                staffIdInput.value = localStorage.getItem('rememberStaffId');
                rememberMeCheckbox.checked = true;
            }

            // Toggle password visibility for login form
            togglePasswordButton.addEventListener('click', () => {
                const type = passwordInput.type === 'password' ? 'text' : 'password';
                passwordInput.type = type;
                togglePasswordButton.querySelector('i').classList.toggle('fa-eye');
                togglePasswordButton.querySelector('i').classList.toggle('fa-eye-slash');
            });

            // Toggle password visibility for update credentials form
            toggleNewPasswordButton.addEventListener('click', () => {
                const type = newPasswordInput.type === 'password' ? 'text' : 'password';
                newPasswordInput.type = type;
                toggleNewPasswordButton.querySelector('i').classList.toggle('fa-eye');
                toggleNewPasswordButton.querySelector('i').classList.toggle('fa-eye-slash');
            });

            // Handle login form submission
            staffLoginForm.addEventListener('submit', async function(event) {
                event.preventDefault();
                if (!staffLoginForm.checkValidity()) {
                    event.stopPropagation();
                    staffLoginForm.classList.add('was-validated');
                    return;
                }

                const staffId = staffIdInput.value.trim();
                const password = passwordInput.value;

                console.log('Sending to /api/staff-login:', { staffId, password: '***' });

                if (rememberMeCheckbox.checked) {
                    localStorage.setItem('rememberStaffId', staffId);
                } else {
                    localStorage.removeItem('rememberStaffId');
                }

                try {
                    const response = await fetch('/api/staff-login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ staffId, password })
                    });

                    const result = await response.json();
                    console.log('Response from /api/staff-login:', result);

                    if (result.success) {
                        if (result.message.includes('First-time login')) {
                            // First-time login, show update credentials screen
                            loginFormSection.style.display = 'none';
                            updateCredentialsSection.style.display = 'block';
                            originalStaffIdInput.value = staffId;
                            newStaffIdInput.value = staffId;

                            updateCredentialsForm.reset();
                            newSecurityQuestionInput.value = '';
                            updateCredentialsForm.classList.remove('was-validated');

                            // Attempt to pre-fetch security question (optional)
                            try {
                                const questionResponse = await fetch('/api/staff/forgot-password/verify-staff-id', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ staff_id: staffId })
                                });
                                const questionResult = await questionResponse.json();
                                if (questionResult.success && questionResult.securityQuestion) {
                                    newSecurityQuestionInput.value = questionResult.securityQuestion;
                                }
                            } catch (error) {
                                console.error('Error fetching security question on first login:', error);
                                // This is non-critical, so we continue
                            }

                            showMessageModal(translations[currentLang]['updateCredentials'], result.message);
                        } else {
                            // Standard successful login
                            showMessageModal(translations[currentLang]['signIn'], result.message);
                            if (result.redirect) {
                                setTimeout(() => {
                                    window.location.href = result.redirect;
                                }, 1000);
                            }
                        }
                    } else {
                        showMessageModal(translations[currentLang]['close'], result.message || translations[currentLang]['invalidCredentials']);
                    }
                } catch (error) {
                    console.error('Login error:', error);
                    showMessageModal(translations[currentLang]['close'], translations[currentLang]['serverError']);
                }
            });

            // Handle update credentials form submission
            updateCredentialsForm.addEventListener('submit', async function(event) {
                event.preventDefault();
                if (!updateCredentialsForm.checkValidity()) {
                    event.stopPropagation();
                    updateCredentialsForm.classList.add('was-validated');
                    return;
                }

                const newPassword = newPasswordInput.value;
                // Add simple client-side check for password length (matching HTML minlength)
                if (newPassword.length < 6) {
                    showMessageModal(translations[currentLang]['close'], "New password must be at least 6 characters long.");
                    return;
                }


                const staffId = originalStaffIdInput.value.trim();
                const newStaffId = newStaffIdInput.value.trim();
                const newName = newNameInput.value.trim();
                const newPhone = newPhoneInput.value.trim();
                const newEmail = newEmailInput.value.trim();
                const newSecurityQuestion = newSecurityQuestionInput.value;
                const newSecurityAnswer = newSecurityAnswerInput.value.trim();

                console.log('Sending to /api/update-staff-credentials:', {
                    staffId,
                    newStaffId,
                    newName,
                    newPassword: '***',
                    newPhone,
                    newEmail,
                    securityQuestion: newSecurityQuestion,
                    securityAnswer: newSecurityAnswer
                });

                try {
                    const updateResponse = await fetch('/api/update-staff-credentials', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            staffId,
                            newStaffId,
                            newName,
                            newPassword,
                            newPhone,
                            newEmail,
                            securityQuestion: newSecurityQuestion,
                            securityAnswer: newSecurityAnswer
                        })
                    });

                    const updateResult = await updateResponse.json();
                    console.log('Response from /api/update-staff-credentials:', updateResult);

                    if (updateResult.success) {
                        showMessageModal(translations[currentLang]['updateCredentials'], translations[currentLang]['credentialsUpdated']);
                        setTimeout(() => {
                            // Redirect to dashboard after successful update
                            window.location.href = updateResult.redirect || '/staff-dashboard';
                        }, 1000);
                    } else {
                        showMessageModal(translations[currentLang]['close'], updateResult.message || translations[currentLang]['staffIdExists']);
                    }
                } catch (error) {
                    console.error('Error updating credentials:', error);
                    showMessageModal(translations[currentLang]['close'], translations[currentLang]['serverError']);
                }
            });

            // Forgot Password Logic
            let forgotStaffId = '';
            const forgotStep1 = document.getElementById('forgotStep1');
            const forgotStep2 = document.getElementById('forgotStep2');
            const forgotStep3 = document.getElementById('forgotStep3');
            const forgotStaffIdInput = document.getElementById('forgotStaffId');
            const securityQuestionDisplay = document.getElementById('securityQuestionDisplay');
            const forgotSecurityAnswerInput = document.getElementById('forgotSecurityAnswer');
            const newForgotPasswordInput = document.getElementById('newForgotPasswordInput');
            const confirmForgotPasswordInput = document.getElementById('confirmForgotPasswordInput');

            // Step 1: Verify Staff ID
            document.getElementById('forgotNextBtn').addEventListener('click', async () => {
                forgotStaffId = forgotStaffIdInput.value.trim();
                if (!forgotStaffId) {
                    showMessageModal(translations[currentLang]['close'], translations[currentLang]['staffIdLabel'] + ' ' + translations[currentLang]['allFieldsRequired']);
                    return;
                }

                console.log('Sending to /api/staff/forgot-password/verify-staff-id:', { staff_id: forgotStaffId });

                try {
                    const response = await fetch('/api/staff/forgot-password/verify-staff-id', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ staff_id: forgotStaffId })
                    });

                    const result = await response.json();
                    console.log('Response from /api/staff/forgot-password/verify-staff-id:', result);
                    if (result.success) {
                        securityQuestionDisplay.textContent = result.securityQuestion || translations[currentLang]['securityQuestion'] + ' not set';
                        forgotStep1.style.display = 'none';
                        forgotStep2.style.display = 'block';
                        forgotSecurityAnswerInput.focus();
                    } else {
                        showMessageModal(translations[currentLang]['close'], result.message || translations[currentLang]['staffIdNotFound']);
                    }
                } catch (error) {
                    console.error('Error verifying staff ID:', error);
                    showMessageModal(translations[currentLang]['close'], translations[currentLang]['serverError']);
                }
            });

            // Step 2: Verify Security Answer
            document.getElementById('forgotVerifyBtn').addEventListener('click', async () => {
                const securityAnswer = forgotSecurityAnswerInput.value.trim();
                if (!securityAnswer) {
                    showMessageModal(translations[currentLang]['close'], translations[currentLang]['securityAnswer'] + ' ' + translations[currentLang]['allFieldsRequired']);
                    return;
                }

                console.log('Sending to /api/staff/forgot-password/verify-answer:', { staff_id: forgotStaffId, securityAnswer });

                try {
                    const response = await fetch('/api/staff/forgot-password/verify-answer', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ staff_id: forgotStaffId, securityAnswer })
                    });

                    const result = await response.json();
                    console.log('Response from /api/staff/forgot-password/verify-answer:', result);
                    if (result.success) {
                        forgotStep2.style.display = 'none';
                        forgotStep3.style.display = 'block';
                        newForgotPasswordInput.focus();
                    } else {
                        showMessageModal(translations[currentLang]['close'], result.message || translations[currentLang]['wrongAnswer']);
                    }
                } catch (error) {
                    console.error('Error verifying security answer:', error);
                    showMessageModal(translations[currentLang]['close'], translations[currentLang]['serverError']);
                }
            });

            // Step 3: Reset Password (FIXED)
            document.getElementById('forgotResetBtn').addEventListener('click', async () => {
                const forgotStep3Form = document.getElementById('forgotStep3');
                // Manually check validity based on minlength=6 from HTML
                if (!forgotStep3Form.checkValidity()) {
                    forgotStep3Form.classList.add('was-validated');
                    return;
                }

                const newPassword = newForgotPasswordInput.value.trim();
                const confirmPassword = confirmForgotPasswordInput.value.trim();
                
                if (newPassword !== confirmPassword) {
                    showMessageModal(translations[currentLang]['close'], translations[currentLang]['passwordMismatch']);
                    return;
                }
                
                if (newPassword.length < 6) {
                    showMessageModal(translations[currentLang]['close'], "New password must be at least 6 characters long.");
                    return;
                }

                console.log('Sending to /api/staff/forgot-password/reset-password:', { staff_id: forgotStaffId, newPassword: '***' });

                try {
                    const response = await fetch('/api/staff/forgot-password/reset-password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ staff_id: forgotStaffId, newPassword })
                    });

                    const result = await response.json();
                    console.log('Response from /api/staff/forgot-password/reset-password:', result);
                    
                    if (result.success) {
                        showMessageModal(translations[currentLang]['close'], translations[currentLang]['passwordResetSuccess']);
                        forgotPasswordModal.hide();
                        // FIX for Point 2: Redirect to staff-login after successful message display
                        setTimeout(() => {
                            window.location.href = result.redirect || '/staff-login';
                        }, 2000);
                    } else {
                        showMessageModal(translations[currentLang]['close'], result.message || translations[currentLang]['serverError']);
                    }
                } catch (error) {
                    console.error('Error resetting password:', error);
                    showMessageModal(translations[currentLang]['close'], translations[currentLang]['serverError']);
                }
            });

            // Reset modal state when hidden
            document.getElementById('forgotPasswordModal').addEventListener('hidden.bs.modal', () => {
                forgotStep1.style.display = 'block';
                forgotStep2.style.display = 'none';
                forgotStep3.style.display = 'none';
                forgotStaffIdInput.value = '';
                forgotSecurityAnswerInput.value = '';
                newForgotPasswordInput.value = '';
                confirmForgotPasswordInput.value = '';
                forgotStaffId = '';
                document.getElementById('forgotStep3').classList.remove('was-validated');
            });

            // Language toggle
            document.getElementById('langToggle').addEventListener('click', () => {
                currentLang = currentLang === 'en' ? 'ar' : 'en';
                translatePage(currentLang);
            });
        });

      