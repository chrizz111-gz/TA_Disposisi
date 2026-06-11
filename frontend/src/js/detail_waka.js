// detail_waka.js — Waka lihat detail surat + isi catatan + pilih user penerima
(function () {

    const user = getUser();
    if (!user) { window.location.href = "login.html"; return; }

    const suratId = localStorage.getItem("selectedSuratId");
    const disposisiId = localStorage.getItem("selectedDisposisiId");

    if (!suratId || !disposisiId) { window.location.href = "homeWaka.html"; return; }

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
        localStorage.removeItem("selectedDistribusiId");
        window.location.href = "homeWaka.html";
    });

    async function loadUsers() {
        const container = document.getElementById("userCheckboxes");
        if (!container) return;
        try {
            const res = await apiListUserBiasa();
            if (res?.ok) {
                const data = (await res.json()).data || [];
                container.innerHTML = "";
                if (data.length === 0) {
                    container.innerHTML = '<span style="opacity:0.6;font-size:13px;">Belum ada user terdaftar</span>';
                    return;
                }
                data.forEach(u => {
                    const label = document.createElement("label");
                    label.innerHTML = `
                        <input type="checkbox" name="user_recipient" value="${u.id}">
                        <span>${u.name}</span>
                    `;
                    container.appendChild(label);
                });
            }
        } catch (e) {
            console.error("Gagal load users:", e);
        }
    }

    async function loadDetail() {
        try {
            // Load surat masuk
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

            // Load disposisi
            const resDisp = await apiGetDisposisi(suratId);
            if (resDisp?.ok) {
                const disp = (await resDisp.json()).data;

                document.getElementById("valKepsek").value = disp.kepsek?.name || disp.kepsek?.nama || "-";
                document.getElementById("valApprovalAt").value = formatTanggal(disp.approval_at);
                document.getElementById("valCatatanKepsek").value = disp.catatan_kepsek || "-";
                document.getElementById("valTanggapan").value = disp.tanggapan_saran || "-";
                document.getElementById("valProses").value = disp.proses_lanjut || "-";
                document.getElementById("valKoordinasi").value = disp.koordinasi_konfirmasi || "-";

                // Cari distribusi untuk jabatan waka yang login
                const jabatanAktif = getActiveJabatan().toLowerCase();
                const distribusiWaka = (disp.distribusi || []).find(d =>
                    (d.jabatan?.nama_jabatan || "").toLowerCase() === jabatanAktif
                );

                const formWaka = document.getElementById("formWaka");
                const infoSudah = document.getElementById("infoSudahTeruskan");
                const btnTeruskan = document.getElementById("btnTeruskan");

                if (distribusiWaka && distribusiWaka.status === "menunggu_waka") {
                    // Load semua user biasa untuk dipilih
                    await loadUsers();

                    if (formWaka) formWaka.style.display = "block";
                    if (infoSudah) infoSudah.style.display = "none";

                    btnTeruskan?.addEventListener("click", async () => {
                        const container = document.getElementById("userCheckboxes");
                        const checkedBoxes = container.querySelectorAll("input[name='user_recipient']:checked");
                        const selectedUserIds = Array.from(checkedBoxes).map(cb => parseInt(cb.value));
                        
                        if (selectedUserIds.length === 0) {
                            showAlert("Pilih minimal 1 user penerima.");
                            return;
                        }

                        const catatanWaka = document.getElementById("catatanWaka")?.value.trim() || "";

                        btnTeruskan.disabled = true;
                        btnTeruskan.textContent = "Meneruskan...";

                        try {
                            const res = await apiWakaTeruskan(
                                parseInt(disposisiId),
                                selectedUserIds,
                                catatanWaka
                            );

                            if (res?.ok) {
                                localStorage.removeItem("selectedSuratId");
                                localStorage.removeItem("selectedDisposisiId");
                                localStorage.removeItem("selectedDistribusiId");
                                window.location.href = "notifblue.html?tipe=teruskan";
                            } else {
                                const err = await res.json();
                                showAlert(err.error || "Gagal meneruskan surat.");
                                btnTeruskan.disabled = false;
                                btnTeruskan.textContent = "→ Teruskan ke User";
                            }
                        } catch (e) {
                            console.error(e);
                            showAlert("Server tidak bisa diakses.");
                            btnTeruskan.disabled = false;
                            btnTeruskan.textContent = "→ Teruskan ke User";
                        }
                    });

                } else {
                    // Sudah diteruskan atau bukan giliran waka ini
                    if (formWaka) formWaka.style.display = "none";
                    if (infoSudah) infoSudah.style.display = "block";
                }
            }

        } catch (err) {
            console.error(err);
        }
    }

    loadDetail();

})();