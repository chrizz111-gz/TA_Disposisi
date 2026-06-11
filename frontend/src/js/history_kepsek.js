// history_kepsek.js — Riwayat surat untuk Kepala Sekolah
(function () {
    const user = getUser();
    if (!user) { window.location.href = "login.html"; return; }

    const aktif = getActiveJabatan().toLowerCase();
    if (aktif !== "kepala sekolah") { window.location.href = "login.html"; return; }

    const tbody = document.getElementById("tableBody");
    let allData = [];
    let activeTab = "semua";
    let activeStatus = "semua";
    let activeDate = "";
    let activeSort = "terbaru";
    let searchQuery = "";

    function formatTanggal(isoString) {
        if (!isoString || isoString.startsWith("0001")) return "-";
        const date = new Date(isoString);
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    }

    function formatWaktu(isoString) {
        if (!isoString || isoString.startsWith("0001")) return "-";
        return new Date(isoString).toLocaleTimeString("id-ID", {
            hour: "2-digit", minute: "2-digit"
        });
    }

    function renderTable() {
        let filtered = allData.filter(row => {
            if (activeTab !== "semua" && row.jenis !== activeTab) return false;
            if (activeStatus !== "semua" && row.status !== activeStatus) return false;
            if (activeDate) {
                const d = new Date(row.tanggal);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const rowDateString = `${year}-${month}-${day}`;
                if (rowDateString !== activeDate) return false;
            }
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                if (!row.no_surat?.toLowerCase().includes(q) &&
                    !row.perihal?.toLowerCase().includes(q) &&
                    !row.asal?.toLowerCase().includes(q)) return false;
            }
            return true;
        });

        if (activeSort === "terbaru") {
            filtered.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
        } else {
            filtered.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:1rem">Tidak ada data.</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map((row, i) => `
            <tr data-status="${row.status}" data-jenis="${row.jenis}">
                <td>${i + 1}</td>
                <td>${row.jenis === "masuk" ? "Surat Masuk" : "Surat Keluar"}</td>
                <td>${formatTanggal(row.tanggal)}</td>
                <td>${formatWaktu(row.tanggal)}</td>
                <td>${row.no_surat || "-"}</td>
                <td>${row.asal || "-"}</td>
                <td>${row.perihal || "-"}</td>
                <td><span class="status ${row.status === 'disetujui' ? 'ok' : row.status === 'ditolak' ? 'no' : 'wait'}">
                    ${row.statusLabel}
                </span></td>
                <td><button class="btn-view" data-jenis="${row.jenis}" data-id="${row.id}" data-disposisi="${row.disposisiId || ''}">Lihat</button></td>
            </tr>
        `).join("");

        tbody.querySelectorAll(".btn-view").forEach(btn => {
            btn.addEventListener("click", () => {
                const jenis = btn.dataset.jenis;
                const id = btn.dataset.id;
                const disposisiId = btn.dataset.disposisi;

                localStorage.setItem("selectedSuratId", id);
                localStorage.setItem("selectedSuratType", jenis);
                localStorage.setItem("fromHistory", "true");

                if (jenis === "masuk") {
                    if (disposisiId) {
                        localStorage.setItem("selectedDisposisiId", disposisiId);
                    }
                    window.location.href = "output_disposisi_masuk.html";
                } else {
                    window.location.href = "output_disposisi_keluar.html";
                }
            });
        });
    }

    // Tab
    document.querySelectorAll(".tab").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            activeTab = btn.dataset.jenis;
            renderTable();
        });
    });

    document.getElementById("filterStatus")?.addEventListener("change", e => {
        activeStatus = e.target.value;
        renderTable();
    });

    // Filter tanggal
    document.getElementById("filterTanggal")?.addEventListener("change", e => {
        activeDate = e.target.value;
        renderTable();
    });

    // Filter sort
    document.getElementById("filterSort")?.addEventListener("change", e => {
        activeSort = e.target.value;
        renderTable();
    });

    document.querySelector(".search")?.addEventListener("input", e => {
        searchQuery = e.target.value.trim();
        renderTable();
    });

    async function loadHistory() {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:1rem">Memuat...</td></tr>`;
        try {
            const [resDisposisi, resKeluar] = await Promise.all([
                apiListDisposisi(),
                apiListSuratKeluar()
            ]);

            const dataDisposisi = resDisposisi?.ok ? (await resDisposisi.json()).data || [] : [];
            const dataKeluar = resKeluar?.ok ? (await resKeluar.json()).data || [] : [];

            // === SURAT MASUK: yang sudah diproses oleh kepsek (approval disetujui/ditolak) ===
            const masuk = dataDisposisi
                .filter(d => {
                    const statusApproval = (d.status_approval || "").toLowerCase();
                    // Sudah diproses kepsek = disetujui atau ditolak
                    return statusApproval === "disetujui" || statusApproval === "ditolak";
                })
                .map(d => {
                    const surat = d.surat_masuk || {};
                    const status = (d.status_approval || "menunggu").toLowerCase();
                    return {
                        jenis: "masuk",
                        id: d.id_surat_masuk || surat.id,
                        disposisiId: d.id, // simpan id disposisi untuk lihat detail
                        no_surat: surat.no_surat,
                        perihal: surat.perihal_surat,
                        asal: surat.asal_surat,
                        tanggal: d.approval_at || d.created_at || surat.created_at,
                        status: status,
                        statusLabel: status === "disetujui" ? "Disetujui" : "Ditolak"
                    };
                });

            // === SURAT KELUAR: yang sudah diproses oleh kepsek (verifikasi disetujui/ditolak) ===
            const keluar = dataKeluar
                .filter(s => {
                    const status = (s.status_verifikasi || "").toLowerCase();
                    return status === "disetujui" || status === "ditolak";
                })
                .map(s => {
                    const status = (s.status_verifikasi || "menunggu").toLowerCase();
                    return {
                        jenis: "keluar",
                        id: s.id_surat_keluar || s.id,
                        no_surat: s.no_surat,
                        perihal: s.perihal,
                        asal: s.tujuan || "Internal",
                        tanggal: s.tanggal_verifikasi || s.created_at,
                        status: status,
                        statusLabel: status === "disetujui" ? "Disetujui" : "Ditolak"
                    };
                });

            allData = [...masuk, ...keluar];
            renderTable();

        } catch (err) {
            console.error(err);
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:red">Server tidak bisa diakses.</td></tr>`;
        }
    }

    loadHistory();
})();