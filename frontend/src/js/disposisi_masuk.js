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
                window.location.href = "homeKepsek.html";
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