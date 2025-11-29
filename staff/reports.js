// reports.js - FINAL 100% WORKING VERSION (NOVEMBER 2025)
// Fixed: Blank PDF | Table Misalignment | Logo Not Centered

const schoolInfo = {
  name: "Ibadurrahman College",
  address: "No. 1968 A, Gwammaja Housing Estate, Audu Wawu Wawu Street, opp. Ihya'ussunnah Juma'a Mosque, Dala L.G.A, Kano State, Nigeria.",
  phone: "08033459721, 09062171496",
  email: "info@irc.com.ng",
  logoSrc: "assets/images/logo.jpeg", // Make sure this path is correct!
};

const dailyGradeComments = {
  A: "Excellent",
  B: "Very good",
  C: "Good",
  D: "Pass",
  E: "Fair",
  F: "Fail",
};

const finalGradeComments = {
  A: "Excellent performance",
  B: "Very good performance",
  C: "Good performance",
  D: "Pass – Warning",
  E: "Probation",
  F: "Fail",
};

let currentStudents = [];
let currentTahfizData = null;
let currentCompleteReportData = null;

document.addEventListener("DOMContentLoaded", async () => {
  await loadAllClasses();
  await loadAllSessions();
  setupEventListeners();
});

async function loadAllClasses() {
  try {
    const res = await fetch("/api/public/classes");
    const data = await res.json();
    if (data.success) {
      const select = document.getElementById("filterClass");
      select.innerHTML = '<option value="">-- Select Class --</option>';
      data.data.forEach((cls) => {
        const opt = document.createElement("option");
        opt.value = `${cls.section_id}:${cls.class_id}`;
        opt.textContent = cls.name;
        select.appendChild(opt);
      });
    }
  } catch (e) {
    console.error("Error loading classes:", e);
  }
}

async function loadAllSessions() {
  try {
    const res = await fetch("/api/public/sessions");
    const data = await res.json();
    if (data.success) {
      const select = document.getElementById("filterSession");
      select.innerHTML = '<option value="">-- Select Session --</option>';
      data.data.forEach((session) => {
        const opt = document.createElement("option");
        opt.value = session.session_year;
        opt.textContent = session.session_year;
        if (session.is_current) opt.selected = true;
        select.appendChild(opt);
      });
    }
  } catch (e) {
    console.error("Error loading sessions:", e);
  }
}

function setupEventListeners() {
  document.getElementById("loadStudentsBtn").addEventListener("click", loadStudents);
  document.getElementById("downloadTahfizPdf").addEventListener("click", downloadCurrentTahfizPdf);
  document.getElementById("downloadCompletePdf").addEventListener("click", downloadCurrentCompletePdf);
}

async function loadStudents() {
  const classVal = document.getElementById("filterClass").value;
  const session = document.getElementById("filterSession").value;
  const term = document.getElementById("filterTerm").value;

  if (!classVal || !session || !term) {
    alert("Please select Class, Session, and Term");
    return;
  }

  showSpinner(true);

  try {
    const [sectionId, classId] = classVal.split(":");
    const res = await fetch(
      `/api/public/students?class_id=${classId}&section_id=${sectionId}&session=${session}&term=${term}`
    );
    const data = await res.json();

    if (data.success && data.data.length > 0) {
      currentStudents = data.data.map((s) => ({
        ...s,
        session,
        term,
        sectionId,
        classId,
      }));
      populateStudentsTable();
      document.getElementById("resultsSection").style.display = "block";
    } else {
      alert("No students found");
      document.getElementById("resultsSection").style.display = "none";
    }
  } catch (e) {
    console.error(e);
    alert("Error loading students");
  } finally {
    showSpinner(false);
  }
}

function populateStudentsTable() {
  const tbody = document.getElementById("studentsTableBody");
  tbody.innerHTML = "";
  currentStudents.forEach((student, i) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${i + 1}</td>
      <td class="fw-bold">${student.full_name}</td>
      <td>${student.student_id}</td>
      <td>
        <button class="btn btn-sm btn-success me-2" onclick="generateTahfizReport('${student.student_id}')">
          Tahfiz
        </button>
        <button class="btn btn-sm btn-primary" onclick="generateCompleteReport('${student.student_id}')">
          Complete
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function processRtlText(text) {
  return text?.replace(/:\s*\((\d+)\)/g, ': <span dir="ltr">($1)</span>') || "-";
}

async function getCumulativeAttendance(studentId, session, term) {
  try {
    const classVal = document.getElementById("filterClass").value;
    if (!classVal) return { percentage: "N/A", present: 0, total: 0 };
    const [sectionId, classId] = classVal.split(":");
    const url = `/api/staff-cumulative-attendance/1?class_id=${classId}&session=${session}&term=${term}`;
    const res = await fetch(url);
    if (!res.ok) return { percentage: "N/A", present: 0, total: 0 };
    const json = await res.json();
    if (json.success && json.data) {
      const stu = json.data.find(s => s.student_id === studentId);
      if (stu) return {
        percentage: stu.percentage || "0%",
        present: stu.total_present || 0,
        total: stu.total_days || 0
      };
    }
    return { percentage: "0%", present: 0, total: 0 };
  } catch (e) {
    return { percentage: "Error", present: 0, total: 0 };
  }
}

// TAHFIZ REPORT - FULLY FIXED
window.generateTahfizReport = async (studentId) => {
  const student = currentStudents.find(s => s.student_id === studentId);
  if (!student) return alert("Student not found");

  const modal = new bootstrap.Modal(document.getElementById("tahfizReportModal"));
  const body = document.getElementById("tahfizReportBody");
  body.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-success"></div><p>Generating Tahfiz Report...</p></div>';
  modal.show();

  try {
    const res = await fetch(`/api/public/tahfiz-report?student_id=${studentId}&session=${student.session}&term=${student.term}&section_id=${student.sectionId}&class_id=${student.classId}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "No data");

    const t = data.data;
    currentTahfizData = { ...t, student };
    const attendance = await getCumulativeAttendance(studentId, student.session, student.term);

    const finalGrade = (t.final_grade ?? "F").toUpperCase();

    const rows = (t.daily_records || []).map((r, i) => `
      <tr style="background:${i % 2 === 0 ? '#f8f9fa' : 'white'};">
        <td style="padding:12px 10px; border-bottom:1px solid #eee; font-size:14.5px;">${r.week ? "Week " + r.week + " - " : ""}${r.day || "N/A"}</td>
        <td style="padding:12px 10px; border-bottom:1px solid #eee; direction:rtl; text-align:right; font-size:14.5px;">${processRtlText(r.from_surah_ayah)}</td>
        <td style="padding:12px 10px; border-bottom:1px solid #eee; direction:rtl; text-align:right; font-size:14.5px;">${processRtlText(r.to_surah_ayah)}</td>
        <td style="padding:12px 10px; border-bottom:1px solid #eee; text-align:center; font-weight:bold; color:#065f46; font-size:16px;">${r.daily_grade ?? "-"}</td>
        <td style="padding:12px 10px; border-bottom:1px solid #eee; color:#444;">${dailyGradeComments[r.daily_grade] ?? "-"}</td>
      </tr>`).join("");

    body.innerHTML = `
      <div id="tahfizPrintArea" style="font-family:Arial,sans-serif; max-width:210mm; margin:0 auto; padding:15px 20px; background:white; min-height:297mm;">
        <!-- Header with Perfectly Centered Logo -->
        <div style="text-align:center; padding:20px 0 25px; border-bottom:5px double #065f46; margin-bottom:30px;">
          <img src="${schoolInfo.logoSrc}" 
               style="width:110px; height:110px; border-radius:50%; border:5px solid #e6f4ef; display:block; margin:0 auto 15px auto; box-shadow:0 4px 12px rgba(0,0,0,0.1);"
               crossorigin="anonymous">
          <h1 style="margin:0; font-size:32px; font-weight:bold; color:#065f46; letter-spacing:1px;">${schoolInfo.name}</h1>
          <p style="margin:8px 0 0; font-size:15px; color:#444;">${schoolInfo.address}<br>Tel: ${schoolInfo.phone} • Email: ${schoolInfo.email}</p>
        </div>

        <h2 style="text-align:center; color:#065f46; font-size:29px; margin:30px 0; font-weight:bold; text-transform:uppercase;">
          Tahfiz-ul-Qur'an Progress Report
        </h2>

        <!-- Student Info Grid -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:30px 0; font-size:15.5px;">
          <div style="background:#f0fdf4; padding:14px; border-radius:10px;"><strong>Student Name:</strong> ${t.full_name || student.full_name}</div>
          <div style="background:#ffffff; padding:14px; border:2px solid #065f46; border-radius:10px;"><strong>Admission No:</strong> ${student.student_id}</div>
          <div style="background:#f0fdf4; padding:14px; border-radius:10px;"><strong>Class:</strong> ${student.class_name || "N/A"}</div>
          <div style="background:#ffffff; padding:14px; border:2px solid #065f46; border-radius:10px;"><strong>Session:</strong> ${student.session}</div>
          <div style="background:#f0fdf4; padding:14px; border-radius:10px;"><strong>Term:</strong> ${student.term === "1" ? "1st" : student.term === "2" ? "2nd" : "3rd"} Term</div>
          <div style="background:#e0f2fe; padding:14px; border-radius:10px; font-weight:bold;"><strong>Attendance:</strong> ${attendance.percentage} (${attendance.present}/${attendance.total} days)</div>

          <div style="background:#ecfdf5; padding:14px; border-radius:10px;"><strong>Daily Average:</strong> ${t.daily_score ?? "-"}%</div>
          <div style="background:#ecfdf5; padding:14px; border-radius:10px;"><strong>Exam Score:</strong> ${t.exam_score ?? "-"}%</div>
          <div style="background:#ecfdf5; padding:14px; border-radius:10px;"><strong>Total Score:</strong> ${t.total_score ?? "-"}%</div>
          <div style="background:#065f46; color:white; padding:14px; border-radius:10px; font-size:18px; text-align:center;"><strong>Final Grade: ${finalGrade}</strong></div>
          <div style="grid-column:1/-1; background:#fff8e1; padding:18px; border-radius:10px; border:2px dashed #ff9800; font-size:16px;">
            <strong>Principal's Comment:</strong> ${finalGradeComments[finalGrade] || "No comment available"}
          </div>
        </div>

        <!-- Daily Records Table - PERFECTLY ALIGNED -->
        <table style="width:100%; border-collapse:collapse; margin:40px 0; font-size:14.5px; box-shadow:0 2px 10px rgba(0,0,0,0.1);">
          <thead>
            <tr style="background:#065f46; color:white;">
              <th style="padding:16px 12px; text-align:left;">Week & Day</th>
              <th style="padding:16px 12px; text-align:center;">From</th>
              <th style="padding:16px 12px; text-align:center;">To</th>
              <th style="padding:16px 12px; text-align:center;">Grade</th>
              <th style="padding:16px 12px; text-align:center;">Comment</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <!-- Signature -->
        <div style="margin-top:90px; text-align:center;">
          <div style="display:inline-block; border-top:4px solid #000; padding-top:12px; width:320px;">
            <strong style="font-size:17px;">Sadiku Muhammad Ahmad</strong><br>
            <span style="font-size:15px; color:#065f46;">Director / Principal</span>
          </div>
        </div>
      </div>`;
  } catch (err) {
    body.innerHTML = `<div style="color:red; text-align:center; padding:60px; font-size:18px;">Error: ${err.message}</div>`;
  }
};

// COMPLETE ACADEMIC REPORT - ALSO FULLY FIXED
window.generateCompleteReport = async (studentId) => {
  const student = currentStudents.find(s => s.student_id === studentId);
  if (!student) return alert("Student not found");

  const modal = new bootstrap.Modal(document.getElementById("completeReportModal"));
  const body = document.getElementById("completeReportBody");
  body.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p>Generating Complete Report...</p></div>';
  modal.show();

  try {
    const res = await fetch(`/api/public/complete-report?student_id=${studentId}&session=${student.session}&term=${student.term}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "No data");

    const r = data.data;
    currentCompleteReportData = { ...r, student };
    const attendance = await getCumulativeAttendance(studentId, student.session, student.term);

    const subjectRows = (r.subjects || []).map((s, i) => `
      <tr style="background:${i % 2 === 0 ? '#f8f9fa' : 'white'};">
        <td style="padding:12px 10px; border-bottom:1px solid #eee; font-size:14.5px;">${s.subject_name}</td>
        <td style="padding:12px 10px; border-bottom:1px solid #eee; text-align:center;">${s.ca1 ?? "-"}</td>
        <td style="padding:12px 10px; border-bottom:1px solid #eee; text-align:center;">${s.ca2 ?? "-"}</td>
        <td style="padding:12px 10px; border-bottom:1px solid #eee; text-align:center;">${s.exam ?? "-"}</td>
        <td style="padding:12px 10px; border-bottom:1px solid #eee; text-align:center; font-weight:bold; color:#065f46;">${s.total ?? "-"}</td>
        <td style="padding:12px 10px; border-bottom:1px solid #eee; text-align:center; font-weight:bold; color:${s.grade==='A'?'#065f46':s.grade==='F'?'#d32f2f':'#000'};">${s.grade ?? "-"}</td>
        <td style="padding:12px 10px; border-bottom:1px solid #eee;">${dailyGradeComments[s.grade] ?? "-"}</td>
      </tr>`).join("");

    body.innerHTML = `
      <div id="completePrintArea" style="font-family:Arial,sans-serif; max-width:210mm; margin:0 auto; padding:15px 20px; background:white; min-height:297mm;">
        <div style="text-align:center; padding:20px 0 25px; border-bottom:5px double #065f46; margin-bottom:30px;">
          <img src="${schoolInfo.logoSrc}" 
               style="width:110px; height:110px; border-radius:50%; border:5px solid #e6f4ef; display:block; margin:0 auto 15px auto; box-shadow:0 4px 12px rgba(0,0,0,0.1);"
               crossorigin="anonymous">
          <h1 style="margin:0; font-size:32px; font-weight:bold; color:#065f46;">${schoolInfo.name}</h1>
          <p style="margin:8px 0 0; font-size:15px; color:#444;">${schoolInfo.address}<br>Tel: ${schoolInfo.phone}</p>
        </div>

        <h2 style="text-align:center; color:#065f46; font-size:29px; margin:35px 0; font-weight:bold;">
          End of Term Report Sheet
        </h2>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:30px 0; font-size:15.5px;">
          <div style="background:#f0f8ff; padding:14px; border-radius:10px;"><strong>Student Name:</strong> ${r.full_name}</div>
          <div style="background:#ffffff; padding:14px; border:2px solid #065f46; border-radius:10px;"><strong>Adm No:</strong> ${r.student_id}</div>
          <div style="background:#f0f8ff; padding:14px; border-radius:10px;"><strong>Class:</strong> ${student.class_name}</div>
          <div style="background:#ffffff; padding:14px; border:2px solid #065f46; border-radius:10px;"><strong>Session:</strong> ${student.session}</div>
          <div style="background:#f0f8ff; padding:14px; border-radius:10px;"><strong>Term:</strong> ${student.term === "1" ? "1st" : student.term === "2" ? "2nd" : "3rd"} Term</div>
          <div style="background:#e3f2fd; padding:14px; border-radius:10px; font-weight:bold;"><strong>Attendance:</strong> ${attendance.percentage} (${attendance.present}/${attendance.total} days)</div>
        </div>

        <table style="width:100%; border-collapse:collapse; margin:40px 0; font-size:14.5px; box-shadow:0 2px 10px rgba(0,0,0,0.1);">
          <thead>
            <tr style="background:#065f46; color:white;">
              <th style="padding:16px 12px; text-align:left;">Subject</th>
              <th style="padding:16px 12px; text-align:center;">CA1</th>
              <th style="padding:16px 12px; text-align:center;">CA2</th>
              <th style="padding:16px 12px; text-align:center;">Exam</th>
              <th style="padding:16px 12px; text-align:center;">Total</th>
              <th style="padding:16px 12px; text-align:center;">Grade</th>
              <th style="padding:16px 12px; text-align:center;">Remark</th>
            </tr>
          </thead>
          <tbody>${subjectRows}</tbody>
        </table>

        <div style="margin-top:90px; text-align:center;">
          <div style="display:inline-block; border-top:4px solid #000; padding-top:12px; width:320px;">
            <strong style="font-size:17px;">Sadiku Muhammad Ahmad</strong><br>
            <span style="font-size:15px; color:#065f46;">Director / Principal</span>
          </div>
        </div>
      </div>`;
  } catch (err) {
    body.innerHTML = `<div style="color:red; text-align:center; padding:60px; font-size:18px;">Error: ${err.message}</div>`;
  }
};

// FINAL PDF GENERATION - NO MORE BLANK PDF!
const generatePDF = async (elementId, filename) => {
  const element = document.getElementById(elementId);
  if (!element) return alert("Report not ready yet!");

  // Wait for all images (especially logo) to load
  const images = element.querySelectorAll("img");
  await Promise.all(Array.from(images).map(img => {
    if (img.complete && img.naturalWidth !== 0) return Promise.resolve();
    return new Promise(resolve => {
      img.onload = img.onerror = () => resolve();
    });
  }));

  const opt = {
    margin: [12, 12, 15, 12],
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    }
  };

  try {
    await html2pdf().set(opt).from(element).save();
  } catch (err) {
    console.error(err);
    alert("PDF generation failed. Please try again.");
  }
};

window.downloadCurrentTahfizPdf = () => {
  if (!currentTahfizData) return alert("Please generate Tahfiz report first!");
  const name = (currentTahfizData.student?.full_name || "Student").replace(/[^a-zA-Z0-9]/g, "_");
  generatePDF("tahfizPrintArea", `${name}_Tahfiz_${currentTahfizData.student.session.replace("/", "-")}_${currentTahfizData.student.term}.pdf`);
};

window.downloadCurrentCompletePdf = () => {
  if (!currentCompleteReportData) return alert("Please generate Complete report first!");
  const name = (currentCompleteReportData.student?.full_name || "Student").replace(/[^a-zA-Z0-9]/g, "_");
  generatePDF("completePrintArea", `${name}_Report_${currentCompleteReportData.student.session.replace("/", "-")}_${currentCompleteReportData.student.term}.pdf`);
};

function showSpinner(show) {
  document.getElementById("overlay").style.display = show ? "block" : "none";
  document.getElementById("spinner").style.display = show ? "block" : "none";
}