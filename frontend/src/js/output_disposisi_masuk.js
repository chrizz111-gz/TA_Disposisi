// output_disposisi_masuk.js — TU lihat hasil Kepsek + pilih jabatan Waka + teruskan
(function () {

    const user = getUser();
    if (!user) { window.location.href = "login.html"; return; }

    const suratId = localStorage.getItem("selectedSuratId");
    const fromHistory = localStorage.getItem("fromHistory") === "true";

    if (!suratId) { window.location.href = "home.html"; return; }

    let allJabatans = [];
    let pilihanJabatan = [];

    function formatTanggal(iso) {
        if (!iso || iso.startsWith("0001")) return "-";
        return new Date(iso).toLocaleDateString("id-ID", {
            day: "numeric", month: "long", year: "numeric"
        });
    }

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
        localStorage.removeItem("fromHistory");
        if (fromHistory) {
            window.location.href = "history.html";
        } else {
            window.location.href = getDashboardUrl(getActiveJabatan());
        }
    });

    // ── Dropdown jabatan waka ──────────────────────────────────────
    function renderDropdown(keyword) {
        const dropdown = document.getElementById("dropdownJabatan");
        if (!dropdown) return;
        if (!keyword) { dropdown.style.display = "none"; return; }

        const filtered = allJabatans.filter(j =>
            j.nama_jabatan.toLowerCase().includes(keyword.toLowerCase()) &&
            !pilihanJabatan.find(p => p.id === j.id_jabatan)
        );

        if (filtered.length === 0) {
            dropdown.innerHTML = `<div style="padding:10px 14px;color:#aaa;font-size:14px;">Tidak ada hasil</div>`;
            dropdown.style.display = "block";
            return;
        }

        dropdown.innerHTML = filtered.map(j => `
            <div onclick="pilihJabatan(${j.id_jabatan}, '${j.nama_jabatan}')"
                style="padding:10px 14px;cursor:pointer;color:white;font-size:14px;
                border-bottom:1px solid rgba(255,255,255,0.08);"
                onmouseover="this.style.background='rgba(255,255,255,0.08)'"
                onmouseout="this.style.background='transparent'">
                ${j.nama_jabatan}
            </div>
        `).join("");
        dropdown.style.display = "block";
    }

    window.pilihJabatan = function (id, nama) {
        if (!pilihanJabatan.find(p => p.id === id)) {
            pilihanJabatan.push({ id, nama });
            renderTags();
        }
        const searchEl = document.getElementById("searchJabatan");
        if (searchEl) searchEl.value = "";
        const dropdown = document.getElementById("dropdownJabatan");
        if (dropdown) dropdown.style.display = "none";
    };

    window.hapusJabatan = function (id) {
        pilihanJabatan = pilihanJabatan.filter(p => p.id !== id);
        renderTags();
    };

    function renderTags() {
        const el = document.getElementById("selectedJabatans");
        if (!el) return;
        el.innerHTML = pilihanJabatan.map(p => `
            <span style="background:rgba(26,115,232,0.8);color:white;padding:5px 12px;
                border-radius:20px;font-size:13px;display:inline-flex;align-items:center;gap:6px;">
                ${p.nama}
                <span onclick="hapusJabatan(${p.id})"
                    style="cursor:pointer;font-size:17px;line-height:1;opacity:0.8;"
                    onmouseover="this.style.opacity='1'"
                    onmouseout="this.style.opacity='0.8'">×</span>
            </span>
        `).join("");
    }

    async function loadJabatan() {
        try {
            const res = await apiListJabatan();
            if (res?.ok) {
                const all = (await res.json()).data || [];
                allJabatans = all.filter(j => {
                    const nama = (j.nama_jabatan || "").toLowerCase();
                    return nama.startsWith("waka") || nama.includes("koordinator waka");
                });
            }
        } catch (e) {
            console.error("Gagal load jabatan:", e);
        }
    }

    const searchJabatan = document.getElementById("searchJabatan");
    searchJabatan?.addEventListener("input", () => renderDropdown(searchJabatan.value));
    document.addEventListener("click", (e) => {
        const dropdown = document.getElementById("dropdownJabatan");
        if (dropdown && !e.target.closest("#dropdownJabatan") && e.target !== searchJabatan) {
            dropdown.style.display = "none";
        }
    });

    // ── Load detail ───────────────────────────────────────────────
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
                    const namaFile = surat.file_pdf.split(/[\\\/]/).pop();
                    lampiranBox.innerHTML = `
                        <p style="font-size:16px;font-weight:bold">📄 ${namaFile}</p>
                        <p style="font-size:13px;margin-top:8px;opacity:0.8">Klik untuk membuka PDF</p>
                    `;
                    lampiranBox.style.cursor = "pointer";
                    lampiranBox.onclick = () => {
                        window.open("http://localhost:7000/" + surat.file_pdf.replace(/\\/g, "/"), "_blank");
                    };
                }
            }

            const resDisp = await apiGetDisposisi(suratId);
            if (resDisp?.ok) {
                const disp = (await resDisp.json()).data;

                // Status badge
                const statusEl = document.getElementById("valStatus");
                if (statusEl) {
                    const statusMap = {
                        "disetujui": { label: "Disetujui", bg: "#3CC15F" },
                        "ditolak": { label: "Ditolak", bg: "#e84848" },
                        "menunggu": { label: "Menunggu", bg: "#E8C048" },
                    };
                    const s = statusMap[disp.status_approval] || statusMap["menunggu"];
                    statusEl.textContent = s.label;
                    statusEl.style.background = s.bg;
                }

                document.getElementById("valKepsek").value = disp.kepsek?.name || disp.kepsek?.nama || "-";
                document.getElementById("valApprovalAt").value = formatTanggal(disp.approval_at);
                document.getElementById("valCatatanKepsek").value = disp.catatan_kepsek || "-";
                document.getElementById("valTanggapan").value = disp.tanggapan_saran || "-";
                document.getElementById("valProses").value = disp.proses_lanjut || "-";
                document.getElementById("valKoordinasi").value = disp.koordinasi_konfirmasi || "-";

                // Area teruskan — hanya muncul kalau:
                // - bukan dari history
                // - sudah disetujui
                // - belum ada distribusi_sm (belum diteruskan ke waka)
                const btnTeruskan = document.getElementById("btnTeruskan");
                const areaTeruskan = document.getElementById("areaTeruskan");
                const sudahDiteruskan = (disp.distribusi || []).length > 0;

                if (!fromHistory && disp.status_approval === "disetujui" && !sudahDiteruskan) {
                    if (areaTeruskan) areaTeruskan.style.display = "block";
                    if (btnTeruskan) btnTeruskan.style.display = "inline-block";

                    loadJabatan();

                    btnTeruskan?.addEventListener("click", async () => {
                        if (pilihanJabatan.length === 0) {
                            showAlert("Pilih minimal 1 jabatan Waka penerima.");
                            return;
                        }

                        btnTeruskan.disabled = true;
                        btnTeruskan.textContent = "Meneruskan...";

                        try {
                            const res = await apiTeruskanKeWaka(
                                disp.id ?? disp.id_disposisi,
                                pilihanJabatan.map(p => p.id)
                            );

                            if (res?.ok) {
                                localStorage.removeItem("selectedSuratId");
                                localStorage.removeItem("selectedDisposisiId");
                                window.location.href = "notifblue.html?tipe=teruskan";
                            } else {
                                const err = await res.json();
                                showAlert(err.error || "Gagal meneruskan surat.");
                                btnTeruskan.disabled = false;
                                btnTeruskan.textContent = "→ Teruskan ke Waka";
                            }
                        } catch (e) {
                            console.error(e);
                            showAlert("Server tidak bisa diakses.");
                            btnTeruskan.disabled = false;
                            btnTeruskan.textContent = "→ Teruskan ke Waka";
                        }
                    });

                } else {
                    if (areaTeruskan) areaTeruskan.style.display = "none";
                    if (btnTeruskan) btnTeruskan.style.display = "none";
                }
            }

        } catch (err) {
            console.error(err);
        }
    }

    loadDetail();

})();