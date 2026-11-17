// disposisi_waka.js — Waka beri catatan + teruskan ke user
(function () {

    const user = getUser();
    if (!user) { window.location.href = "login.html"; return; }

    const distribusiId = localStorage.getItem("selectedDistribusiId");
    const disposisiId = localStorage.getItem("selectedDisposisiId");
    const suratId = localStorage.getItem("selectedSuratId");

    if (!disposisiId || !suratId) {
        window.location.href = "homeWaka.html"; return;
    }

    let allUsers = [];
    let selectedUserId = null;

    // Alert
    let redirectUrl = "";
    window.showAlert = function (msg, url = "") {
        document.getElementById("alertMessage").innerText = msg;
        document.getElementById("customAlert").style.display = "flex";
        redirectUrl = url;
    };
    window.closeAlert = function () {
        document.getElementById("customAlert").style.display = "none";
        if (redirectUrl) window.location.href = redirectUrl;
    };

    document.getElementById("btnKembali")?.addEventListener("click", () => {
        window.location.href = "homeWaka.html";
    });

    function formatTanggal(iso) {
        if (!iso || iso.startsWith("0001")) return "-";
        return new Date(iso).toLocaleDateString("id-ID", {
            day: "numeric", month: "long", year: "numeric"
        });
    }

    // Load detail surat
    async function loadDetail() {
        try {
            const resSurat = await apiGetSuratMasuk(suratId);
            if (resSurat?.ok) {
                const surat = (await resSurat.json()).data;
                document.getElementById("valNoSurat").textContent = surat.no_surat || "-";
                document.getElementById("valTanggal").textContent = formatTanggal(surat.tanggal_surat);
                document.getElementById("valAsal").textContent = surat.asal_surat || "-";
                document.getElementById("valPerihal").textContent = surat.perihal_surat || "-";

                const lampiranBox = document.getElementById("lampiranBox");
                if (lampiranBox && surat.file_pdf) {
                    const pdfUrl = "http://localhost:7000/" + surat.file_pdf.replace(/\\/g, "/");
                    const fileName = surat.file_pdf.split(/[\\\/]/).pop() || "dokumen.pdf";
                    lampiranBox.innerHTML = `
                        <div class="pdf-thumbnail" onclick="window.open('${pdfUrl}', '_blank')">
                            <div class="pdf-icon">
                                <svg width="56" height="70" viewBox="0 0 56 70" fill="none">
                                    <rect width="56" height="70" rx="6" fill="rgba(255,255,255,0.15)"/>
                                    <path d="M10 8h24l12 12v42H10V8z" fill="rgba(255,255,255,0.9)" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
                                    <path d="M34 8v12h12" fill="none" stroke="rgba(180,210,240,0.8)" stroke-width="1.5"/>
                                    <rect x="16" y="28" width="24" height="2.5" rx="1.2" fill="#e74c3c" opacity="0.85"/>
                                    <rect x="16" y="34" width="20" height="2" rx="1" fill="rgba(100,140,180,0.7)"/>
                                    <rect x="16" y="39" width="22" height="2" rx="1" fill="rgba(100,140,180,0.7)"/>
                                    <rect x="16" y="44" width="18" height="2" rx="1" fill="rgba(100,140,180,0.7)"/>
                                </svg>
                            </div>
                            <div class="pdf-label">${fileName}</div>
                            <div class="pdf-action">
                                <span>🔍 Klik untuk membuka PDF</span>
                            </div>
                        </div>
                    `;
                } else if (lampiranBox) {
                    lampiranBox.innerHTML = `<p style="color:rgba(255,255,255,0.6)">Tidak ada lampiran</p>`;
                }
            }

            // Load disposisi untuk tampilkan catatan kepsek
            const resDisp = await apiGetDisposisi(suratId);
            if (resDisp?.ok) {
                const disp = (await resDisp.json()).data;
                const elCatatanKepsek = document.getElementById("valCatatanKepsek");
                if (elCatatanKepsek) elCatatanKepsek.textContent = disp.catatan_kepsek || "-";
                const elTanggapan = document.getElementById("valTanggapan");
                if (elTanggapan) elTanggapan.textContent = disp.tanggapan_saran || "-";
                const elProses = document.getElementById("valProses");
                if (elProses) elProses.textContent = disp.proses_lanjut || "-";
            }
        } catch (err) {
            console.error(err);
        }
    }

    // Load user yang bisa dipilih (bukan kepsek/admin/waka)
    async function loadUsers() {
        try {
            const res = await apiListUsers();
            if (res?.ok) {
                const data = (await res.json()).data || [];
                // Filter user yang bukan kepsek/admin/waka
                allUsers = data.filter(u => {
                    const jabatans = (u.jabatans || []).map(j => (typeof j === "string" ? j : j.nama_jabatan || "").toLowerCase());
                    const excluded = ["kepala sekolah", "admin"];
                    const isExcluded = jabatans.every(j => excluded.includes(j) || j.startsWith("waka") || j.includes("koordinator waka"));
                    return jabatans.length > 0 && !isExcluded;
                });
                renderUserList("");
            }
        } catch (e) {
            console.error("Gagal load users:", e);
        }
    }

    function renderUserList(keyword) {
        const container = document.getElementById("userListContainer");
        if (!container) return;
        const filtered = keyword
            ? allUsers.filter(u => u.name.toLowerCase().includes(keyword.toLowerCase()))
            : allUsers;

        if (filtered.length === 0) {
            container.innerHTML = `<p style="color:#aaa;font-size:14px;padding:10px;">Tidak ada user.</p>`;
            return;
        }

        container.innerHTML = filtered.map(u => `
            <div onclick="pilihUser(${u.id}, '${u.name}')"
                style="padding:10px 14px;cursor:pointer;color:white;font-size:14px;
                border-bottom:1px solid rgba(255,255,255,0.08);border-radius:6px;"
                onmouseover="this.style.background='rgba(255,255,255,0.08)'"
                onmouseout="this.style.background='transparent'">
                ${u.name}
                <span style="font-size:12px;opacity:0.6;margin-left:8px;">${u.email}</span>
            </div>
        `).join("");
    }

    window.pilihUser = function (id, nama) {
        selectedUserId = id;
        const el = document.getElementById("selectedUserName");
        if (el) el.textContent = nama;
        const wrapper = document.getElementById("wrapperSelectedUser");
        if (wrapper) wrapper.style.display = "block";
    };

    document.getElementById("searchUser")?.addEventListener("input", function () {
        renderUserList(this.value);
    });

    // Tombol Teruskan ke User
    document.getElementById("btnTeruskan")?.addEventListener("click", async () => {
        if (!selectedUserId) {
            showAlert("Pilih user penerima terlebih dahulu.");
            return;
        }

        const catatanWaka = document.getElementById("catatanWaka")?.value.trim() || "";
        const btn = document.getElementById("btnTeruskan");
        btn.disabled = true;
        btn.textContent = "Meneruskan...";

        try {
            const res = await apiWakaTeruskan(parseInt(disposisiId), selectedUserId, catatanWaka);

            if (res?.ok) {
                localStorage.removeItem("selectedDistribusiId");
                localStorage.removeItem("selectedDisposisiId");
                localStorage.removeItem("selectedSuratId");
                window.location.href = "notifblue.html?tipe=teruskan_waka";
            } else {
                const err = await res.json();
                showAlert(err.error || "Gagal meneruskan surat.");
                btn.disabled = false;
                btn.textContent = "→ Teruskan ke User";
            }
        } catch (e) {
            console.error(e);
            showAlert("Server tidak bisa diakses.");
            btn.disabled = false;
            btn.textContent = "→ Teruskan ke User";
        }
    });

    loadDetail();
    loadUsers();

})();