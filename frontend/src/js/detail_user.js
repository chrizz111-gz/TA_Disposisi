// detail_user.js — User lihat detail surat + catatan kepsek (read only)
(function () {

    const user = getUser();
    if (!user) { window.location.href = "login.html"; return; }

    const suratId = localStorage.getItem("selectedSuratId");
    if (!suratId) { window.location.href = "home_user.html"; return; }

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
        localStorage.removeItem("selectedSuratId");
        localStorage.removeItem("selectedDisposisiId");
        localStorage.removeItem("selectedSuratType");
        const fromHist = localStorage.getItem("fromHistory");
        localStorage.removeItem("fromHistory");
        if (fromHist === "true") {
            window.location.href = "history_user.html";
        } else {
            const activeJabatan = getActiveJabatan().toLowerCase();
            if (activeJabatan.startsWith("waka") || activeJabatan === "koordinator waka") {
                window.location.href = "homeWaka.html";
            } else {
                window.location.href = "home_user.html";
            }
        }
    });

    async function markAsRead(disposisiId) {
        try {
            await fetch("http://localhost:7000/disposisi/baca", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + localStorage.getItem("token")
                },
                body: JSON.stringify({ disposisi_id: disposisiId })
            });
        } catch (e) {
            console.error("Gagal mark as read:", e);
        }
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

                const lampiranBox = document.getElementById("lampiranBox");
                if (lampiranBox && surat.file_pdf) {
                    const pdfUrl = "http://localhost:7000/" + surat.file_pdf.replace(/\\/g, "/");
                    const fileName = surat.file_pdf.split("/").pop() || "dokumen.pdf";
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

            const resDisp = await apiGetDisposisi(suratId);
            if (resDisp?.ok) {
                const disp = (await resDisp.json()).data;
                document.getElementById("valKepsek").value = disp.kepsek?.name || disp.kepsek?.nama || "-";
                document.getElementById("valApprovalAt").value = formatTanggal(disp.approval_at);
                document.getElementById("valCatatanKepsek").value = disp.catatan_kepsek || "-";
                document.getElementById("valTanggapan").value = disp.tanggapan_saran || "-";
                document.getElementById("valProses").value = disp.proses_lanjut || "-";
                document.getElementById("valKoordinasi").value = disp.koordinasi_konfirmasi || "-";

                // Catatan Waka — cari distribusi yang ditujukan ke user ini
                const distribusiUser = (disp.distribusi || []).find(dist =>
                    dist.id_user === user.id
                );
                if (distribusiUser && distribusiUser.catatan_waka) {
                    const cardWaka = document.getElementById("cardCatatanWaka");
                    if (cardWaka) cardWaka.style.display = "block";
                    const elNamaWaka = document.getElementById("valNamaWaka");
                    if (elNamaWaka) elNamaWaka.value = distribusiUser.waka?.name || distribusiUser.waka?.nama || "-";
                    const elCatatanWaka = document.getElementById("valCatatanWaka");
                    if (elCatatanWaka) elCatatanWaka.value = distribusiUser.catatan_waka;
                }

                await markAsRead(disp.id);
            }

        } catch (err) {
            console.error(err);
        }
    }

    loadDetail();
})();