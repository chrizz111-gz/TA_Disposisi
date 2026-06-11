// =============================================
// api.js — Helper terpusat untuk semua API call
// =============================================

const BASE_URL = "http://localhost:7000";

function getToken() {
    return localStorage.getItem("token");
}

function getUser() {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
}

function getActiveJabatan() {
    return localStorage.getItem("activeJabatan") || "";
}

function setActiveJabatan(jabatan) {
    localStorage.setItem("activeJabatan", jabatan);
}

function hasRole(role) {
    const active = getActiveJabatan().toLowerCase();
    return active === role.toLowerCase();
}

function isWaka() {
    return getActiveJabatan().toLowerCase().startsWith("waka");
}

function userHasJabatan(jabatan) {
    const user = getUser();
    if (!user || !user.jabatans) return false;
    return user.jabatans.map(j => j.toLowerCase()).includes(jabatan.toLowerCase());
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("activeJabatan");
    window.location.href = "login.html";
}

function getDashboardUrl(jabatan) {
    const j = (jabatan || getActiveJabatan()).toLowerCase();
    if (j === "kepala sekolah") return "homeKepsek.html";
    if (j === "admin") return "home.html";
    if (j === "pegawai") return "home.html";
    if (j.startsWith("waka") || j === "koordinator waka") return "homeWaka.html";
    return "home_user.html";
}

async function apiFetch(path, options = {}, isFormData = false) {
    const token = getToken();
    const headers = {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { "Authorization": "Bearer " + token } : {}),
        ...(options.headers || {})
    };
    const res = await fetch(BASE_URL + path, { ...options, headers });
    if (res.status === 401) { logout(); return null; }
    return res;
}

// =============================================
// AUTH
// =============================================

async function apiLogin(email, password) {
    return fetch(BASE_URL + "/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });
}

async function apiForgotPassword(email) {
    return fetch(BASE_URL + "/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
    });
}

async function apiVerifyOTP(email, otp) {
    return fetch(BASE_URL + "/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp })
    });
}

async function apiResetPassword(email, new_password) {
    return fetch(BASE_URL + "/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, new_password })
    });
}

// =============================================
// SURAT MASUK
// =============================================

async function apiListSuratMasuk(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiFetch("/surat-masuk" + (query ? "?" + query : ""));
}

async function apiGetSuratMasuk(suratId) {
    return apiFetch("/surat-masuk/" + suratId);
}

async function apiUploadSuratMasuk(formData) {
    const token = getToken();
    return fetch(BASE_URL + "/surat-masuk/upload", {
        method: "POST",
        headers: { "Authorization": "Bearer " + token },
        body: formData
    });
}

// =============================================
// SURAT KELUAR
// =============================================

async function apiListSuratKeluar(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiFetch("/surat-keluar" + (query ? "?" + query : ""));
}

async function apiGetSuratKeluar(suratId) {
    return apiFetch("/surat-keluar/" + suratId);
}

async function apiUploadSuratKeluar(formData) {
    const token = getToken();
    return fetch(BASE_URL + "/surat-keluar/upload", {
        method: "POST",
        headers: { "Authorization": "Bearer " + token },
        body: formData
    });
}

async function apiApproveSuratKeluar(suratKeluarId, isApproved, catatan = "") {
    return apiFetch("/surat-keluar/approve", {
        method: "POST",
        body: JSON.stringify({
            surat_keluar_id: suratKeluarId,
            is_approved: isApproved,
            catatan: catatan
        })
    });
}

async function apiSelesaikanSuratKeluar(suratId) {
    return apiFetch("/surat-keluar/selesai/" + suratId, { method: "POST" });
}

// =============================================
// DISPOSISI
// =============================================

async function apiCreateDisposisi(idSuratMasuk, idKepsek, catatan = "") {
    return apiFetch("/disposisi", {
        method: "POST",
        body: JSON.stringify({
            id_surat_masuk: idSuratMasuk,
            id_kepsek: idKepsek,
            catatan: catatan
        })
    });
}

async function apiApproveDisposisi(disposisiId, isApproved, payload = {}) {
    const body = {
        disposisi_id: disposisiId,
        is_approved: isApproved,
        ...payload
    };
    return apiFetch("/disposisi/approve", { method: "POST", body: JSON.stringify(body) });
}

// TU teruskan ke Waka (konfirmasi saja, jabatan sudah dipilih Kepsek)
async function apiTeruskanKeWaka(disposisiId, idJabatanArr) {
    return apiFetch("/disposisi/teruskan-waka", {
        method: "POST",
        body: JSON.stringify({
            disposisi_id: disposisiId,
            id_jabatan_penerima: idJabatanArr   // array of uint
        })
    });
}

// Waka teruskan ke user spesifik (bisa lebih dari satu)
async function apiWakaTeruskan(disposisiId, idUsersArr, catatanWaka = "") {
    return apiFetch("/disposisi/waka", {
        method: "POST",
        body: JSON.stringify({
            disposisi_id: disposisiId,
            id_users: idUsersArr,
            catatan_waka: catatanWaka
        })
    });
}

async function apiListDisposisi(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiFetch("/disposisi" + (query ? "?" + query : ""));
}

async function apiGetDisposisi(suratMasukId) {
    return apiFetch("/disposisi/surat/" + suratMasukId);
}

async function apiBacaDisposisi(disposisiId) {
    return apiFetch("/disposisi/baca", {
        method: "POST",
        body: JSON.stringify({ disposisi_id: disposisiId })
    });
}

// =============================================
// USER MANAGEMENT
// =============================================

async function apiCreateUser(name, email, password, jabatans) {
    return apiFetch("/admin/users", {
        method: "POST",
        body: JSON.stringify({ name, email, password, jabatans })
    });
}

async function apiListUsers() {
    return apiFetch("/admin/users");
}

async function apiDeleteUser(userId) {
    return apiFetch("/admin/users/" + userId, { method: "DELETE" });
}

// =============================================
// JABATAN
// =============================================

async function apiListJabatan() {
    return apiFetch("/jabatan");
}

async function apiGetUsersByJabatan(jabatanId) {
    return apiFetch("/jabatan/" + jabatanId + "/users");
}

async function apiListUserBiasa() {
    return apiFetch("/users/biasa");
}

// =============================================
// DASHBOARD
// =============================================

async function apiGetDashboard() {
    return apiFetch("/dashboard");
}

// =============================================
// LOGS
// =============================================

async function apiListLogs() {
    return apiFetch("/admin/logs");
}