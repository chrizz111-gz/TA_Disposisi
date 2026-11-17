// output_disposisi_keluar.js — TU lihat hasil keputusan Kepsek untuk surat keluar
(function () {
    const user = getUser();
    if (!user) { window.location.href = "login.html"; return; }

    const suratId = localStorage.getItem("selectedSuratId");
    const fromHistory = localStorage.getItem("fromHistory") === "true";

    if (!suratId) { window.location.href = "home.html"; return; }

    function formatTanggal(iso) {
        if (!iso || iso.startsWith("0001")) return "-";
        return new Date(iso).toLocaleDateString("id-ID", {
            day: "numeric", month: "long", year: "numeric"
        });
    }

    async function loadDetail() {
        try {
            const res = await apiGetSuratKeluar(suratId);
            if (!res?.ok) return;

            const surat = (await res.json()).data;

            document.getElementById("valNoSurat").textContent = surat.no_surat || "-";
            document.getElementById("valKode").textContent = surat.kode_surat || "-";
            document.getElementById("valPerihal").textContent = surat.perihal || "-";
            document.getElementById("valTujuan").textContent = surat.tujuan || "-";
            document.getElementById("valTanggal").textContent = formatTanggal(surat.tanggal_surat);

            const lampiranBox = document.getElementById("lampiranBox");
            if (lampiranBox && surat.file_pdf) {
                const pdfUrl = "http://localhost:7000/" + surat.file_pdf.replace(/\\/g, "/");
                const fileName = surat.file_pdf.split(/[\\/]/).pop() || "dokumen.pdf";
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
            }

            const statusEl = document.getElementById("valStatus");
            if (statusEl) {
                const statusMap = {
                    "disetujui": { label: "Disetujui", bg: "#3CC15F" },
                    "ditolak": { label: "Ditolak", bg: "#e84848" },
                    "menunggu": { label: "Menunggu", bg: "#E8C048" },
                };
                const s = statusMap[surat.status_verifikasi] || statusMap["menunggu"];
                statusEl.textContent = s.label;
                statusEl.style.background = s.bg;
            }

            document.getElementById("valKepsek").value =
                surat.verifikator?.name || surat.verifikator?.nama || "-";
            document.getElementById("valApprovalAt").value =
                formatTanggal(surat.tanggal_verifikasi);
            document.getElementById("valCatatanKepsek").value =
                surat.catatan_verifikasi || "-";

        } catch (err) {
            console.error(err);
        }
    }

    // Tombol kembali — sesuai dari mana dibuka
    document.getElementById("btnKembali")?.addEventListener("click", () => {
        localStorage.removeItem("fromHistory");
        if (fromHistory) {
            window.location.href = "history.html";
        } else {
            window.location.href = getDashboardUrl(getActiveJabatan());
        }
    });

    loadDetail();
})();