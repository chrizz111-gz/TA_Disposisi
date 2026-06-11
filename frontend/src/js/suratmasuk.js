// suratmasuk.js — Form input surat masuk baru

const KEPSEK_ID = 1;
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1 MB dalam bytes

let redirectUrl = "";

// Tampilkan popup alert
function showAlert(msg, url = "") {
    document.getElementById("alertMessage").innerText = msg;
    document.getElementById("customAlert").style.display = "flex";
    redirectUrl = url;
}

// Tutup popup alert
function closeAlert() {
    document.getElementById("customAlert").style.display = "none";
    if (redirectUrl) window.location.href = redirectUrl;
}

// Tutup alert jika klik di luar alert-box
document.getElementById("customAlert").addEventListener("click", function (e) {
    if (e.target === this) closeAlert();
});

// Set max tanggal = hari ini (tanggal mendatang di-disable)
(function () {
    const today = new Date().toISOString().split("T")[0];
    const inputTanggal = document.getElementById("tanggalSurat");
    if (inputTanggal) inputTanggal.max = today;
})();

let selectedFile = null;

// Trigger klik input file tersembunyi
document.getElementById("btnUpload").addEventListener("click", () => {
    document.getElementById("fileSurat").click();
});
const previewBox = document.querySelector(".preview-box");
if (previewBox) {
    previewBox.addEventListener("click", () => {
        document.getElementById("fileSurat").click();
    });
}

// Handle pemilihan file
document.getElementById("fileSurat").addEventListener("change", (e) => {
    const file = e.target.files[0];
    const preview = document.querySelector(".preview-box");

    if (!file) return;

    // Validasi ukuran file maksimal 1 MB
    if (file.size > MAX_FILE_SIZE) {
        selectedFile = null;
        e.target.value = ""; // reset input file
        if (preview) preview.innerHTML = "";
        showAlert("Hanya boleh unggah PDF dengan ukuran maksimal 1MB.");
        return;
    }

    selectedFile = file;
    if (preview) {
        const sizeMB = (selectedFile.size / 1024 / 1024).toFixed(2);
        preview.innerHTML = `
            <span class="file-icon">📄</span>
            <span class="file-name">${selectedFile.name}</span>
            <span style="font-size:12px;color:rgba(255,255,255,0.8)">${sizeMB} MB</span>
        `;
    }
});

// Handle submit form
document.getElementById("btnSubmit").addEventListener("click", async () => {
    const asal = document.getElementById("asalSurat").value.trim();
    const no = document.getElementById("noSurat").value.trim();
    const perihal = document.getElementById("perihalSurat").value.trim();
    const tanggal = document.getElementById("tanggalSurat").value;

    if (!asal || !no || !perihal || !tanggal) {
        showAlert("Semua field wajib diisi.");
        return;
    }
    if (!selectedFile) {
        showAlert("File PDF wajib diunggah.");
        return;
    }

    const btn = document.getElementById("btnSubmit");
    btn.disabled = true;
    btn.textContent = "Mengirim...";

    try {
        // Step 1: Upload surat masuk
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("no_surat", no);
        formData.append("perihal_surat", perihal);
        formData.append("asal_surat", asal);
        formData.append("tanggal_surat", tanggal);

        const resSurat = await apiUploadSuratMasuk(formData);
        const dataSurat = await resSurat.json();

        console.log("Response upload:", dataSurat);

        if (!resSurat.ok) {
            showAlert(dataSurat.error || "Gagal mengirim surat.");
            btn.disabled = false;
            btn.textContent = "Kirim";
            return;
        }

        // Ambil ID surat dari berbagai kemungkinan field
        const suratId = dataSurat.surat?.id
            || dataSurat.surat?.id_surat_masuk
            || dataSurat.id
            || dataSurat.id_surat_masuk;

        console.log("Surat ID:", suratId);

        if (!suratId) {
            showAlert("Surat tersimpan tapi ID tidak ditemukan.");
            btn.disabled = false;
            btn.textContent = "Submit";
            return;
        }

        // Step 2: Buat disposisi ke Kepsek
        const resDisposisi = await apiCreateDisposisi(
            suratId,
            KEPSEK_ID,
            "",                              // sifat
            "Mohon ditinjau dan disetujui"   // catatan
        );

        console.log("Response disposisi:", resDisposisi?.status);

        if (!resDisposisi || !resDisposisi.ok) {
            const errData = resDisposisi ? await resDisposisi.json() : null;
            console.warn("Disposisi gagal:", errData?.error);
            showAlert("Surat tersimpan, tapi gagal dikirim ke Kepsek: " + (errData?.error || "unknown"));
            btn.disabled = false;
            btn.textContent = "Submit";
            return;
        }

        // Step 3: Redirect ke halaman notifikasi
        window.location.href = "notifblue.html";

    } catch (err) {
        console.error(err);
        showAlert("Server tidak bisa diakses.");
        btn.disabled = false;
        btn.textContent = "Submit";
    }
});