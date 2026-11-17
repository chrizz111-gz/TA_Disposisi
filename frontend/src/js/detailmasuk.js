// detailmasuk.js — Load data surat masuk read-only

function showAlert(msg) {
    document.getElementById("alertMessage").innerText = msg;
    document.getElementById("customAlert").style.display = "flex";
}
function closeAlert() {
    document.getElementById("customAlert").style.display = "none";
}

document.getElementById("btnKembali").addEventListener("click", () => {
    localStorage.removeItem("selectedSuratId");
    localStorage.removeItem("selectedSuratType");
    window.location.href = "home.html";
});

function formatTanggal(isoString) {
    if (!isoString || isoString.startsWith("0001")) return "-";
    const date = new Date(isoString);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

async function loadDetail() {
    const suratId = localStorage.getItem("selectedSuratId");
    if (!suratId) { window.location.href = "home.html"; return; }

    try {
        const res = await apiGetSuratMasuk(suratId);
        if (!res || !res.ok) { showAlert("Gagal memuat data."); return; }

        const surat = (await res.json()).data;

        document.getElementById("asalSurat").value = surat.asal_surat || "";
        document.getElementById("noSurat").value = surat.no_surat || "";
        document.getElementById("perihalSurat").value = surat.perihal_surat || "";
        if (surat.tanggal_surat) {
            document.getElementById("tanggalSurat").value = formatTanggal(surat.tanggal_surat);
        }

        // Preview file — SVG PDF thumbnail
        const preview = document.getElementById("previewBox");
        if (preview && surat.file_pdf) {
            const pdfUrl = "http://localhost:7000/" + surat.file_pdf.replace(/\\/g, "/");
            const nama = surat.file_pdf.split(/[\\/]/).pop();
            preview.innerHTML = `
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
                    <div class="pdf-label">${nama}</div>
                    <div class="pdf-action">
                        <span>🔍 Klik untuk membuka PDF</span>
                    </div>
                </div>
            `;
        }

    } catch (err) {
        console.error(err);
        showAlert("Server tidak bisa diakses.");
    }
}

loadDetail();