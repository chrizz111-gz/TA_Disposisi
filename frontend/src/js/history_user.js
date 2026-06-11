// history_user.js — Riwayat surat untuk User biasa (Waka/BKK/etc)
(function () {
    const user = getUser();
    if (!user) { window.location.href = "login.html"; return; }

    const aktif = getActiveJabatan().toLowerCase();
    if (aktif === "admin" || aktif === "pegawai") { window.location.href = "login.html"; return; }
    if (aktif === "kepala sekolah") { window.location.href = "login.html"; return; }

    const tbody = document.getElementById("tableBody");
    const filterJabatanEl = document.getElementById("filterJabatan");

    let allData = [];
    let activeTab = "semua";
    let activeStatus = "semua";
    let activeJabatan = "semua";
    let activeDate = "";
    let activeSort = "terbaru";
    let searchQuery = "";

    // AMBIL SEMUA JABATAN USER
    const userJabatanList = (user.jabatans || []).map(j => ({
        original: j,
        lower: j.toLowerCase().trim(),
        upper: j.toUpperCase()
    }));

    // ISI DROPDOWN FILTER JABATAN
    function initJabatanFilter() {
        userJabatanList.forEach(j => {
            const opt = document.createElement("option");
            opt.value = j.lower;
            opt.textContent = j.upper;
            filterJabatanEl.appendChild(opt);
        });
    }

    function formatTanggal(isoString) {
        if (!isoString || isoString.startsWith("0001")) return "-";
        return new Date(isoString).toLocaleDateString("id-ID", {
            day: "numeric", month: "short", year: "numeric"
        });
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
            if (activeJabatan !== "semua" && !row.jabatans.includes(activeJabatan)) return false;
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
            tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:1rem">Tidak ada data.</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map((row, i) => `
            <tr data-status="${row.status}" data-jenis="${row.jenis}">
                <td>${i + 1}</td>
                <td>Surat Masuk</td>
                <td>${formatTanggal(row.tanggal)}</td>
                <td>${formatWaktu(row.tanggal)}</td>
                <td>${row.no_surat || "-"}</td>
                <td>${row.asal || "-"}</td>
                <td>${row.perihal || "-"}</td>
                <td><span class="jabatan-badge-table">${row.jabatanLabels}</span></td>
                <td><span class="status ok">${row.statusLabel}</span></td>
                <td><button class="btn-view" data-id="${row.id}">Lihat</button></td>
            </tr>
        `).join("");

        tbody.querySelectorAll(".btn-view").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.dataset.id;
                localStorage.setItem("selectedSuratId", id);
                localStorage.setItem("selectedSuratType", "masuk");
                localStorage.setItem("fromHistory", "true");
                window.location.href = "detail_user.html";
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

    filterJabatanEl?.addEventListener("change", e => {
        activeJabatan = e.target.value;
        renderTable();
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
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:1rem">Memuat...</td></tr>`;
        try {
            const res = await apiListDisposisi();
            if (!res || !res.ok) {
                tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:red">Gagal memuat data.</td></tr>`;
                return;
            }

            const isUserWaka = aktif.startsWith("waka") || aktif === "koordinator waka";
            const data = (await res.json()).data || [];

            allData = data
                .filter(d => {
                    // Cek apakah ada distribusi untuk user ini dengan status "dibaca" atau diteruskan oleh waka
                    const matchingRows = (d.distribusi || [])
                        .filter(dist => {
                            const namaJabatan = (dist.jabatan?.nama_jabatan || "").toLowerCase().trim();
                            const statusDist = (dist.status || "").toLowerCase();
                            const matchByJabatan = userJabatanList.some(uj => uj.lower === namaJabatan);
                            const matchByUser = dist.id_user === user.id;
                            
                            if (isUserWaka) {
                                return dist.id_waka === user.id || ((matchByJabatan || matchByUser) && statusDist === "dibaca");
                            } else {
                                return (matchByJabatan || matchByUser) && statusDist === "dibaca";
                            }
                        });

                    return matchingRows.length > 0;
                })
                .map(d => {
                    const surat = d.surat_masuk || {};

                    // Ambil label jabatan untuk distribusi yang match user ini
                    const matchedDists = (d.distribusi || [])
                        .filter(dist => {
                            const namaJabatan = (dist.jabatan?.nama_jabatan || "").toLowerCase().trim();
                            const statusDist = (dist.status || "").toLowerCase();
                            const matchByJabatan = userJabatanList.some(uj => uj.lower === namaJabatan);
                            const matchByUser = dist.id_user === user.id;
                            if (isUserWaka) {
                                return dist.id_waka === user.id || ((matchByJabatan || matchByUser) && statusDist === "dibaca");
                            } else {
                                return (matchByJabatan || matchByUser) && statusDist === "dibaca";
                            }
                        });

                    const jabatans = [...new Set(
                        matchedDists.map(dist => {
                            const nama = (dist.jabatan?.nama_jabatan || "").toLowerCase().trim();
                            if (nama) return nama;
                            // Jika jabatan null (karena waka forward), gunakan activeJabatan
                            return getActiveJabatan().toLowerCase().trim();
                        })
                    )];

                    const jabatanLabels = jabatans
                        .map(j => userJabatanList.find(uj => uj.lower === j)?.upper || j.toUpperCase())
                        .join(" / ");

                    // Status: ambil dari status_approval atau status_disposisi
                    // Semua yang masuk history sudah disetujui oleh kepsek
                    const approvalStatus = (d.status_approval || "").toLowerCase();
                    const disposisiStatus = (d.status_disposisi || "").toLowerCase();

                    let status = "disetujui";
                    let statusLabel = "Disetujui";

                    if (approvalStatus === "disetujui" || disposisiStatus === "selesai") {
                        status = "disetujui";
                        statusLabel = "Disetujui";
                    } else if (approvalStatus === "ditolak") {
                        status = "ditolak";
                        statusLabel = "Ditolak";
                    }

                    return {
                        jenis: "masuk",
                        id: d.id_surat_masuk || surat.id,
                        no_surat: surat.no_surat,
                        perihal: surat.perihal_surat,
                        asal: surat.asal_surat,
                        tanggal: d.created_at || surat.created_at,
                        status: status,
                        statusLabel: statusLabel,
                        jabatans: jabatans,
                        jabatanLabels: jabatanLabels
                    };
                });

            renderTable();

        } catch (err) {
            console.error(err);
            tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;color:red">Server tidak bisa diakses.</td></tr>`;
        }
    }

    // INIT
    initJabatanFilter();
    loadHistory();
})();