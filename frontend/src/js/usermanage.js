// usermanage.js — Manajemen Akun

const user = getUser();
if (!user) window.location.href = "login.html";

let allUsers = [];
let currentPage = 1;
const PER_PAGE = 5;

// Role yang tidak boleh dihapus (lowercase untuk case-insensitive matching)
const PROTECTED_ROLES = ["admin", "pegawai", "kepala sekolah"];

// Semua jabatan yang tersedia (BK dan BKK dipisah)
let JABATAN_OPTIONS = [
    "waka kesiswaan",
    "waka kurikulum",
    "waka sarpras",
    "kapro rpl",
    "kapro tkj",
    "bk",
    "bkk"
]; // Fallback jika API gagal

function capitalizeWords(str) {
    if (!str) return "";
    return str.split(" ").map(w => {
        const lower = w.toLowerCase();
        if (["rpl", "tkj", "dkv", "ei", "mt", "av", "bc", "an", "bk", "bkk"].includes(lower)) {
            return w.toUpperCase();
        }
        return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(" ");
}

async function loadJabatanOptions() {
    try {
        const res = await apiFetch("/jabatan");
        if (res && res.ok) {
            const data = await res.json();
            const list = data.data || [];
            // Filter out protected/system roles
            const excluded = ["admin", "pegawai", "kepala sekolah"];
            JABATAN_OPTIONS = list
                .map(j => j.nama_jabatan)
                .filter(name => name && !excluded.includes(name.toLowerCase()));
        }
    } catch (err) {
        console.error("Gagal mengambil daftar jabatan:", err);
    }
}

let redirectUrl = "";
function showAlert(msg, url = "") {
    document.getElementById("alertMessage").innerText = msg;
    document.getElementById("customAlert").style.display = "flex";
    redirectUrl = url;
}
function closeAlert() {
    document.getElementById("customAlert").style.display = "none";
    if (redirectUrl) window.location.href = redirectUrl;
}

function isProtected(u) {
    if (!Array.isArray(u.jabatans)) return false;
    return u.jabatans.some(j => {
        const jLower = (typeof j === 'string' ? j : '').toLowerCase().trim();
        return PROTECTED_ROLES.includes(jLower);
    });
}

// Buka/tutup dropdown multi-jabatan
function toggleDropdown(userId) {
    const dd = document.getElementById("dropdown-" + userId);
    const allDropdowns = document.querySelectorAll(".jabatan-dropdown");
    
    allDropdowns.forEach(d => {
        if (d !== dd) {
            if (d.classList.contains("open")) {
                const otherUserId = parseInt(d.id.replace("dropdown-", ""), 10);
                const otherUser = allUsers.find(u => u.id === otherUserId);
                if (otherUser) resetCheckboxes(otherUserId, otherUser.jabatans);
            }
            d.classList.remove("open");
            d.closest(".user-card")?.classList.remove("active-card");
        }
    });

    const isOpen = dd.classList.contains("open");
    if (isOpen) {
        dd.classList.remove("open");
        dd.closest(".user-card")?.classList.remove("active-card");
        const target = allUsers.find(u => u.id === userId);
        if (target) resetCheckboxes(userId, target.jabatans);
    } else {
        dd.classList.add("open");
        dd.closest(".user-card")?.classList.add("active-card");
    }
}

// Tutup semua dropdown kalau klik di luar
document.addEventListener("click", (e) => {
    if (!e.target.closest(".jabatan-wrapper")) {
        document.querySelectorAll(".jabatan-dropdown").forEach(d => {
            if (d.classList.contains("open")) {
                const userId = parseInt(d.id.replace("dropdown-", ""), 10);
                const target = allUsers.find(u => u.id === userId);
                if (target) resetCheckboxes(userId, target.jabatans);
            }
            d.classList.remove("open");
            d.closest(".user-card")?.classList.remove("active-card");
        });
    }
});

// Reset checkboxes ke kondisi awal yang tersimpan
function resetCheckboxes(userId, originalJabatans) {
    const checkboxes = document.querySelectorAll(`.cb-jabatan-${userId}`);
    const jabatansLower = (originalJabatans || []).map(j => j.toLowerCase());
    checkboxes.forEach(cb => {
        cb.checked = jabatansLower.includes(cb.value.toLowerCase());
    });
}

// Simpan perubahan jabatan ke backend
async function saveJabatanChanges(userId) {
    const target = allUsers.find(u => u.id === userId);
    if (!target) return;

    const checkboxes = document.querySelectorAll(`.cb-jabatan-${userId}:checked`);
    const jabatansBaru = Array.from(checkboxes).map(cb => cb.value);

    if (jabatansBaru.length === 0) {
        showAlert("Minimal pilih 1 jabatan.");
        return;
    }

    try {
        const res = await apiFetch("/admin/users/" + userId + "/jabatan", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jabatans: jabatansBaru })
        });
        if (res?.ok) {
            target.jabatans = jabatansBaru;
            // Update label di card tanpa re-render semua
            const displayLabel = jabatansBaru.map(j => capitalizeWords(j)).join(", ");
            const labelEl = document.getElementById("jabatan-label-" + userId);
            if (labelEl) {
                labelEl.textContent = displayLabel || "-";
            }
            const roleEl = document.getElementById("role-label-" + userId);
            if (roleEl) {
                roleEl.textContent = displayLabel || "-";
            }
            
            // Tutup dropdown
            const dd = document.getElementById("dropdown-" + userId);
            if (dd) {
                dd.classList.remove("open");
                dd.closest(".user-card")?.classList.remove("active-card");
            }
            showAlert("Jabatan berhasil diperbarui.");
        } else {
            const errData = await res.json();
            showAlert(errData.error || "Gagal mengubah jabatan.");
            resetCheckboxes(userId, target.jabatans);
        }
    } catch (err) {
        showAlert("Server tidak bisa diakses.");
        resetCheckboxes(userId, target.jabatans);
    }
}

function renderCard(u) {
    const jabatanList = Array.isArray(u.jabatans) ? u.jabatans : [];
    const jabatanLabel = jabatanList.length > 0 ? jabatanList.map(j => capitalizeWords(j)).join(", ") : "-";
    const protected_ = isProtected(u);
    const jabatanListLower = jabatanList.map(j => (typeof j === 'string' ? j : '').toLowerCase().trim());

    const checkboxes = JABATAN_OPTIONS.map(j => {
        const checked = jabatanListLower.includes(j.toLowerCase()) ? "checked" : "";
        const cbId = "cb-" + u.id + "-" + j.replace(/\s+/g, "_");
        return `
            <label class="jabatan-option" onclick="event.stopPropagation()">
                <input type="checkbox" id="${cbId}" class="cb-jabatan-${u.id}" value="${j}" ${checked}
                    onclick="event.stopPropagation()">
                <span>${capitalizeWords(j)}</span>
            </label>`;
    }).join("");

    const card = document.createElement("div");
    card.className = "user-card";
    card.innerHTML = `
        <div class="user-info">
            <div class="user-avatar">👤</div>
            <div>
                <div class="user-name">${u.name || u.nama || "-"}</div>
                <div class="user-role" id="role-label-${u.id}">${jabatanLabel}</div>
            </div>
        </div>
        <div class="user-actions">
            ${protected_
            ? `<span class="jabatan-display">${jabatanLabel}</span>
               <span class="btn-hapus-disabled" title="Akun ini tidak dapat dihapus">
                   <span>🔒</span> Terlindungi
               </span>`
            : `<div class="jabatan-wrapper">
                   <button class="jabatan-btn" onclick="toggleDropdown(${u.id}); event.stopPropagation()">
                       <span id="jabatan-label-${u.id}">${jabatanLabel}</span>
                       <span class="arrow">▾</span>
                   </button>
                   <div class="jabatan-dropdown" id="dropdown-${u.id}">
                       <div class="jabatan-options-list">
                           ${checkboxes}
                       </div>
                       <div class="dropdown-actions">
                           <button class="btn-simpan-jabatan" onclick="saveJabatanChanges(${u.id}); event.stopPropagation()">Simpan</button>
                       </div>
                   </div>
               </div>
               <button class="btn-hapus" onclick="hapusAkun(${u.id})">
                   <span>🗑</span> Hapus
               </button>`
        }
        </div>
    `;
    return card;
}


function getFilteredUsers() {
    const keyword = (document.getElementById("searchInput")?.value || "").toLowerCase();
    if (!keyword) return allUsers;
    return allUsers.filter(u =>
        (u.name || u.nama || "").toLowerCase().includes(keyword) ||
        (u.email || "").toLowerCase().includes(keyword) ||
        (u.jabatans || []).some(j => j.toLowerCase().includes(keyword))
    );
}

function renderUsers() {
    const list = document.getElementById("userList");
    const filtered = getFilteredUsers();
    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * PER_PAGE;
    const pageItems = filtered.slice(start, start + PER_PAGE);

    list.innerHTML = "";
    if (pageItems.length === 0) {
        list.innerHTML = '<p class="empty-state">Belum ada akun.</p>';
    } else {
        pageItems.forEach(u => list.appendChild(renderCard(u)));
    }

    renderPagination(filtered.length, totalPages);
}

function renderPagination(totalItems, totalPages) {
    let pgContainer = document.getElementById("paginationContainer");
    if (!pgContainer) return;

    if (totalPages <= 1) {
        pgContainer.innerHTML = "";
        return;
    }

    const pages = getPagesArray(currentPage, totalPages);
    let html = `<button class="pg-btn pg-nav" onclick="goPage(${currentPage - 1})" ${currentPage === 1 ? "disabled" : ""}>&#8592;</button>`;

    pages.forEach(p => {
        if (p === "...") {
            html += `<span class="pg-dots">...</span>`;
        } else {
            html += `<button class="pg-btn pg-num ${p === currentPage ? "active" : ""}" onclick="goPage(${p})">${p}</button>`;
        }
    });

    html += `<button class="pg-btn pg-nav" onclick="goPage(${currentPage + 1})" ${currentPage === totalPages ? "disabled" : ""}>&#8594;</button>`;
    pgContainer.innerHTML = html;
}

function getPagesArray(cur, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (cur <= 4) return [1, 2, 3, 4, 5, "...", total];
    if (cur >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
    return [1, "...", cur - 1, cur, cur + 1, "...", total];
}

function goPage(p) {
    const filtered = getFilteredUsers();
    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    if (p < 1 || p > totalPages) return;
    currentPage = p;
    renderUsers();
}

async function loadUsers() {
    const list = document.getElementById("userList");
    list.innerHTML = '<p class="loading-text">Memuat data...</p>';

    try {
        const res = await apiFetch("/admin/users");
        if (!res || !res.ok) {
            list.innerHTML = '<p class="empty-state" style="color:#e74c3c">Gagal memuat data.</p>';
            return;
        }
        const data = await res.json();
        allUsers = data.data || [];
        currentPage = 1;
        renderUsers();
    } catch (err) {
        console.error(err);
        list.innerHTML = '<p class="empty-state" style="color:#e74c3c">Server tidak bisa diakses.</p>';
    }
}

async function hapusAkun(userId) {
    const target = allUsers.find(u => u.id === userId);
    if (target && isProtected(target)) {
        showAlert("Akun dengan role Admin, Pegawai, atau Kepsek tidak dapat dihapus.");
        return;
    }
    if (!confirm("Yakin ingin menghapus akun ini?")) return;
    try {
        const res = await apiFetch("/admin/users/" + userId, { method: "DELETE" });
        if (res?.ok) {
            showAlert("Akun berhasil dihapus.");
            loadUsers();
        } else {
            showAlert("Gagal menghapus akun.");
        }
    } catch (err) {
        showAlert("Server tidak bisa diakses.");
    }
}

document.getElementById("searchInput").addEventListener("input", () => {
    currentPage = 1;
    renderUsers();
});

async function init() {
    await loadJabatanOptions();
    await loadUsers();
}
init();