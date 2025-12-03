// student_dashboard.js - FINAL PERFECT VERSION (NO AUTO-PLAY + BETTER ATTENDANCE DISPLAY)
let visibleVideos = 2;
const API_BASE_URL = "http://localhost:5000/api";
let studentId = null, classRef = null, videos = [], currentVideoIndex = -1;

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

function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
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
    } catch (e) { console.error(e); }
}

async function loadVideoCount() {
    try {
        const response = await fetchData('/student-videos');
        document.getElementById('totalVideosCount').textContent = response.success ? response.data.length : 0;
    } catch (e) {
        document.getElementById('totalVideosCount').textContent = 0;
    }
}

/* ---------- Sessions / Terms population ---------- */
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
            if (sel.children.length > 1) return;
            sel.add(new Option("1st Term", "1"));
            sel.add(new Option("2nd Term", "2"));
            sel.add(new Option("3rd Term", "3"));
        });
    } catch (err) {
        console.error("Failed to load sessions:", err);
    }
}

/* ---------- Navigation ---------- */
function setupNav() {
    document.querySelectorAll(".nav-link[data-view]").forEach(l => {
        l.addEventListener("click", e => {
            e.preventDefault();
            document.querySelectorAll("#mainContent > div[id$='-view']").forEach(v => v.style.display = "none");
            const targetId = `${l.dataset.view}-view`;
            const target = document.getElementById(targetId);
            if (target) target.style.display = "block";
            document.querySelectorAll(".nav-link[data-view]").forEach(x => x.classList.remove("active"));
            l.classList.add("active");
            if (l.dataset.view === "videos") loadVideos();
        });
    });

    document.getElementById("logoutBtn")?.addEventListener("click", async () => {
        try { await fetchData('/student-logout', 'POST'); } catch (err) {}
        location.href = "/student-login";
    });

    document.getElementById("sidebarToggleMobile")?.addEventListener("click", () => {
        document.getElementById("sidebar").classList.toggle("open");
    });
}

/* ---------- VIDEO PLAYER CONTROLS ---------- */
const videoPlayer = document.getElementById("mainVideoPlayer");
const playPauseBtn = document.getElementById("playPauseBtn");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const progressBar = document.getElementById("progressBar");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");
const volumeSlider = document.getElementById("volumeSlider");
const muteBtn = document.getElementById("muteBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const videoTitle = document.getElementById("videoTitle");

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function playVideo(index) {
    if (index < 0 || index >= videos.length) return;
    currentVideoIndex = index;
    const v = videos[index];
    const url = v.video_url || v.file_path || v.video_path || '';

    videoPlayer.src = url;
    // DO NOT auto-play → wait for user to click Play
    videoPlayer.pause();
    playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';

    const ayahText = v.from_ayah && v.to_ayah ? ` (${v.from_ayah} → ${v.to_ayah})` : "";
    videoTitle.textContent = `Week ${v.week || '?'} - ${v.day || 'Recording'}${ayahText}`;

    document.querySelectorAll(".video-card").forEach((card, i) => {
        card.style.border = i === index ? "4px solid #34a853" : "1px solid #ddd";
        card.style.boxShadow = i === index ? "0 0 15px rgba(52,168,83,0.6)" : "none";
    });
}

function togglePlayPause() {
    if (videoPlayer.paused || videoPlayer.ended) {
        videoPlayer.play();
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    } else {
        videoPlayer.pause();
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
}

// Controls
prevBtn.onclick = () => playVideo(Math.max(0, currentVideoIndex - 1));
nextBtn.onclick = () => playVideo(Math.min(videos.length - 1, currentVideoIndex + 1));
playPauseBtn.onclick = togglePlayPause;
fullscreenBtn.onclick = () => videoPlayer.requestFullscreen?.() || videoPlayer.webkitEnterFullscreen?.();

muteBtn.onclick = () => {
    videoPlayer.muted = !videoPlayer.muted;
    muteBtn.innerHTML = videoPlayer.muted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
};
volumeSlider.oninput = () => videoPlayer.volume = volumeSlider.value;

// Progress & Time
videoPlayer.ontimeupdate = () => {
    if (videoPlayer.duration) {
        const percent = (videoPlayer.currentTime / videoPlayer.duration) * 100;
        progressBar.style.width = percent + "%";
        currentTimeEl.textContent = formatTime(videoPlayer.currentTime);
    }
};
videoPlayer.onloadedmetadata = () => {
    durationEl.textContent = formatTime(videoPlayer.duration);
};
videoPlayer.onended = () => {
    playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    if (currentVideoIndex < videos.length - 1) {
        playVideo(currentVideoIndex + 1);
    }
};

/* ---------- LOAD & RENDER VIDEOS WITH LOAD MORE / SHOW LESS ---------- */
async function loadVideos() {
    try {
        const response = await fetchData('/student-videos');
        videos = response.success ? response.data : [];
        document.getElementById('totalVideosCount').textContent = videos.length;
        visibleVideos = 2;
        renderVideos();
        // DO NOT auto-play first video
        if (videos.length > 0) {
            playVideo(0); // Just loads first video but does NOT play
            videoTitle.textContent = "Click Play to start";
        }
    } catch (err) {
        console.error("Failed to load videos:", err);
        document.getElementById("videoGrid").innerHTML = "<p class='text-center text-danger'>Error loading videos</p>";
    }
}

function renderVideos() {
    const grid = document.getElementById("videoGrid");
    grid.innerHTML = "";

    if (!videos.length) {
        grid.innerHTML = "<p class='text-center text-muted col-12 py-8'>No memorization videos available yet</p>";
        document.getElementById("loadMoreBtn").style.display = "none";
        document.getElementById("showLessBtn").style.display = "none";
        return;
    }

    const videosToShow = videos.slice(0, visibleVideos);

    videosToShow.forEach((v, i) => {
        const ayahText = v.from_ayah && v.to_ayah ? `${v.from_ayah} → ${v.to_ayah}` : "Full Recording";
        const videoUrl = v.video_url || v.file_path || v.video_path || '';
        const date = v.uploaded_at ? new Date(v.uploaded_at).toLocaleDateString() : '';

        const col = document.createElement("div");
        col.className = "col video-card";
        col.style.cursor = "pointer";
        col.style.border = i === currentVideoIndex ? "4px solid #34a853" : "1px solid #ddd";
        col.onclick = () => playVideo(i);

        col.innerHTML = `
            <div class="card shadow h-100">
                <video class="card-img-top" style="height:180px; object-fit:cover; background:#000;">
                    <source src="${escapeHtml(videoUrl)}" type="video/mp4">
                </video>
                <div class="card-body text-center">
                    <h6 class="card-title mb-1">Week ${escapeHtml(v.week || '?')} - ${escapeHtml(v.day || 'Recording')}</h6>
                    <p class="small text-muted mb-2">${escapeHtml(ayahText)}</p>
                    <button class="btn btn-success btn-sm">Play Now</button>
                </div>
                <div class="card-footer text-muted small">${date}</div>
            </div>`;
        grid.appendChild(col);
    });

    // Button visibility
    const loadMoreBtn = document.getElementById("loadMoreBtn");
    const showLessBtn = document.getElementById("showLessBtn");

    loadMoreBtn.style.display = visibleVideos < videos.length ? "inline-block" : "none";
    showLessBtn.style.display = visibleVideos > 2 ? "inline-block" : "none";
}

// Load More / Show Less Buttons
document.getElementById("loadMoreBtn")?.addEventListener("click", () => {
    visibleVideos += 8;
    renderVideos();
    document.getElementById("videoGrid").scrollIntoView({ behavior: "smooth" });
});

document.getElementById("showLessBtn")?.addEventListener("click", () => {
    visibleVideos = 2;
    renderVideos();
    document.querySelector(".video-player-container").scrollIntoView({ behavior: "smooth" });
});

/* ---------- CUMULATIVE ATTENDANCE — NOW SHOWS CORRECT % ---------- */
document.getElementById("loadCumBtn")?.addEventListener("click", async () => {
    const s = document.getElementById("cumSession")?.value;
    const t = document.getElementById("cumTerm")?.value;
    if (!s || !t) return alert("Please select Session and Term");

    try {
        const r = await fetch(`/api/student-cumulative-attendance?student_id=${encodeURIComponent(studentId)}&session=${encodeURIComponent(s)}&term=${encodeURIComponent(t)}`);
        const d = await r.json();
        const target = document.getElementById("cumResult");

        if (!d.success || !d.data) {
            target.innerHTML = "<p class='text-danger text-center'>No attendance record found</p>";
            return;
        }

        // FIX: Calculate percentage properly if backend sends raw numbers
        let percentage = "0%";
        if (d.data.percentage) {
            percentage = d.data.percentage; // Already a string like "85%"
        } else if (d.data.present_days != null && d.data.total_days > 0) {
            percentage = Math.round((d.data.present_days / d.data.total_days) * 100) + "%";
        }

        target.innerHTML = `
            <div class="text-center p-5 bg-light rounded shadow-lg border border-success">
                <h1 class="display-2 fw-bold text-success mb-3">${percentage}</h1>
                <p class="lead text-muted mb-0">
                    <strong>${d.data.present_days || 0}</strong> Present out of <strong>${d.data.total_days || 0}</strong> days
                </p>
            </div>`;
    } catch (err) {
        console.error("Load cumulative failed", err);
        showMessageModal("Error", "Failed to load attendance");
    }
});
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
                class="w-100 border-0 rounded" style="height:80vh;"></iframe>
        <div class="text-center mt-3">
            <a href="/api/report/complete/pdf?student=${encodeURIComponent(studentId)}&session=${encodeURIComponent(session)}&term=${encodeURIComponent(term)}" 
               target="_blank" class="btn btn-success btn-lg">Download PDF</a>
        </div>`;
}

document.getElementById("loadTahfiz")?.addEventListener("click", () => showReport("tahfiz"));
document.getElementById("loadAcademic")?.addEventListener("click", () => showReport("academic"));

/* ---------- MAIN INIT ---------- */
document.addEventListener("DOMContentLoaded", async () => {
    try {
        await fetchStudentDetails();
        await loadSessions();
        setupNav();
    } catch (err) {
        console.error("Initialization error", err);
    }
});