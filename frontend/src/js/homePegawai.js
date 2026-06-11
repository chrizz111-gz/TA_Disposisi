// homePegawai.js — Dashboard Pegawai (sama seperti admin tapi tanpa manajemen akun)
(function () {
    const user = getUser();
    if (!user) { window.location.href = "login.html"; return; }

    const aktif = getActiveJabatan().toLowerCase();
    if (aktif !== "pegawai") {
        window.location.href = getDashboardUrl(aktif);
        return;
    }

    const cardContainer = document.querySelector(".card-container");
    const searchInput = document.getElementById("searchInput");

    function formatTanggal(isoString) {
        if (!isoString) return "-";
        const date = new Date(isoString);
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    }

    function getStatusBadge(status) {
        const map = {
            "menunggu": { cls: "bg-yellow", label: "Menunggu" },
            "diterima_tu": { cls: "bg-yellow", label: "Menunggu" },
            "disposisi_kepsek": { cls: "bg-yellow", label: "Menunggu" },
            "diteruskan": { cls: "bg-green", label: "Diteruskan" },
            "disetujui": { cls: "bg-green", label: "Disetujui" },
            "ditolak": { cls: "bg-red", label: "Ditolak" },
            "selesai": { cls: "bg-green", label: "Selesai" },
        };
        return map[status] || { cls: "bg-yellow", label: "Menunggu" };
    }

    function renderCardMasuk(surat) {
        const status = surat.status_verifikasi || surat.status_alur || "menunggu";
        const { cls, label } = getStatusBadge(status);
        const tanggal = formatTanggal(surat.created_at);
        const isNew = ["disetujui", "ditolak"].includes(surat.status_verifikasi);
        const suratId = surat.id_surat_masuk || surat.id;
        const disposisiAktif = surat.id_disposisi_aktif || null;

        const card = document.createElement("article");
        card.className = "card blue";
        card.innerHTML = `
            ${isNew ? '<span class="badge-new">Surat Baru</span>' : ""}
            <div class="card-header">
                <span class="tanggal">${tanggal}</span>
                <span class="title">
                    <img src="../assets/surat-masuk.png" class="title-icon" alt="">
                    SURAT MASUK
                </span>
            </div>
            <p class="detail-surat">
                <span>No. Surat</span><span>: ${surat.no_surat || "-"}</span>
                <span>Asal</span><span>: ${surat.asal_surat || "-"}</span>
                <span>Perihal</span><span>: ${surat.perihal_surat || "-"}</span>
            </p>
            <div class="card-footer">
                <span class="status-badge ${cls}">${label}</span>
                <button class="btn-blue">Lihat</button>
            </div>
            <img src="../assets/mascot1.png" class="maskot" alt="">
        `;

        card.querySelector(".btn-blue").addEventListener("click", async () => {
            localStorage.setItem("selectedSuratId", suratId);
            localStorage.setItem("selectedSuratType", "masuk");
            localStorage.setItem("fromHistory", "false");

            if (isNew) {
                card.style.transition = "opacity 0.3s";
                card.style.opacity = "0";
                setTimeout(() => {
                    card.remove();
                    if (disposisiAktif && disposisiAktif !== "null") {
                        localStorage.setItem("selectedDisposisiId", disposisiAktif);
                    }
                    window.location.href = "output_disposisi_masuk.html";
                }, 300);
            } else {
                window.location.href = "detailmasuk.html";
            }
        });

        return card;
    }

    function renderCardKeluar(surat) {
        const status = surat.status_verifikasi || "menunggu";
        const { cls, label } = getStatusBadge(status);
        const tanggal = formatTanggal(surat.created_at);
        const sudahDiproses = ["disetujui", "ditolak"].includes(surat.status_verifikasi);
        const suratId = surat.id_surat_keluar || surat.id;

        const card = document.createElement("article");
        card.className = "card orange";
        card.innerHTML = `
            ${sudahDiproses ? '<span class="badge-new">Surat Baru</span>' : ""}
            <div class="card-header">
                <span class="tanggal">${tanggal}</span>
                <span class="title">
                    <img src="../assets/surat-keluar.png" class="title-icon" alt="">
                    SURAT KELUAR
                </span>
            </div>
            <p class="detail-surat">
                <span>No. Surat</span><span>: ${surat.no_surat || "-"}</span>
                <span>Tujuan</span><span>: ${surat.tujuan || "-"}</span>
                <span>Perihal</span><span>: ${surat.perihal || surat.perihal_surat || "-"}</span>
            </p>
            <div class="card-footer">
                <span class="status-badge ${cls}">${label}</span>
                <button class="btn-blue">Lihat</button>
            </div>
            <img src="../assets/mascot2.png" class="maskot" alt="">
        `;

        card.querySelector(".btn-blue").addEventListener("click", async () => {
            localStorage.setItem("selectedSuratId", suratId);
            localStorage.setItem("selectedSuratType", "keluar");
            localStorage.setItem("fromHistory", "false");

            if (sudahDiproses) {
                if (typeof apiSelesaikanSuratKeluar === "function") {
                    await apiSelesaikanSuratKeluar(suratId);
                }
                card.style.transition = "opacity 0.3s";
                card.style.opacity = "0";
                setTimeout(() => {
                    card.remove();
                    window.location.href = "output_disposisi_keluar.html";
                }, 300);
            } else {
                window.location.href = "detailkeluar.html";
            }
        });

        return card;
    }

    async function loadSurat() {
        cardContainer.innerHTML = '<p style="padding:1rem">Memuat surat...</p>';
        try {
            const [resMasuk, resKeluar] = await Promise.all([
                apiListSuratMasuk(),
                apiListSuratKeluar()
            ]);

            const dataMasuk = resMasuk?.ok ? (await resMasuk.json()).data || [] : [];
            const dataKeluar = resKeluar?.ok ? (await resKeluar.json()).data || [] : [];

            // Filter: Hanya tampilkan surat yang belum selesai diproses
            // 1. Surat Masuk: Hilang jika sudah diteruskan atau selesai
            const filteredMasuk = dataMasuk.filter(s => s.status_alur !== "diteruskan" && s.status_alur !== "selesai");

            // 2. Surat Keluar: Hilang jika sudah selesai
            const filteredKeluar = dataKeluar.filter(s => s.status_alur !== "selesai");

            const semua = [
                ...filteredMasuk.map(s => ({ ...s, _jenis: "masuk" })),
                ...filteredKeluar.map(s => ({ ...s, _jenis: "keluar" }))
            ];

            // Filter search
            const searchQuery = searchInput?.value?.trim().toLowerCase() || "";
            let filteredData = semua;
            if (searchQuery) {
                filteredData = semua.filter(s => {
                    const no = (s.no_surat || "").toLowerCase();
                    const perihal = (s.perihal || s.perihal_surat || "").toLowerCase();
                    const asal = (s.asal_surat || "").toLowerCase();
                    const tujuan = (s.tujuan || "").toLowerCase();
                    return no.includes(searchQuery) || perihal.includes(searchQuery) || asal.includes(searchQuery) || tujuan.includes(searchQuery);
                });
            }

            if (filteredData.length === 0) {
                cardContainer.innerHTML = '<div class="empty-state"><span class="icon">✉</span> Tidak ada surat.</div>';
                return;
            }

            cardContainer.innerHTML = "";
            filteredData.forEach(s => {
                cardContainer.appendChild(s._jenis === "masuk" ? renderCardMasuk(s) : renderCardKeluar(s));
            });

        } catch (err) {
            console.error(err);
            cardContainer.innerHTML = '<p style="padding:1rem;color:red">Server tidak bisa diakses.</p>';
        }
    }

    searchInput?.addEventListener("input", () => {
        loadSurat();
    });

    loadSurat();

})();