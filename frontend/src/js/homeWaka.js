// homeWaka.js — Dashboard Waka: lihat surat masuk yang perlu ditindaklanjuti
(function () {
    const user = getUser();
    if (!user) { window.location.href = "login.html"; return; }

    const aktif = getActiveJabatan().toLowerCase();
    if (!aktif.startsWith("waka") && aktif !== "koordinator waka") {
        window.location.href = "login.html"; return;
    }

    const cardContainer = document.querySelector(".card-container");
    const searchInput = document.getElementById("searchInput");

    function formatTanggal(isoString) {
        if (!isoString || isoString.startsWith("0001")) return "-";
        const date = new Date(isoString);
        if (isNaN(date.getTime()) || date.getFullYear() < 2000) return "-";
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    }

    function getStatusBadge(status) {
        const map = {
            "menunggu_waka": { cls: "bg-yellow", label: "Perlu Tindakan" },
            "belum_dibaca": { cls: "bg-yellow", label: "Menunggu" },
            "sedang_dikerjakan": { cls: "bg-yellow", label: "Diproses" },
            "diteruskan_waka": { cls: "bg-green", label: "Sudah Diteruskan" },
            "selesai": { cls: "bg-green", label: "Selesai" },
            "dibaca": { cls: "bg-green", label: "Sudah Dibaca" },
        };
        return map[status] || { cls: "bg-yellow", label: status };
    }

    function renderCard(disposisi, distribusi) {
        const surat = disposisi.surat_masuk || {};
        const status = distribusi.status || "menunggu_waka";
        const { cls, label } = getStatusBadge(status);
        const tanggal = formatTanggal(surat.tanggal_surat || surat.created_at);
        const isNew = status === "menunggu_waka";

        const card = document.createElement("article");
        card.className = "card blue";
        card.innerHTML = `
            ${isNew ? '<span class="badge-new">Perlu Tindakan</span>' : ""}
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
                <span>Catatan Kepsek</span><span>: ${disposisi.catatan_kepsek || "-"}</span>
            </p>
            <div class="card-footer">
                <span class="status-badge ${cls}">${label}</span>
                <button class="btn-blue">Lihat</button>
            </div>
            <img src="../assets/mascot1.png" class="maskot" alt="">
        `;

        card.querySelector(".btn-blue").addEventListener("click", () => {
            localStorage.setItem("selectedDisposisiId", disposisi.id);
            localStorage.setItem("selectedSuratId", disposisi.id_surat_masuk ?? surat.id);
            localStorage.setItem("selectedDistribusiId", distribusi.id_penerima_disposisi);
            window.location.href = "detail_waka.html";
        });

        return card;
    }

    async function loadDashboard() {
        cardContainer.innerHTML = '<p style="padding:1rem">Memuat surat...</p>';
        try {
            const res = await apiListDisposisi();
            const data = res?.ok ? (await res.json()).data || [] : [];

            // Ambil jabatan waka yang aktif
            const jabatanAktif = getActiveJabatan().toLowerCase();

            // Kumpulkan cards: cari distribusi yang sesuai jabatan waka ini dan statusnya "menunggu_waka"
            const cards = [];
            data.forEach(d => {
                const distribusiList = d.distribusi || [];
                const distribusiWaka = distribusiList.find(dist => {
                    const namaJab = (dist.jabatan?.nama_jabatan || "").toLowerCase();
                    const statusDist = dist.status || "menunggu_waka";
                    return namaJab === jabatanAktif && statusDist === "menunggu_waka";
                });
                if (distribusiWaka) {
                    cards.push({ disposisi: d, distribusi: distribusiWaka });
                }
            });

            // Filter search
            const searchQuery = searchInput?.value?.trim().toLowerCase() || "";
            let filteredCards = cards;
            if (searchQuery) {
                filteredCards = cards.filter(c => {
                    const surat = c.disposisi.surat_masuk || {};
                    const no = (surat.no_surat || "").toLowerCase();
                    const perihal = (surat.perihal_surat || "").toLowerCase();
                    const asal = (surat.asal_surat || "").toLowerCase();
                    const catatan = (c.disposisi.catatan_kepsek || "").toLowerCase();
                    return no.includes(searchQuery) || perihal.includes(searchQuery) || asal.includes(searchQuery) || catatan.includes(searchQuery);
                });
            }

            if (filteredCards.length === 0) {
                cardContainer.innerHTML = '<div class="empty-state"><span class="icon">✉</span> Tidak ada surat.</div>';
                return;
            }

            cardContainer.innerHTML = "";
            filteredCards.forEach(c => cardContainer.appendChild(renderCard(c.disposisi, c.distribusi)));

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