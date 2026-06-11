// home_user.js — Dashboard User (Waka/BKK/etc)
// Menampilkan surat masuk yang BELUM dibaca oleh jabatan user
(function () {
    const user = getUser();
    if (!user) { window.location.href = "login.html"; return; }

    const aktif = getActiveJabatan().toLowerCase();
    if (aktif === "admin" || aktif === "pegawai") { window.location.href = "login.html"; return; }
    if (aktif === "kepala sekolah") { window.location.href = "login.html"; return; }

    const cardContainer = document.querySelector(".card-container");
    const searchInput = document.getElementById("searchInput");

    let allData = [];

    // Ambil semua jabatan user
    const userJabatanList = (user.jabatans || []).map(j => ({
        original: j,
        lower: j.toLowerCase().trim(),
        upper: j.toUpperCase()
    }));

    function formatTanggal(isoString) {
        if (!isoString || isoString.startsWith("0001")) return "-";
        const date = new Date(isoString);
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    }

    function renderCard(disposisi, distribusiUser) {
        const surat = disposisi.surat_masuk || {};
        const tanggal = formatTanggal(surat.tanggal_surat || disposisi.created_at);
        const suratId = disposisi.id_surat_masuk || surat.id;
        const disposisiId = disposisi.id;
        const jabatanNama = distribusiUser.jabatan?.nama_jabatan || "-";

        const card = document.createElement("article");
        card.className = "card blue";
        card.innerHTML = `
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
                <span>Jabatan</span><span>: ${jabatanNama.toUpperCase()}</span>
            </p>
            <div class="card-footer">
                <span class="status-badge bg-yellow">Menunggu</span>
                <button class="btn-blue">Lihat</button>
            </div>
            <img src="../assets/mascot1.png" class="maskot" alt="">
        `;

        card.querySelector(".btn-blue").addEventListener("click", () => {
            localStorage.setItem("selectedSuratId", suratId);
            localStorage.setItem("selectedDisposisiId", disposisiId);
            localStorage.setItem("selectedSuratType", "masuk");
            localStorage.setItem("fromHistory", "false");

            window.location.href = "detail_user.html";
        });

        return card;
    }

    async function loadDashboard() {
        cardContainer.innerHTML = '<p style="padding:1rem">Memuat surat...</p>';
        try {
            const res = await apiListDisposisi();
            if (!res || !res.ok) {
                cardContainer.innerHTML = '<p style="padding:1rem;color:red">Gagal memuat data.</p>';
                return;
            }

            const data = (await res.json()).data || [];

            // Filter: distribusi yang ditujukan ke user ini (via jabatan ATAU via id_user langsung)
            allData = [];
            data.forEach(d => {
                const distribusiBelumBaca = (d.distribusi || []).filter(dist => {
                    const namaJabatan = (dist.jabatan?.nama_jabatan || "").toLowerCase().trim();
                    const statusDist = (dist.status || "").toLowerCase();
                    const matchByJabatan = userJabatanList.some(uj => uj.lower === namaJabatan);
                    const matchByUser = dist.id_user === user.id;
                    return (matchByJabatan || matchByUser) && (statusDist === "belum_dibaca" || statusDist === "diteruskan_waka");
                });

                if (distribusiBelumBaca.length > 0) {
                    allData.push({
                        disposisi: d,
                        distribusiUser: distribusiBelumBaca[0]
                    });
                }
            });

            // Filter search
            const searchQuery = searchInput?.value?.trim().toLowerCase() || "";
            if (searchQuery) {
                allData = allData.filter(item => {
                    const surat = item.disposisi.surat_masuk || {};
                    return (
                        (surat.no_surat || "").toLowerCase().includes(searchQuery) ||
                        (surat.perihal_surat || "").toLowerCase().includes(searchQuery) ||
                        (surat.asal_surat || "").toLowerCase().includes(searchQuery)
                    );
                });
            }

            if (allData.length === 0) {
                cardContainer.innerHTML = '<div class="empty-state"><span class="icon">✉</span> Tidak ada surat yang perlu diproses.</div>';
                return;
            }

            cardContainer.innerHTML = "";
            allData.forEach(item => {
                cardContainer.appendChild(renderCard(item.disposisi, item.distribusiUser));
            });

        } catch (err) {
            console.error(err);
            cardContainer.innerHTML = '<p style="padding:1rem;color:red">Server tidak bisa diakses.</p>';
        }
    }

    searchInput?.addEventListener("input", () => {
        loadDashboard();
    });

    loadDashboard();
})();