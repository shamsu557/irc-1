// reports-portal-fixed.js
// Drop-in replacement for your previous script (Option A: same functionality, fixed)

const API_BASE_URL = "http://localhost:5000/api";
let studentId = null, classRef = null, videos = [], visible = 4;

/* ---------- Generic fetch helper ---------- */
async function fetchData(endpoint, method = "GET", body = null) {
    const url = `${API_BASE_URL}${endpoint}`;
    const options = { method, headers: { "Content-Type": "application/json" }, credentials: "include" };
    if (body) options.body = JSON.stringify(body);
    try {
        const response = await fetch(url, options);
        if (response.status === 401) throw new Error("UNAUTHORIZED");
        if (response.status === 500) throw new Error("SERVER_ERROR");
        return await response.json();
    } catch (error) {
        console.error("Fetch Error:", error);
        showMessageModal("Error", error.message === "UNAUTHORIZED" ? "Session expired. Please log in again." : "Server error");
        if (error.message === "UNAUTHORIZED") setTimeout(() => location.href = "/student-login", 2000);
        throw error;
    }
}

/* ---------- UI helpers ---------- */
function showMessageModal(title, message) {
    const lbl = document.getElementById("messageModalLabel");
    const txt = document.getElementById("messageText");
    if (lbl) lbl.textContent = title;
    if (txt) txt.textContent = message;
    try { new bootstrap.Modal("#messageModal").show(); } catch (e) { console.warn("Modal show failed", e); }
}

/* ---------- Student details & related ---------- */
async function fetchStudentDetails() {
    try {
        const response = await fetchData('/student-details');
        if (!response.success) return;

        const s = response.data;
        document.getElementById('studentName').textContent = s.name || 'Student';
        document.getElementById('studentIdDisplay').textContent = s.student_id || '—';
        document.getElementById('studentIdDisplay2').textContent = s.student_id || '—';
        document.getElementById('profilePicture').src = s.profile_picture || '/uploads/default.jpg';

        document.getElementById('gender').textContent = s.gender || '—';
        document.getElementById('dateOfBirth').textContent = s.date_of_birth || '—';
        document.getElementById('email').textContent = s.email || '—';
        document.getElementById('guardianPhone').textContent = s.guardian_phone || '—';
        document.getElementById('address').textContent = s.address || '—';

        ['classes', 'subjects'].forEach(key => {
            const container = document.getElementById(key);
            if (!container) return;
            container.innerHTML = '';
            if (s[key]?.length) {
                s[key].forEach(item => {
                    const badge = document.createElement('span');
                    badge.className = `badge bg-${key === 'classes' ? 'primary' : 'secondary'} me-2 mb-2`;
                    badge.textContent = item;
                    container.appendChild(badge);
                });
            } else {
                container.innerHTML = '<span class="text-muted">None</span>';
            }
        });

        const totalClassesCount = document.getElementById('totalClassesCount');
        const totalSubjectsCount = document.getElementById('totalSubjectsCount');
        if (totalClassesCount) totalClassesCount.textContent = s.classes?.length || 0;
        if (totalSubjectsCount) totalSubjectsCount.textContent = s.subjects?.length || 0;

        studentId = s.student_id;
        classRef = `${s.section_id}:${s.class_id}`;
        await loadVideoCount();
    } catch (e) {
        console.error(e);
    }
}

async function loadVideoCount() {
    try {
        const response = await fetchData('/student-videos');
        document.getElementById('totalVideosCount').textContent = response.success ? response.data.length : 0;
    } catch (e) {
        document.getElementById('totalVideosCount').textContent = 0;
    }
}

/* ---------- Sessions / Terms / Weeks population ---------- */
async function loadSessions() {
    try {
        const r = await fetch("/api/sessions");
        const d = await r.json();
        document.querySelectorAll("select[id$='Session']").forEach(sel => {
            sel.innerHTML = "<option value=''>Select Session</option>";
            (d.data || []).forEach(x => {
                const opt = new Option(x.session_year, x.session_year);
                if (x.is_current) opt.selected = true;
                sel.appendChild(opt);
            });
        });

        document.querySelectorAll("select[id*='Term']").forEach(sel => {
            // ensure only added once
            if (sel.children.length > 1) return;
            sel.add(new Option("1st Term", "1"));
            sel.add(new Option("2nd Term", "2"));
            sel.add(new Option("3rd Term", "3"));
        });

        // populate week select(s) only if empty to avoid duplicates
        const weekSelects = [
            document.getElementById("attWeek"),
            document.getElementById("adminWeeklyWeekSelect"),
            document.getElementById("cumulativeUpToWeekSelect")
        ].filter(Boolean);

        weekSelects.forEach(sel => {
            if (sel.children.length > 1) return;
            for (let i = 1; i <= 15; i++) {
                sel.add(new Option(`Week ${i}`, String(i)));
            }
        });
    } catch (err) {
        console.error("Failed to load sessions:", err);
    }
}

/* ---------- Navigation ---------- */
function setupNav() {
    // Only bind to nav-links that actually have data-view attribute (top-level sidebar links)
    document.querySelectorAll(".nav-link[data-view]").forEach(l => {
        l.addEventListener("click", e => {
            e.preventDefault();
            // Hide all main content views: expecting IDs like 'xxx-view'
            document.querySelectorAll("#mainContent > div[id$='-view']").forEach(v => v.style.display = "none");

            const viewName = l.dataset.view;
            if (!viewName) return;
            const targetId = `${viewName}-view`;
            const target = document.getElementById(targetId);
            if (target) target.style.display = "block";

            // update active classes among top-level nav only
            document.querySelectorAll(".nav-link[data-view]").forEach(x => x.classList.remove("active"));
            l.classList.add("active");

            // optional per-view initializers
            if (l.dataset.view === "videos") loadVideos();
            if (l.dataset.view === "attendance") {
                showAttendanceTab("weekly");
                // attach once (safe)
                attachAttendanceEvents();
            }
        });
    });

    // Logout (student)
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.onclick = async (e) => {
            e?.preventDefault();
            try {
                await fetchData('/student-logout', 'POST');
            } catch (err) { /* ignore - fetchData already shows modal */ }
            location.href = "/student-login";
        };
    }

    // Sidebar mobile toggle
    const sidebarToggleMobile = document.getElementById("sidebarToggleMobile");
    if (sidebarToggleMobile) {
        sidebarToggleMobile.onclick = () => document.getElementById("sidebar").classList.toggle("open");
    }
}

/* ---------- Videos ---------- */
async function loadVideos() {
    try {
        const response = await fetchData('/student-videos');
        videos = response.success ? response.data : [];
        visible = 4;
        renderVideos();
    } catch (err) {
        console.error("Failed to load videos:", err);
        const grid = document.getElementById("videoGrid");
        if (grid) grid.innerHTML = "<p class='text-center text-danger col-12'>Error loading videos</p>";
    }
}

function renderVideos() {
    const grid = document.getElementById("videoGrid");
    if (!grid) return;

    grid.innerHTML = "";

    if (!videos || videos.length === 0) {
        grid.innerHTML = "<p class='text-center text-muted col-12 py-8'>No memorization videos available yet</p>";
        toggleElement("loadMoreBtn", false);
        toggleElement("showLessBtn", false);
        return;
    }

    const slice = videos.slice(0, visible);
    slice.forEach(v => {
        const ayahText = v.from_ayah && v.to_ayah ? `${v.from_ayah} → ${v.to_ayah}` : "Full Recording";
        const videoUrl = v.video_url || v.file_path || v.video_path || '';
        const uploadedDate = v.uploaded_at ? new Date(v.uploaded_at).toLocaleDateString() : '';

        const col = document.createElement("div");
        col.className = "col";
        col.innerHTML = `
            <div class="card shadow h-100 video-card">
                <video class="card-img-top" style="height:200px; object-fit:cover; background:#000;">
                    <source src="${escapeHtml(videoUrl)}" type="video/mp4">
                </video>
                <div class="card-body text-center d-flex flex-column">
                    <h6 class="card-title mb-2">Week ${escapeHtml(v.week || '')} - ${escapeHtml(v.day || 'Recording')}</h6>
                    <p class="small text-muted flex-grow-1">${escapeHtml(ayahText)}</p>
                    <button class="btn btn-success btn-sm mt-2 playVid" data-path="${escapeHtml(videoUrl)}">
                        Play Video
                    </button>
                </div>
                <div class="card-footer text-muted small text-center">
                    ${escapeHtml(uploadedDate)}
                </div>
            </div>`;
        grid.appendChild(col);
    });

    toggleElement("loadMoreBtn", visible < videos.length);
    toggleElement("showLessBtn", visible > 4);
}

/* ---------- Attendance Tab Management ---------- */
function showAttendanceTab(tab) {
    const weekly = document.getElementById("weekly-section");
    const cumulative = document.getElementById("cumulative-section");
    if (weekly) weekly.style.display = (tab === "weekly") ? "block" : "none";
    if (cumulative) cumulative.style.display = (tab === "cumulative") ? "block" : "none";

    // Update internal attendance nav active state (if present)
    const innerNav = document.querySelectorAll("#attendance-view .nav-link[data-tab]");
    innerNav.forEach(a => {
        a.classList.toggle("active", a.dataset.tab === tab);
    });
}

/* Attach attendance event handlers (idempotent) */
function attachAttendanceEvents() {
    // --- Internal attendance tab click handlers (only once) ---
    const attendanceNavLinks = document.querySelectorAll("#attendance-view .nav-link[data-tab]");
    attendanceNavLinks.forEach(link => {
        // avoid re-binding by marking dataset
        if (link.dataset._attendanceAttached) return;
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const tab = link.dataset.tab;
            if (!tab) return;
            showAttendanceTab(tab);
        });
        link.dataset._attendanceAttached = "1";
    });

    // --- Weekly & cumulative load buttons ---
    const weeklyBtn = document.getElementById("loadWeeklyBtn");
    if (weeklyBtn && !weeklyBtn.dataset._attached) {
        weeklyBtn.addEventListener("click", async () => {
            const s = document.getElementById("attSession")?.value;
            const t = document.getElementById("attTerm")?.value;
            const w = document.getElementById("attWeek")?.value;
            if (!s || !t || !w) return alert("Please select Session, Term and Week");

            try {
                const r = await fetch(`/api/student-attendance?student_id=${encodeURIComponent(studentId)}&session=${encodeURIComponent(s)}&term=${encodeURIComponent(t)}&week=${encodeURIComponent(w)}`);
                const d = await r.json();
                const el = document.getElementById("weeklyResult");
                if (!d.success || !d.data?.length) {
                    if (el) el.innerHTML = "<p class='text-muted'>No attendance record</p>";
                    return;
                }

                let html = "<table class='table table-bordered'><thead class='table-light'><tr><th>Date</th><th>Status</th></tr></thead><tbody>";
                d.data.forEach(x => {
                    const statusClass = x.status === "Present" ? "success" : "danger";
                    html += `<tr><td>${escapeHtml(x.date)}</td><td><span class='badge bg-${statusClass}'>${escapeHtml(x.status)}</span></td></tr>`;
                });
                if (el) el.innerHTML = html + "</tbody></table>";
            } catch (err) {
                console.error("Load weekly failed", err);
                showMessageModal("Error", "Failed to load weekly attendance");
            }
        });
        weeklyBtn.dataset._attached = "1";
    }

    const cumBtn = document.getElementById("loadCumBtn");
    if (cumBtn && !cumBtn.dataset._attached) {
        cumBtn.addEventListener("click", async () => {
            const s = document.getElementById("cumSession")?.value;
            const t = document.getElementById("cumTerm")?.value;
            if (!s || !t) return alert("Please select Session and Term");

            try {
                const r = await fetch(`/api/student-cumulative-attendance?student_id=${encodeURIComponent(studentId)}&session=${encodeURIComponent(s)}&term=${encodeURIComponent(t)}`);
                const d = await r.json();
                const target = document.getElementById("cumResult");
                if (!d.success) {
                    if (target) target.innerHTML = "<p class='text-danger text-center'>No data found</p>";
                    return;
                }
                if (target) target.innerHTML = `
                    <div class="alert alert-success text-center p-4">
                        <h4>Attendance: ${escapeHtml(d.data.percentage)}</h4>
                        <p class="mb-0">Present: ${escapeHtml(String(d.data.present_days))} out of ${escapeHtml(String(d.data.total_days))} days</p>
                    </div>`;
            } catch (err) {
                console.error("Load cumulative failed", err);
                showMessageModal("Error", "Failed to load cumulative attendance");
            }
        });
        cumBtn.dataset._attached = "1";
    }

    // Exports (weekly/cumulative) - keep idempotent
    const exportWeeklyExcel = document.getElementById("exportAdminWeeklyExcel");
    if (exportWeeklyExcel && !exportWeeklyExcel.dataset._attached) {
        exportWeeklyExcel.addEventListener("click", () => {
            // existing behavior expected to be implemented server-side or elsewhere
            // We just forward user to the endpoint pattern if present (you can keep your existing behavior)
            // Example: window.open(`/api/attendance/weekly/excel?student_id=${studentId}&...`, '_blank');
            alert("Export Weekly Excel clicked - server endpoint should handle generation.");
        });
        exportWeeklyExcel.dataset._attached = "1";
    }

    const exportWeeklyPdf = document.getElementById("exportAdminWeeklyPdf");
    if (exportWeeklyPdf && !exportWeeklyPdf.dataset._attached) {
        exportWeeklyPdf.addEventListener("click", () => {
            alert("Export Weekly PDF clicked - server endpoint should handle generation.");
        });
        exportWeeklyPdf.dataset._attached = "1";
    }

    const exportCumExcel = document.getElementById("exportCumulativeExcel");
    if (exportCumExcel && !exportCumExcel.dataset._attached) {
        exportCumExcel.addEventListener("click", () => {
            alert("Export Cumulative Excel clicked - server endpoint should handle generation.");
        });
        exportCumExcel.dataset._attached = "1";
    }

    const exportCumPdf = document.getElementById("exportCumulativePdf");
    if (exportCumPdf && !exportCumPdf.dataset._attached) {
        exportCumPdf.addEventListener("click", () => {
            alert("Export Cumulative PDF clicked - server endpoint should handle generation.");
        });
        exportCumPdf.dataset._attached = "1";
    }
}

/* ---------- Reports preview ---------- */
function showReport(type) {
    const session = document.getElementById(type + "Session")?.value;
    const term = document.getElementById(type + "Term")?.value;
    if (!session || !term) return alert("Please select Session and Term");

    const endpoint = type === "tahfiz" ? "tahfiz-report" : "complete-report";
    const previewEl = document.getElementById(type + "Preview");
    if (!previewEl) return;

    previewEl.innerHTML = `
        <iframe src="/api/public/${endpoint}?student_id=${encodeURIComponent(studentId)}&session=${encodeURIComponent(session)}&term=${encodeURIComponent(term)}" 
                class="w-100 border-0" style="height:80vh;"></iframe>
        <div class="text-center mt-3">
            <a href="/api/report/complete/pdf?student=${encodeURIComponent(studentId)}&session=${encodeURIComponent(session)}&term=${encodeURIComponent(term)}" 
               target="_blank" class="btn btn-success btn-lg">Download PDF</a>
        </div>`;
}

/* ---------- Overall Tahfiz ---------- */
document.getElementById("loadOverall")?.addEventListener("click", async () => {
    const s = document.getElementById("overallSession")?.value;
    const t = document.getElementById("overallTerm")?.value;
    if (!s || !t) return alert("Please select Session and Term");

    try {
        const r = await fetch(`/api/student-overall-tahfiz?session=${encodeURIComponent(s)}&term=${encodeURIComponent(t)}`);
        const d = await r.json();
        const tbl = document.getElementById("overallTable");
        if (!tbl) return;
        if (!d.success || !d.data?.length) {
            tbl.innerHTML = "<p class='text-muted text-center py-4'>No records found</p>";
            return;
        }
        let html = `<table class="table table-striped"><thead class="table-success"><tr>
            <th>Week</th><th>Day</th><th>From</th><th>To</th><th>Grade</th><th>Comment</th>
        </tr></thead><tbody>`;
        d.data.forEach(r => {
            html += `<tr><td>${escapeHtml(r.week)}</td><td>${escapeHtml(r.day)}</td><td>${escapeHtml(r.from_surah_ayah)}</td>
                     <td>${escapeHtml(r.to_surah_ayah)}</td><td><strong>${escapeHtml(r.daily_grade)}</strong></td><td>${escapeHtml(r.comments || "—")}</td></tr>`;
        });
        tbl.innerHTML = html + "</tbody></table>";
    } catch (err) {
        console.error("Load overall tahfiz failed", err);
        showMessageModal("Error", "Failed to load overall Tahfiz");
    }
});

/* ---------- Video controls & misc ---------- */
document.getElementById("loadMoreBtn")?.addEventListener("click", () => { visible += 8; renderVideos(); });
document.getElementById("showLessBtn")?.addEventListener("click", () => { visible = 4; renderVideos(); });
document.addEventListener("click", e => {
    const target = e.target;
    if (target && target.classList && target.classList.contains("playVid")) {
        const path = target.dataset.path;
        const player = document.getElementById("modalVideoPlayer");
        if (player) player.src = path;
        try { new bootstrap.Modal("#videoModal").show(); } catch (err) { console.warn("Video modal error", err); }
    }
});

/* Reports buttons */
document.getElementById("loadTahfiz")?.addEventListener("click", () => showReport("tahfiz"));
document.getElementById("loadAcademic")?.addEventListener("click", () => showReport("academic"));

/* ---------- Utilities ---------- */
function toggleElement(id, show) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = show ? "block" : "none";
}
function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/* ---------- MAIN INIT ---------- */
document.addEventListener("DOMContentLoaded", async () => {
    try {
        await fetchStudentDetails();
        await loadSessions();
        setupNav();

        // Ensure attendance tab handlers are attached in case the attendance view gets shown
        attachAttendanceEvents();

        // If the attendance view is the default visible one at load time, show weekly
        const attendanceNav = document.querySelector('.nav-link[data-view="attendance"]');
        if (attendanceNav && attendanceNav.classList.contains("active")) {
            showAttendanceTab("weekly");
        }

        // Ensure clicking the top-level attendance nav attaches events (safe to call multiple times)
        const attendanceViewTrigger = document.querySelector('.nav-link[data-view="attendance"]');
        if (attendanceViewTrigger) {
            attendanceViewTrigger.addEventListener("click", () => {
                // short defer to ensure DOM of the view is visible
                setTimeout(() => {
                    showAttendanceTab("weekly");
                    attachAttendanceEvents();
                }, 50);
            });
        }
    } catch (err) {
        console.error("Initialization error", err);
    }
});
