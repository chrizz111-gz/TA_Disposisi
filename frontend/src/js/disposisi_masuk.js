// disposisi_masuk.js — Kepsek lihat & approve/reject surat masuk (TANPA pilih jabatan)
(function () {

    const user = getUser();
    if (!user) { window.location.href = "login.html"; return; }

    const disposisiId = localStorage.getItem("selectedDisposisiId");
    const suratId = localStorage.getItem("selectedSuratId");

    if (!disposisiId || !suratId) {
        window.location.href = "homeKepsek.html"; return;
    }

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

    function formatTanggal(iso) {
        if (!iso) return "-";
        return new Date(iso).toLocaleDateString("id-ID", {
            day: "numeric", month: "long", year: "numeric"
        });
    }

    async function loadDetail() {
        try {
            const resSurat = await apiGetSuratMasuk(suratId);
            if (resSurat?.ok) {
                const surat = (await resSurat.json()).data;
                document.getElementById("valNoSurat").textContent = surat.no_surat || "-";
                document.getElementById("valTanggal").textContent = formatTanggal(surat.tanggal_surat);
                document.getElementById("valAsal").textContent = surat.asal_surat || "-";
                document.getElementById("valPerihal").textContent = surat.perihal_surat || "-";

                if (surat.file_pdf) {
                    const lampiranBox = document.getElementById("lampiranBox");
                    if (lampiranBox) {
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
                    }
                }
            }
        } catch (err) {
            console.error(err);
        }
    }

    const statusSurat = document.getElementById("statusSurat");
    const formTerima = document.getElementById("formTerima");
    const formTolak = document.getElementById("formTolak");
    const buttonArea = document.getElementById("buttonArea");

    statusSurat.addEventListener("change", function () {
        formTerima.classList.add("hidden");
        formTolak.classList.add("hidden");
        buttonArea.classList.add("hidden");

        if (this.value === "terima") {
            formTerima.classList.remove("hidden");
            buttonArea.classList.remove("hidden");
        } else if (this.value === "tolak") {
            formTolak.classList.remove("hidden");
            buttonArea.classList.remove("hidden");
        }
    });

    document.getElementById("btnTeruskan").addEventListener("click", async () => {
        const status = statusSurat.value;
        if (!status) { showAlert("Pilih status surat terlebih dahulu."); return; }

        const isApproved = status === "terima";
        const btn = document.getElementById("btnTeruskan");

        let body = {
            disposisi_id: parseInt(disposisiId),
            is_approved: isApproved,
        };

        if (isApproved) {
            body.tanggapan_saran = document.getElementById("tanggapanSaran")?.value.trim() || "";
            body.proses_lanjut = document.getElementById("prosesLanjut")?.value.trim() || "";
            body.catatan_kepsek = document.getElementById("catatanTerima")?.value.trim() || "";
            body.koordinasi_konfirmasi = document.getElementById("koordinasiKonfirmasi")?.value.trim() || "";
        } else {
            body.catatan_kepsek = document.getElementById("catatanTolak")?.value.trim() || "";
            if (!body.catatan_kepsek) {
                showAlert("Masukkan alasan penolakan."); return;
            }
        }

        btn.disabled = true;
        btn.textContent = "Memproses...";

        try {
            const res = await apiFetch("/disposisi/approve", {
                method: "POST",
                body: JSON.stringify(body)
            });

            if (!res || !res.ok) {
                const data = res ? await res.json() : {};
                showAlert(data.error || "Gagal memproses disposisi.");
                btn.disabled = false;
                btn.textContent = "← Teruskan";
                return;
            }

            localStorage.removeItem("selectedDisposisiId");
            localStorage.removeItem("selectedSuratId");

            if (isApproved) {
                window.location.href = "notifblue.html";
            } else {
                window.location.href = "notifblue.html?tipe=kepsek-tolak";
            }

        } catch (err) {
            console.error(err);
            showAlert("Server tidak bisa diakses.");
            btn.disabled = false;
            btn.textContent = "← Teruskan";
        }
    });

    loadDetail();

})();