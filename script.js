import {
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

// อ้างอิงองค์ประกอบ HTML
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("loginButton");
const errorMessage = document.getElementById("error");

const loginPage = document.getElementById("loginPage");
const mainPage = document.getElementById("mainPage");
const infoPage = document.getElementById("infoPage");
const timePage = document.getElementById("timePage");

const infoButton = document.getElementById("infoNavButton");
const timeButton = document.getElementById("timeNavButton");
const logoutButton = document.getElementById("logoutButton");
const refreshLogsButton = document.getElementById("refreshLogsButton");
const activityLogList = document.getElementById("activityLogList");

const editButton = document.getElementById("editButton");
const paper = document.getElementById("paper");

let currentUser = null;

// บันทึกประวัติการใช้งาน
async function logActivity(type) {
  if (!currentUser) return;

  const logsRef = collection(
    window.firebaseDb,
    "profiles",
    currentUser.uid,
    "activityLogs"
  );

  await addDoc(logsRef, {
    type: type,
    timestamp: serverTimestamp()
  });
}

// เข้าสู่ระบบ
loginButton.addEventListener("click", async function () {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  errorMessage.textContent = "";

  try {
    const result = await signInWithEmailAndPassword(
      window.firebaseAuth,
      email,
      password
    );

    currentUser = result.user;

    const profileRef = doc(
      window.firebaseDb,
      "profiles",
      currentUser.uid
    );

    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists() && profileSnap.data().content) {
      paper.textContent = profileSnap.data().content;
    } else {
      paper.textContent = "เริ่มเขียนข้อมูลของคุณที่นี่...";
    }

    loginPage.style.display = "none";
    mainPage.style.display = "block";
    infoPage.style.display = "none";
    timePage.style.display = "none";

    try {
      await logActivity("login");
    } catch (logError) {
      console.error("บันทึกเวลาเข้าไม่สำเร็จ", logError);
    }

  } catch (error) {
    console.error(error);
    errorMessage.textContent =
      "เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมลและรหัสผ่าน";
  }
});

// เปิดหน้าข้อมูล
infoButton.addEventListener("click", function () {
  infoPage.style.display = "block";
  timePage.style.display = "none";
});

// เปิดหน้าประวัติเวลา
timeButton.addEventListener("click", async function () {
  infoPage.style.display = "none";
  timePage.style.display = "block";
  await loadActivityLogs();
});

// โหลดประวัติการใช้งาน
async function loadActivityLogs() {
  if (!currentUser) return;

  activityLogList.replaceChildren();

  try {
    const logsRef = collection(
      window.firebaseDb,
      "profiles",
      currentUser.uid,
      "activityLogs"
    );

    const logsQuery = query(
      logsRef,
      orderBy("timestamp", "desc")
    );

    const snapshot = await getDocs(logsQuery);

    const labels = {
      login: "เข้าสู่ระบบ",
      logout: "ออกจากระบบ",
      edit: "เริ่มแก้ไขข้อมูล",
      save: "บันทึกข้อมูลสำเร็จ"
    };

    if (snapshot.empty) {
      const item = document.createElement("li");
      item.textContent = "ยังไม่มีประวัติการใช้งาน";
      activityLogList.appendChild(item);
      return;
    }

    snapshot.forEach(function (logDoc) {
      const data = logDoc.data();
      const item = document.createElement("li");

      const date = data.timestamp?.toDate
        ? data.timestamp.toDate().toLocaleString("th-TH")
        : "กำลังบันทึกเวลา...";

      item.textContent =
        (labels[data.type] || "กิจกรรมอื่น") + " — " + date;

      activityLogList.appendChild(item);
    });

  } catch (error) {
    console.error("โหลดประวัติไม่สำเร็จ", error);
    const item = document.createElement("li");
    item.textContent = "โหลดประวัติไม่สำเร็จ กรุณาลองรีเฟรช";
    activityLogList.appendChild(item);
  }
}

// ปุ่มรีเฟรชประวัติ
refreshLogsButton.addEventListener("click", loadActivityLogs);

// แก้ไขและบันทึกข้อมูล
editButton.addEventListener("click", async function () {
  if (editButton.textContent === "แก้ไข") {
    paper.contentEditable = "true";
    editButton.textContent = "บันทึก";
    paper.focus();

    try {
      await logActivity("edit");
    } catch (error) {
      console.error("บันทึกประวัติการแก้ไขไม่สำเร็จ", error);
    }

    return;
  }

  paper.contentEditable = "false";
  editButton.disabled = true;
  editButton.textContent = "กำลังบันทึก...";

  try {
    if (!currentUser) {
      throw new Error("กรุณาเข้าสู่ระบบก่อน");
    }

    const profileRef = doc(
      window.firebaseDb,
      "profiles",
      currentUser.uid
    );

    await setDoc(
      profileRef,
      { content: paper.innerText },
      { merge: true }
    );

    try {
      await logActivity("save");
    } catch (logError) {
      console.error("บันทึกประวัติการบันทึกไม่สำเร็จ", logError);
    }

    editButton.textContent = "แก้ไข";

  } catch (error) {
    console.error(error);
    paper.contentEditable = "true";
    editButton.textContent = "ลองบันทึกอีกครั้ง";

    alert(
      "บันทึกข้อมูลไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อและ Security Rules"
    );

  } finally {
    editButton.disabled = false;
  }
});

// ออกจากระบบ
logoutButton.addEventListener("click", async function () {
  logoutButton.disabled = true;

  try {
    await logActivity("logout");
  } catch (error) {
    console.error("บันทึกเวลาออกไม่สำเร็จ", error);
  }

  try {
    await signOut(window.firebaseAuth);

    currentUser = null;
    paper.contentEditable = "false";
    editButton.textContent = "แก้ไข";

    mainPage.style.display = "none";
    loginPage.style.display = "block";
    infoPage.style.display = "none";
    timePage.style.display = "none";
    passwordInput.value = "";

  } catch (error) {
    console.error(error);
    alert("ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง");
  } finally {
    logoutButton.disabled = false;
  }
});
