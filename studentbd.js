// student_dashboard.js - FIXED & PERFECT (Global Class Selector + Auto-Refresh Reports)
// All original features preserved | Class switching works instantly | No errors

let visibleVideos = 2;                    // ← Only 2 videos at start
let studentId = null;
let classRef = null;                      // format: sectionId:classId
let videos = [];
let currentVideoIndex = -1;
let currentTahfizData = null;
let currentCompleteReportData = null;
let allClasses = [];           // Will store [{section_id, class_id, class_name}, ...]
let selectedClassRef = null;   // "1:JS1" or "2:Primary 4" etc.
let classSelectModal = null;

const termMap = { "1": "1st", "2": "2nd", "3": "3rd" };

const schoolInfo = {
  name: "Ibadurrahman College",
  address: "No. 1968 A, Gwammaja Housing Estate, Audu Wawu Street, opp. Ihya'ussunnah Juma'a Mosque, Dala L.G.A, Kano State, Nigeria.",
  phone: "08033459721, 09062171496",
  email: "info@irc.com.ng",
  logoSrc: "assets/images/logo.jpeg",
  director: "Sadiku Muhammad Ahmad"
};

const dailyGradeComments = { A: "Excellent", B: "Very good", C: "Good", D: "Pass", E: "Fair", F: "Fail" };
const finalGradeComments = {
  A: "Excellent performance", B: "Very good performance", C: "Good performance",
  D: "Pass – Warning", E: "Probation", F: "Fail"
};

/* ==================== UI & HELPER FUNCTIONS ==================== */
function showMessageModal(title, message) {
  document.getElementById("messageModalLabel").textContent = title;
  document.getElementById("messageText").innerHTML = message.replace(/\n/g, "<br>");
  new bootstrap.Modal(document.getElementById("messageModal")).show();
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function processRtlText(text) {
  // Wrap (number) in <span dir="ltr"> to fix bracket rendering
  return text.replace(/:\s*\((\d+)\)/g, ': <span dir="ltr">($1)</span>');
}

/* ==================== NEW: UPDATE SELECTED CLASS DISPLAY ==================== */
function updateSelectedClassDisplay() {
  const displayEls = document.querySelectorAll("#selectedClassDisplay");
  displayEls.forEach(el => {
    if (!el) return;
    if (!classRef || !allClasses.length) {
      el.textContent = "No class selected";
      return;
    }
    const selected = allClasses.find(c => `${c.section_id}:${c.class_id}` === classRef);
    el.textContent = selected ? selected.class_name : "Unknown Class";
  });
}

/* ==================== FETCH STUDENT DETAILS ==================== */
async function fetchStudentDetails() {
  try {
    const res = await fetch("/api/student-details", { credentials: "include" });
    const data = await res.json();
    if (!data.success) throw new Error("Failed to load profile");

    const s = data.data;
    studentId = s.student_id;
    allClasses = s.classes || [];  // Store for later use

    // Expecting classes to be array of objects: { section_id, class_id, class_name }
    // If they exist, set default classRef to first
    if (Array.isArray(s.classes) && s.classes.length > 0) {
      const first = s.classes[0];
      classRef = `${first.section_id}:${first.class_id}`;
    } else {
      classRef = null;
    }

    document.getElementById("studentName").textContent = s.name || "Student";
    document.getElementById("studentIdDisplay").textContent = s.student_id || "—";
    document.getElementById("studentIdDisplay2").textContent = s.student_id || "—";
    document.getElementById("profilePicture").src = s.profile_picture || "/uploads/default.jpg";
    document.getElementById("gender").textContent = s.gender || "—";
    document.getElementById("dateOfBirth").textContent = s.date_of_birth || "—";
    document.getElementById("email").textContent = s.email || "—";
    document.getElementById("guardianPhone").textContent = s.guardian_phone || "—";
    document.getElementById("address").textContent = s.address || "—";

    document.getElementById("totalClassesCount").textContent = s.classes?.length || 0;
    document.getElementById("totalSubjectsCount").textContent = s.subjects?.length || 0;

    // Populate classes and subjects UI
    ["classes", "subjects"].forEach(key => {
      const el = document.getElementById(key);
      if (!el) return;
      el.innerHTML = "";
      (s[key] || []).forEach(item => {
        const badge = document.createElement("span");
        badge.className = `badge bg-${key === "classes" ? "primary" : "secondary"} me-2 mb-2`;
        // classes are objects per Option B: display class_name if object else item
        badge.textContent = (key === "classes" && typeof item === "object") ? (item.class_name || "N/A") : item;
        el.appendChild(badge);
      });
    });

    // === FIXED: Populate GLOBAL class select dropdowns (for Tahfiz & Academic tabs) ===
    const selects = document.querySelectorAll("#reportClassSelect");
    selects.forEach(select => {
      if (!select) return;
      select.innerHTML = "";
      const placeholderOpt = new Option("Select Class for Reports", "");
      select.appendChild(placeholderOpt);

      (s.classes || []).forEach(c => {
        if (typeof c === "object") {
          const opt = new Option(c.class_name || `Class ${c.class_id}`, `${c.section_id}:${c.class_id}`);
          // Select default if matches classRef
          if (classRef && `${c.section_id}:${c.class_id}` === classRef) opt.selected = true;
          select.appendChild(opt);
        } else {
          // fallback if class is string (shouldn't happen per Option B, but safe)
          const opt = new Option(c, c);
          if (classRef === c) opt.selected = true;
          select.appendChild(opt);
        }
      });

      // FIXED: When user changes selection, update classRef + auto-refresh report if active
      select.addEventListener("change", () => {
        const val = select.value;
        classRef = val || null;
        updateSelectedClassDisplay();  // Update banner

        // Auto-refresh if in report tab and session/term selected
        const activeView = document.querySelector(".nav-link.active")?.dataset.view;
        if (activeView === "tahfiz") {
          const sess = document.getElementById("tahfizSession").value;
          const term = document.getElementById("tahfizTerm").value;
          if (sess && term) generateTahfizReport();
        }
        if (activeView === "academic") {
          const sess = document.getElementById("academicSession").value;
          const term = document.getElementById("academicTerm").value;
          if (sess && term) generateCompleteReport();
        }
      });

      // if no explicit selection made and only one class, ensure select picks it
      if (!select.value && select.options.length === 2) {
        select.selectedIndex = 1;
        classRef = select.value;
      }
    });

    // Initial banner update
    updateSelectedClassDisplay();

    await loadVideoCount();
  } catch (err) {
    console.error(err);
    showMessageModal("Error", "Failed to load student profile");
  }
}

async function loadVideoCount() {
  try {
    const res = await fetch("/api/student-videos", { credentials: "include" });
    const data = await res.json();
    document.getElementById("totalVideosCount").textContent = data.success ? data.data.length : 0;
  } catch {
    document.getElementById("totalVideosCount").textContent = 0;
  }
}

/* ==================== SESSIONS & TERMS ==================== */
async function loadSessions() {
  try {
    const res = await fetch("/api/sessions");
    const data = await res.json();

    document.querySelectorAll("select[id$='Session']").forEach(sel => {
      sel.innerHTML = "<option value=''>Select Session</option>";
      (data.data || []).forEach(s => {
        const opt = new Option(s.session_year, s.session_year);
        if (s.is_current) opt.selected = true;
        sel.appendChild(opt);
      });
    });

    document.querySelectorAll("select[id*='Term']").forEach(sel => {
      if (sel.children.length > 1) return;
      sel.innerHTML = "<option value=''>Select Term</option>";
      ["1st Term", "2nd Term", "3rd Term"].forEach((t, i) => {
        sel.add(new Option(t, i + 1));
      });
    });
  } catch (err) {
    console.error("Failed to load sessions", err);
  }
}

/* ==================== FIXED NAVIGATION (Auto-Load Reports on Tab Switch) ==================== */
function setupNav() {
  document.querySelectorAll(".nav-link[data-view]").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      document.querySelectorAll("#mainContent > div[id$='-view']").forEach(v => v.style.display = "none");
      const view = document.getElementById(`${link.dataset.view}-view`);
      if (view) view.style.display = "block";

      document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
      link.classList.add("active");

      if (link.dataset.view === "videos") loadVideos();

      // FIXED: Auto-load report if entering tab and all fields ready
      if (link.dataset.view === "tahfiz") {
        updateSelectedClassDisplay();
        setTimeout(() => {  // Small delay for DOM settle
          const sess = document.getElementById("tahfizSession").value;
          const term = document.getElementById("tahfizTerm").value;
          if (classRef && sess && term) generateTahfizReport();
        }, 150);
      }

      if (link.dataset.view === "academic") {
        updateSelectedClassDisplay();
        setTimeout(() => {
          const sess = document.getElementById("academicSession").value;
          const term = document.getElementById("academicTerm").value;
          if (classRef && sess && term) generateCompleteReport();
        }, 150);
      }
    });
  });

  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await fetch("/api/student-logout", { method: "POST", credentials: "include" });
    location.href = "/student-login";
  });

  document.getElementById("sidebarToggleMobile")?.addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });
}

/* ==================== VIDEO PLAYER ==================== */
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
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function playVideo(index) {
  if (index < 0 || index >= videos.length) return;
  currentVideoIndex = index;
  const v = videos[index];
  videoPlayer.src = v.video_url || v.file_path || "";
  videoPlayer.pause();
  playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';

  const ayah = v.from_ayah && v.to_ayah ? ` (${v.from_ayah} → ${v.to_ayah})` : "";
  videoTitle.textContent = `Week ${v.week || "?"} - ${v.day || "Recording"}${ayah}`;

  document.querySelectorAll(".video-card").forEach((c, i) => {
    c.style.border = i === index ? "4px solid #34a853" : "1px solid #ddd";
    c.style.boxShadow = i === index ? "0 0 15px rgba(52,168,83,0.6)" : "none";
  });
}

playPauseBtn.onclick = () => videoPlayer.paused ? videoPlayer.play() : videoPlayer.pause();
prevBtn.onclick = () => playVideo(Math.max(0, currentVideoIndex - 1));
nextBtn.onclick = () => playVideo(Math.min(videos.length - 1, currentVideoIndex + 1));
fullscreenBtn.onclick = () => videoPlayer.requestFullscreen?.();
muteBtn.onclick = () => {
  videoPlayer.muted = !videoPlayer.muted;
  muteBtn.innerHTML = videoPlayer.muted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
};
volumeSlider.oninput = () => videoPlayer.volume = volumeSlider.value;

videoPlayer.ontimeupdate = () => {
  if (videoPlayer.duration) {
    progressBar.style.width = (videoPlayer.currentTime / videoPlayer.duration) * 100 + "%";
    currentTimeEl.textContent = formatTime(videoPlayer.currentTime);
  }
};
videoPlayer.onloadedmetadata = () => durationEl.textContent = formatTime(videoPlayer.duration);
videoPlayer.onplay = () => playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
videoPlayer.onpause = () => playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';

/* ==================== VIDEOS: ONLY 2 AT START ==================== */
async function loadVideos() {
  try {
    const res = await fetch("/api/student-videos", { credentials: "include" });
    const data = await res.json();
    videos = data.success ? data.data : [];
    visibleVideos = 2;
    renderVideos();
    if (videos.length > 0) playVideo(0);
  } catch (err) {
    document.getElementById("videoGrid").innerHTML = "<p class='text-danger text-center'>Failed to load videos</p>";
  }
}

function renderVideos() {
  const grid = document.getElementById("videoGrid");
  grid.innerHTML = "";
  if (!videos.length) {
    grid.innerHTML = "<p class='text-center text-muted py-8'>No videos available yet</p>";
    return;
  }

  const toShow = videos.slice(0, visibleVideos);
  toShow.forEach((v, i) => {
    const ayah = v.from_ayah && v.to_ayah ? `(${v.from_ayah} → ${v.to_ayah})` : "Full Recording";
    const date = v.uploaded_at ? new Date(v.uploaded_at).toLocaleDateString() : "";
    const card = document.createElement("div");
    card.className = "col video-card";
    card.style.cursor = "pointer";
    card.onclick = () => playVideo(i);
    card.innerHTML = `
      <div class="card shadow h-100">
        <video class="card-img-top" style="height:180px; object-fit:cover; background:#000;">
          <source src="${escapeHtml(v.video_url || v.file_path)}" type="video/mp4">
        </video>
        <div class="card-body text-center">
          <h6 class="card-title mb-1">Week ${v.week || "?"} - ${v.day || "Recording"}</h6>
          <p class="small text-success mb-2">${escapeHtml(ayah)}</p>
          <button class="btn btn-success btn-sm">Play Now</button>
        </div>
        <div class="card-footer text-muted small">${date}</div>
      </div>`;
    grid.appendChild(card);
  });

  const hasMore = visibleVideos < videos.length;
  document.getElementById("loadMoreBtn").style.display = hasMore ? "inline-block" : "none";
  document.getElementById("showLessBtn").style.display = visibleVideos > 2 ? "inline-block" : "none";
}

document.getElementById("loadMoreBtn")?.addEventListener("click", () => {
  visibleVideos = videos.length;  // Show ALL
  renderVideos();
});

document.getElementById("showLessBtn")?.addEventListener("click", () => {
  visibleVideos = 2;
  renderVideos();
  document.getElementById("videos-view")?.scrollIntoView({ behavior: "smooth" });
});

/* ==================== CUMULATIVE ATTENDANCE ==================== */
async function getCumulativeAttendance(session, term) {
  try {
    const res = await fetch(`/api/student-cumulative-attendance?student_id=${studentId}&session=${session}&term=${term}`, { credentials: "include" });
    const json = await res.json();
    if (json.success && json.data) {
      // Normalize field names and compute percentage on frontend to avoid backend 0% issues
      const present = json.data.present_days ?? json.data.total_present ?? json.data.present ?? 0;
      const total = json.data.total_days ?? json.data.total ?? json.data.days ?? 0;

      let percentage = "N/A";
      if (total && total > 0) {
        percentage = ((present / total) * 100).toFixed(2) + "%";
      } else if (json.data.percentage && typeof json.data.percentage === "string" && json.data.percentage.trim()) {
        // fallback to backend percentage if provided and no total days
        percentage = json.data.percentage;
      }

      return {
        percentage,
        present,
        total
      };
    }
    return { percentage: "N/A", present: 0, total: 0 };
  } catch (e) {
    console.error("getCumulativeAttendance error:", e);
    return { percentage: "N/A", present: 0, total: 0 };
  }
}

document.getElementById("loadCumBtn")?.addEventListener("click", async () => {
  const session = document.getElementById("cumSession").value;
  const term = document.getElementById("cumTerm").value;
  if (!session || !term) return showMessageModal("Required", "Please select Session and Term");

  try {
    const attendance = await getCumulativeAttendance(session, term);
    const el = document.getElementById("cumResult");

    if (attendance.total === 0) {
      el.innerHTML = "<p class='text-danger text-center'>No attendance record found</p>";
      return;
    }

    const pct = attendance.percentage;

    el.innerHTML = `
      <div class="text-center p-5 bg-light rounded shadow-lg border border-success">
        <h1 class="display-2 fw-bold text-success mb-3">${pct}</h1>
        <p class="lead"><strong>${attendance.present}</strong> Present / <strong>${attendance.total}</strong> Days</p>
        <small class="text-muted">${session} • ${termMap[term]} Term</small>
      </div>`;
  } catch {
    showMessageModal("Error", "Failed to load attendance");
  }
});

/* ==================== TAHFIZ REPORT – 100% STAFF EXACT ==================== */
async function generateTahfizReport() {
  const session = document.getElementById("tahfizSession").value;
  const term = document.getElementById("tahfizTerm").value;
  if (!session || !term) return showMessageModal("Required", "Please select Session and Term");

  // Ensure a class is selected
  if (!classRef) return showMessageModal("Required", "Please select Class for Reports");

  const body = document.getElementById("tahfizPreviewBody");
  body.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-success" style="width:4rem;height:4rem;"></div><p class="mt-3 fs-4">Generating Tahfiz Report...</p></div>`;
  new bootstrap.Modal(document.getElementById("tahfizPreviewModal")).show();

  try {
    const [sectionId, classId] = classRef.split(":");
    const res = await fetch(`/api/tahfiz-report?student_id=${studentId}&session=${session}&term=${term}&section_id=${sectionId}&class_id=${classId}`, { credentials: "include" });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || "No data");

    const t = json.data;
    currentTahfizData = { ...t, session, term };

    const attendance = await getCumulativeAttendance(session, term);

    const finalGrade = (t.final_grade ?? "F").toUpperCase();
    const rows = (t.daily_records || []).map((r, i) => `
      <tr style="background:${i % 2 === 0 ? '#f8fff9' : 'white'};">
        <td style="padding:12px 10px; border-bottom:1px solid #eee;">${r.week ? "Week " + r.week + " - " : ""}${r.assessed_day || r.day || "N/A"}</td>
        <td style="padding:12px 10px; border-bottom:1px solid #eee; direction:rtl; text-align:right;">${processRtlText(r.from_surah_ayah ?? r.from_ayah ?? "-")}</td>
        <td style="padding:12px 10px; border-bottom:1px solid #eee; direction:rtl; text-align:right;">${processRtlText(r.to_surah_ayah ?? r.to_ayah ?? "-")}</td>
        <td style="padding:12px 10px; border-bottom:1px solid #eee; text-align:center; font-weight:bold; color:#065f46;">${r.daily_grade ?? "-"}</td>
        <td style="padding:12px 10px; border-bottom:1px solid #eee;">${dailyGradeComments[r.daily_grade] ?? "-"}</td>
      </tr>`).join("");

    body.innerHTML = `
      <div id="tahfizPrintArea" style="font-family:Arial,sans-serif; max-width:210mm; margin:0 auto; padding:20px; background:white;">
        <div style="text-align:center; padding:20px 0 30px; border-bottom:4px double #d0e8d8; margin-bottom:30px;">
          <img src="${schoolInfo.logoSrc}" style="width:110px; height:110px; border-radius:50%; border:4px solid #e8f5e9; display:block; margin:0 auto 15px auto;" crossorigin="anonymous">
          <h1 style="margin:0; font-size:32px; font-weight:bold; color:#065f46;">${schoolInfo.name}</h1>
          <p style="margin:8px 0 0; font-size:15px; color:#555;">${schoolInfo.address}<br>Tel: ${schoolInfo.phone}</p>
        </div>
        <h2 style="text-align:center; color:#065f46; font-size:28px; margin:30px 0;">Tahfiz-ul-Qur'an Progress Report</h2>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin:30px 0; font-size:15px;">
          <div style="background:#f0fdfc; padding:14px; border-radius:8px;"><strong>Student:</strong> ${t.full_name || "N/A"}</div>
          <div style="background:#f8f9fa; padding:14px; border-radius:8px;"><strong>Adm No:</strong> ${studentId}</div>
          <div style="background:#f0fdf4; padding:14px; border-radius:8px;"><strong>Class:</strong> ${t.class_name || "N/A"}</div>
          <div style="background:#f8f9fa; padding:14px; border-radius:8px;"><strong>Session:</strong> ${session}</div>
          <div style="background:#f0fdf4; padding:14px; border-radius:8px;"><strong>Term:</strong> ${termMap[term]} Term</div>
          <div style="background:#e8f5e9; padding:14px; border-radius:8px;"><strong>Attendance:</strong> ${attendance.percentage} (${attendance.present}/${attendance.total} days)</div>
          <div style="background:#f0fdf4; padding:14px; border-radius:8px;"><strong>Daily Score:</strong> ${t.daily_score ?? "-"}%</div>
          <div style="background:#f0fdf4; padding:14px; border-radius:8px;"><strong>Exam Score:</strong> ${t.exam_score ?? "-"}%</div>
          <div style="background:#f0fdf4; padding:14px; border-radius:8px;"><strong>Total Score:</strong> ${t.total_score ?? "-"}%</div>
          <div style="background:#e3f2fd; padding:16px; border-radius:10px; text-align:center; font-size:18px; color:#1565c0;"><strong>Final Grade: ${finalGrade}</strong></div>
          <div style="grid-column:1/-1; background:#fffde7; padding:18px; border-radius:10px; border-left:4px solid #fff176;">
            <strong>Comment:</strong> ${finalGradeComments[finalGrade] || "No comment available"}
          </div>
        </div>
        <table style="width:100%; border-collapse:collapse; margin:40px 0;">
          <thead>
            <tr style="background:#e8f5e9; color:#065f46;">
              <th style="padding:15px 12px; text-align:left; font-weight:600;">Week & Day</th>
              <th style="padding:15px 12px; text-align:center; font-weight:600;">From</th>
              <th style="padding:15px 12px; text-align:center; font-weight:600;">To</th>
              <th style="padding:15px 12px; text-align:center; font-weight:600;">Grade</th>
              <th style="padding:15px 12px; text-align:center; font-weight:600;">Comment</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:90px; text-align:center;">
          <div style="display:inline-block; border-top:3px solid #333; padding-top:10px; width:300px;">
            <strong style="font-size:17px;">Sadiku Muhammad Ahmad</strong><br>Director
          </div>
        </div>
      </div>`;
  } catch (err) {
    body.innerHTML = `<div style="color:red; text-align:center; padding:80px; font-size:20px;">${err.message}</div>`;
  }
}

/* ==================== ACADEMIC REPORT – 100% STAFF EXACT ==================== */
async function generateCompleteReport() {
  const session = document.getElementById("academicSession").value;
  const term = document.getElementById("academicTerm").value;
  if (!session || !term) return showMessageModal("Required", "Please select Session and Term");

  // Ensure a class is selected
  if (!classRef) return showMessageModal("Required", "Please select Class for Reports");

  const body = document.getElementById("completeReportPreviewBody");
  body.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary" style="width:4rem;height:4rem;"></div><p class="mt-3 fs-4">Generating Academic Report...</p></div>`;
  new bootstrap.Modal(document.getElementById("completeReportPreviewModal")).show();

  try {
    const [sectionId, classId] = classRef.split(":");
    const res = await fetch(`/api/student-report?student_id=${studentId}&session=${session}&term=${term}&section_id=${sectionId}&class_id=${classId}`, { credentials: "include" });
    const json = await res.json();
    if (!json.success) throw new Error(json.message || "No data");

    const r = json.data;
    currentCompleteReportData = { ...r, session, term };

    const attendance = await getCumulativeAttendance(session, term);

    const subjectRows = (r.subjects || []).map((s, i) => `
      <tr style="background:${i % 2 === 0 ? '#f8fff9' : 'white'};">
        <td style="padding:12px 10px; border-bottom:1px solid #eee;">${s.subject_name}</td>
        <td style="padding:12px 10px; border-bottom:1px solid #eee; text-align:center;">${s.ca1||'-'}</td>
        <td style="padding:12px 10px; border-bottom:1px solid #eee; text-align:center;">${s.ca2||'-'}</td>
        <td style="padding:12px 10px; border-bottom:1px solid #eee; text-align:center;">${s.exam_score||'-'}</td>
        <td style="padding:12px 10px; border-bottom:1px solid #eee; text-align:center; font-weight:bold; color:#065f46;">${(s.total !== undefined && s.total !== null) ? Number(s.total).toFixed(1) : '-'}</td>
        <td style="padding:12px 10px; border-bottom:1px solid #eee; text-align:center; font-weight:bold; color:${s.grade==='A'?'#065f46':s.grade==='F'?'#c62828':'#333'};">${s.grade||'-'}</td>
        <td style="padding:12px 10px; border-bottom:1px solid #eee;">${dailyGradeComments[s.grade] ?? "-"}</td>
      </tr>`).join("");

    body.innerHTML = `
      <div id="completePrintArea" style="font-family:Arial,sans-serif; max-width:210mm; margin:0 auto; padding:20px; background:white;">
        <div style="text-align:center; padding:20px 0 30px; border-bottom:4px double #d0e8d8; margin-bottom:30px;">
          <img src="${schoolInfo.logoSrc}" style="width:110px; height:110px; border-radius:50%; border:4px solid #e8f5e9; display:block; margin:0 auto 15px auto;" crossorigin="anonymous">
          <h1 style="margin:0; font-size:32px; font-weight:bold; color:#065f46;">${schoolInfo.name}</h1>
          <p style="margin:8px 0 0; font-size:15px; color:#555;">${schoolInfo.address}<br>Tel: ${schoolInfo.phone}</p>
        </div>
        <h2 style="text-align:center; color:#065f46; font-size:28px; margin:30px 0;">End of Term Report Sheet</h2>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin:30px 0; font-size:15px;">
          <div style="background:#f0fdf4; padding:14px; border-radius:8px;"><strong>Student:</strong> ${r.full_name}</div>
          <div style="background:#f8f9fa; padding:14px; border-radius:8px;"><strong>Adm No:</strong> ${studentId}</div>
          <div style="background:#f0fdf4; padding:14px; border-radius:8px;"><strong>Class:</strong> ${r.class_name || "N/A"}</div>
          <div style="background:#f8f9fa; padding:14px; border-radius:8px;"><strong>Session:</strong> ${session}</div>
          <div style="background:#f0fdf4; padding:14px; border-radius:8px;"><strong>Term:</strong> ${termMap[term]} Term</div>
          <div style="background:#e8f5e9; padding:14px; border-radius:8px;"><strong>Attendance:</strong> ${attendance.percentage} (${attendance.present}/${attendance.total} days)</div>
        </div>
        <table style="width:100%; border-collapse:collapse; margin:40px 0;">
          <thead>
            <tr style="background:#e8f5e9; color:#065f46;">
              <th style="padding:15px 12px; text-align:left; font-weight:600;">Subject</th>
              <th style="padding:15px 12px; text-align:center; font-weight:600;">CA1</th>
              <th style="padding:15px 12px; text-align:center; font-weight:600;">CA2</th>
              <th style="padding:15px 12px; text-align:center; font-weight:600;">Exam</th>
              <th style="padding:15px 12px; text-align:center; font-weight:600;">Total</th>
              <th style="padding:15px 12px; text-align:center; font-weight:600;">Grade</th>
              <th style="padding:15px 12px; text-align:center; font-weight:600;">Remark</th>
            </tr>
          </thead>
          <tbody>${subjectRows}</tbody>
        </table>
        <div style="margin-top:90px; text-align:center;">
          <div style="display:inline-block; border-top:3px solid #333; padding-top:10px; width:300px;">
            <strong style="font-size:17px;">Sadiku Muhammad Ahmad</strong><br>Director
          </div>
        </div>
      </div>`;
  } catch (err) {
    body.innerHTML = `<div style="color:red; text-align:center; padding:80px; font-size:20px;">${err.message}</div>`;
  }
}

/* ==================== PDF DOWNLOAD (High Quality) ==================== */
async function generatePDF(elementId, filename) {
  const element = document.getElementById(elementId);
  if (!element) return alert("Content not ready");
  const clone = element.cloneNode(true);
  clone.style.cssText = "position:absolute; left:-9999px; width:210mm; padding:8px 15mm 20mm; background:white; font-size:13px; line-height:1.4;";
  document.body.appendChild(clone);
  const canvas = await html2canvas(clone, {
    scale: 1.8,
    useCORS: true,
    backgroundColor: "#ffffff",
    windowWidth: 1000
  });
  document.body.removeChild(clone);
  const imgData = canvas.toDataURL("image/jpeg", 0.85);
  const pdf = new jspdf.jsPDF("p", "mm", "a4");
  const imgWidth = 190;
  const pageHeight = 280;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 2;
  pdf.addImage(imgData, "JPEG", 10, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;
  while (heightLeft > 0) {
    pdf.addPage();
    position = 2 - pageHeight;
    pdf.addImage(imgData, "JPEG", 10, position + 10, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }
  pdf.save(filename);
}

function downloadCurrentTahfizPdf() {
  if (!currentTahfizData) return showMessageModal("Not Ready", "Generate Tahfiz report first");
  generatePDF("tahfizPrintArea", `${currentTahfizData.full_name || "Student"}_Tahfiz_Report.pdf`);
}

function downloadCurrentCompletePdf() {
  if (!currentCompleteReportData) return showMessageModal("Not Ready", "Generate complete report first");
  generatePDF("completePrintArea", `${currentCompleteReportData.full_name || "Student"}_Report_Sheet.pdf`);
}

/* ==================== EVENT LISTENERS ==================== */
document.getElementById("loadTahfiz")?.addEventListener("click", generateTahfizReport);
document.getElementById("loadAcademic")?.addEventListener("click", generateCompleteReport);
document.getElementById("downloadTahfizPdf")?.addEventListener("click", downloadCurrentTahfizPdf);
document.getElementById("downloadCompletePdf")?.addEventListener("click", downloadCurrentCompletePdf);

/* ==================== INIT ==================== */
document.addEventListener("DOMContentLoaded", async () => {
  await fetchStudentDetails();
  await loadSessions();
  setupNav();
});