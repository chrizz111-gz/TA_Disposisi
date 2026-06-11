// log.js — Riwayat Aktivitas (dari API backend)

let allActivities = [];
let currentPage = 1;
const rowsPerPage = 5;
let filteredActivities = [];

// Mapping aktivitas untuk badge & label
const AKTIVITAS_MAP = {
    'login': { label: 'Masuk', class: 'badge-login' },
    'logout': { label: 'Keluar', class: 'badge-logout' },
    'create_surat': { label: 'Membuat Surat', class: 'badge-create' },
    'forward_surat': { label: 'Meneruskan Surat', class: 'badge-forward' },
    'read_surat': { label: 'Membaca Surat', class: 'badge-read' },
    'approve_surat': { label: 'Menyetujui Surat', class: 'badge-approve' },
    'reject_surat': { label: 'Menolak Surat', class: 'badge-reject' },
    'create_user': { label: 'Membuat Akun', class: 'badge-user' },
    'delete_user': { label: 'Menghapus Akun', class: 'badge-user' },
    'update_user': { label: 'Mengubah Akun', class: 'badge-user' },
    'update_settings': { label: 'Mengubah Pengaturan', class: 'badge-user' },
    'update_surat': { label: 'Mengubah Surat', class: 'badge-forward' }
};

// Format tanggal (HH/BB/TTTT)
function formatTanggal(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

function formatWaktu(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Render tabel
function renderTable(data) {
    filteredActivities = data;
    const tbody = document.getElementById('activityTable');

    if (data.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="4" class="empty-cell">Tidak ada aktivitas ditemukan.</td></tr>';
        document.getElementById('pageNumbers').innerHTML = '';
        document.getElementById('prevPage').disabled = true;
        document.getElementById('nextPage').disabled = true;
        return;
    }

    const totalPages = Math.ceil(data.length / rowsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = data.slice(start, end);

    tbody.innerHTML = pageData.map(item => {
        const aktivitas = AKTIVITAS_MAP[item.aktivitas] || {
            label: item.aktivitas || 'Lainnya',
            class: 'badge-user'
        };

        const tanggal = formatTanggal(item.created_at);
        const waktu = formatWaktu(item.created_at);

        return `
        <tr>
            <td>
                <div>${tanggal}</div>
                <div style="font-size:12px;color:#666;margin-top:4px;">
                    ${waktu}
                </div>
            </td>

            <td>
                <div class="user-cell">
                    <div class="user-avatar">👤</div>
                    <div>
                        <div style="font-weight:600;">
                            ${item.user_name || '-'}
                        </div>
                        <div style="font-size:12px;color:#666;">
                            ${item.user_jabatan || ''}
                        </div>
                    </div>
                </div>
            </td>

            <td>
                <span class="aktivitas-badge ${aktivitas.class}">
                    ${aktivitas.label}
                </span>
            </td>

            <td class="detail-cell">
                ${item.detail || '-'}
            </td>
        </tr>
        `;
    }).join('');

    renderPagination(data.length);
}

function renderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    const pageNumbers = document.getElementById('pageNumbers');
    pageNumbers.innerHTML = '';

    function addPageButton(num) {
        const btn = document.createElement('button');
        btn.textContent = num;
        btn.classList.add('page-btn');

        if (num === currentPage) {
            btn.classList.add('active');
        }

        btn.addEventListener('click', () => {
            currentPage = num;
            renderTable(filteredActivities);
        });

        pageNumbers.appendChild(btn);
    }

    if (totalPages <= 4) {
        // Kalau halaman sedikit tampilkan semua
        for (let i = 1; i <= totalPages; i++) {
            addPageButton(i);
        }
    } else {
        // Tampilkan 1 2 3
        addPageButton(1);
        addPageButton(2);
        addPageButton(3);

        // Tambahkan ...
        const dotsBtn = document.createElement('button');
        dotsBtn.textContent = '...';
        dotsBtn.classList.add('page-btn');

        dotsBtn.addEventListener('click', () => {
            const page = prompt(`Masukkan nomor halaman (1-${totalPages})`);

            if (
                page &&
                !isNaN(page) &&
                page >= 1 &&
                page <= totalPages
            ) {
                currentPage = parseInt(page);
                renderTable(filteredActivities);
            }
        });

        pageNumbers.appendChild(dotsBtn);

        // Tambahkan halaman terakhir
        addPageButton(totalPages);
    }

    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled =
        currentPage === totalPages || totalPages === 0;
}

// Isi dropdown pengguna dari data aktivitas
function populateUserFilter(activities) {
    const select = document.getElementById('penggunaFilter');
    // Reset kecuali option pertama
    while (select.options.length > 1) select.remove(1);

    const usersMap = new Map();
    activities.forEach(a => {
        if (a.user_id && a.user_name) {
            usersMap.set(a.user_id, a.user_name);
        }
    });

    usersMap.forEach((name, id) => {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = name;
        select.appendChild(opt);
    });
}

// Filter data
function filterData() {
    const tanggal = document.getElementById('tanggalFilter').value;
    const pengguna = document.getElementById('penggunaFilter').value;
    const aktivitas = document.getElementById('aktivitasFilter').value;

    const filtered = allActivities.filter(item => {
        const itemDate = (item.created_at || '').split('T')[0];

        const matchTanggal = !tanggal || itemDate === tanggal;
        const matchPengguna = !pengguna || (String(item.user_id) === pengguna);
        const matchAktivitas = !aktivitas || item.aktivitas === aktivitas;

        return matchTanggal && matchPengguna && matchAktivitas;
    });

    currentPage = 1;
    renderTable(filtered);
}

// Load data dari API
async function loadActivities() {
    const tbody = document.getElementById('activityTable');
    tbody.innerHTML = '<tr><td colspan="4" class="loading-cell">Memuat data...</td></tr>';

    try {
        const res = await apiListLogs();

        if (!res || !res.ok) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-cell" style="color:#e74c3c">Gagal memuat data aktivitas.</td></tr>';
            return;
        }

        const data = await res.json();
        allActivities = data.data || [];

        populateUserFilter(allActivities);
        renderTable(allActivities);

    } catch (err) {
        console.error('Error loading activities:', err);
        tbody.innerHTML = '<tr><td colspan="4" class="empty-cell" style="color:#e74c3c">Server tidak bisa diakses.</td></tr>';
    }
}

// Event listeners
document.getElementById('tanggalFilter')?.addEventListener('change', filterData);
document.getElementById('penggunaFilter')?.addEventListener('change', filterData);
document.getElementById('aktivitasFilter')?.addEventListener('change', filterData);
document.getElementById('prevPage')?.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderTable(filteredActivities);
    }
});

document.getElementById('nextPage')?.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredActivities.length / rowsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        renderTable(filteredActivities);
    }
});

// Init
document.addEventListener('DOMContentLoaded', loadActivities);