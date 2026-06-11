// panduan.js — Logika Halaman Panduan Pengguna Desktop (Vanilla JS)
(function () {
    const user = getUser();
    if (!user) { window.location.href = "login.html"; return; }

    const activeRole = getActiveJabatan().toLowerCase();
    const sidebar = document.getElementById("sidebar");
    const roleLabelEl = document.getElementById("roleLabel");
    const flowStepsEl = document.getElementById("flowSteps");
    const accordionCardEl = document.getElementById("accordionCard");

    // =============================================
    // DYNAMIC SIDEBAR GENERATION
    // =============================================
    function buildSidebar() {
        if (!sidebar) return;

        // Kosongkan dulu sidebar (karena sidebar.js sudah menambahkan PANDUAN di paling bawah)
        sidebar.innerHTML = "";

        let buttons = [];

        if (activeRole === "admin") {
            buttons = [
                { text: "BERANDA", href: "home.html", icon: "home.png" },
                { text: "PENGGUNA", href: "profile.html", icon: "user.png" },
                { text: "SURAT MASUK", href: "suratmasuk.html", icon: "in.png" },
                { text: "SURAT KELUAR", href: "suratkeluar.html", icon: "out.png" },
                { text: "RIWAYAT", href: "history.html", icon: "history.png" },
                { text: "MANAJEMEN AKUN", href: "usermanage.html", icon: "users.png" }
            ];
        } else if (activeRole === "pegawai") {
            buttons = [
                { text: "BERANDA", href: "home.html", icon: "home.png" },
                { text: "PENGGUNA", href: "profile.html", icon: "user.png" },
                { text: "SURAT MASUK", href: "suratmasuk.html", icon: "in.png" },
                { text: "SURAT KELUAR", href: "suratkeluar.html", icon: "out.png" },
                { text: "RIWAYAT", href: "history.html", icon: "history.png" }
            ];
        } else if (activeRole === "kepala sekolah") {
            buttons = [
                { text: "BERANDA", href: "homeKepsek.html", icon: "home.png" },
                { text: "PENGGUNA", href: "profile_kepsek.html", icon: "user.png" },
                { text: "RIWAYAT", href: "history_kepsek.html", icon: "history.png" }
            ];
        } else if (activeRole.startsWith("waka") || activeRole === "koordinator waka") {
            buttons = [
                { text: "BERANDA", href: "homeWaka.html", icon: "home.png" },
                { text: "PENGGUNA", href: "profile_user.html", icon: "user.png" },
                { text: "RIWAYAT", href: "history_user.html", icon: "history.png" }
            ];
        } else {
            // User Biasa / Guru / Staf
            buttons = [
                { text: "BERANDA", href: "home_user.html", icon: "home.png" },
                { text: "PENGGUNA", href: "profile_user.html", icon: "user.png" },
                { text: "RIWAYAT", href: "history_user.html", icon: "history.png" }
            ];
        }

        // Render buttons
        buttons.forEach(btn => {
            const a = document.createElement("a");
            a.href = btn.href;
            a.className = "side-btn";
            a.innerHTML = `${btn.text} <img src="../assets/${btn.icon}" alt="">`;
            sidebar.appendChild(a);
        });

        // Terakhir tambahkan PANDUAN sebagai tombol biasa seperti yang lain
        const aPanduan = document.createElement("a");
        aPanduan.href = "panduan.html";
        aPanduan.className = "side-btn";
        aPanduan.innerHTML = `PANDUAN <img src="../assets/log.png" alt="">`;
        sidebar.appendChild(aPanduan);
    }

    // =============================================
    // DATA PANDUAN & ALUR
    // =============================================
    const dataPanduan = {
        admin: [
            {
                id: 'masuk',
                title: 'Masuk ke Sistem',
                steps: [
                    'Buka aplikasi desktop E-Disposisi.',
                    'Masukkan surel dan kata sandi akun Admin/TU.',
                    'Klik tombol "Masuk" untuk masuk ke beranda.',
                    'Jika lupa kata sandi, klik "Lupa Kata Sandi?" untuk mereset kata sandi via OTP surel.'
                ]
            },
            {
                id: 'buat-surat-masuk',
                title: 'Membuat Surat Masuk',
                steps: [
                    'Buka menu "Surat Masuk" di sidebar.',
                    'Klik tombol "+ Buat Surat Masuk" di kanan atas.',
                    'Isi formulir: No. Surat, Perihal, Asal Surat, dan Tanggal.',
                    'Unggah file lampiran PDF surat masuk (maksimal 1MB).',
                    'Klik "Submit" untuk menyimpan surat sekaligus mengirimkannya ke Kepala Sekolah untuk ditinjau.',
                    'Status alur surat akan berubah menjadi "Menunggu" Kepala Sekolah.'
                ]
            },
            {
                id: 'buat-surat-keluar',
                title: 'Membuat Surat Keluar',
                steps: [
                    'Buka menu "Surat Keluar" di sidebar.',
                    'Klik tombol "+ Buat Surat Keluar" di kanan atas.',
                    'Isi Tujuan, pilih Kode Surat, Perihal, dan Tanggal Surat.',
                    'Unggah file lampiran PDF surat keluar.',
                    'Klik "Submit" — surat akan dikirim ke Kepala Sekolah untuk mendapatkan persetujuan/verifikasi.'
                ]
            },
            {
                id: 'teruskan-surat',
                title: 'Meneruskan Surat ke Waka (Disposisi)',
                steps: [
                    'Setelah Kepala Sekolah menyetujui surat masuk, surat tersebut akan muncul di beranda dengan badge "Surat Baru" dan status "Disetujui".',
                    'Klik tombol "Lihat" pada surat tersebut.',
                    'Pilih jabatan Waka (Wakil Kepala Sekolah) penerima disposisi yang telah direkomendasikan Kepala Sekolah.',
                    'Klik "Teruskan" — disposisi akan diteruskan dan Waka yang bersangkutan akan mendapat notifikasi.',
                    'Setelah diteruskan, surat otomatis hilang dari beranda dan pindah ke menu "Riwayat".'
                ]
            },
            {
                id: 'kelola-pengguna',
                title: 'Kelola Pengguna (Manajemen Akun)',
                steps: [
                    'Buka menu "Manajemen Akun" di sidebar (khusus Admin).',
                    'Klik tombol "+ Tambah User" untuk membuat akun baru.',
                    'Isi Surel, Nama, Kata Sandi (minimal 8 karakter dengan kombinasi huruf besar, kecil, dan angka).',
                    'Pilih satu atau lebih jabatan untuk pengguna tersebut.',
                    'Untuk mengubah jabatan pengguna, klik tombol "Edit Jabatan". Untuk menghapus akun, klik tombol "Hapus".'
                ]
            },
            {
                id: 'filter-cari',
                title: 'Pencarian & Filter Surat',
                steps: [
                    'Gunakan kolom pencarian ("Cari surat...") di bagian atas beranda untuk memfilter surat secara real-time berdasarkan No. Surat, Perihal, Asal, atau Tujuan.',
                    'Di halaman "Riwayat", Anda dapat melakukan filter lebih lanjut berdasarkan jenis surat (Masuk/Keluar) serta range tanggal.'
                ]
            },
            {
                id: 'log-aktivitas',
                title: 'Riwayat Catatan Aktivitas',
                steps: [
                    'Buka menu "Riwayat" di sidebar lalu klik "Log Aktivitas" (atau langsung klik ikon Log).',
                    'Catatan aktivitas merekam aksi penting: masuk, tambah surat, teruskan surat, update jabatan, dan hapus user.',
                    'Informasi mencakup: Waktu, Nama Pengguna, Jabatan, Jenis Aktivitas, dan Detail Aksi.',
                    'Gunakan filter pencarian, filter tanggal, atau filter pengguna untuk menyaring catatan aktivitas.'
                ]
            },
            {
                id: 'profil',
                title: 'Pengaturan Profil & Sandi',
                steps: [
                    'Buka menu "Pengaturan" / "Profil" di sidebar.',
                    'Anda dapat melihat detail info profil Anda.',
                    'Untuk mengganti kata sandi: klik tab "Ganti Password", kirim OTP ke surel Anda, masukkan kode OTP yang diterima, lalu buat password baru.'
                ]
            }
        ],
        pegawai: [
            {
                id: 'masuk',
                title: 'Masuk ke Sistem',
                steps: [
                    'Buka aplikasi desktop E-Disposisi.',
                    'Masukkan surel dan kata sandi akun Pegawai TU.',
                    'Klik tombol "Masuk" untuk masuk ke beranda.'
                ]
            },
            {
                id: 'buat-surat-masuk',
                title: 'Membuat Surat Masuk',
                steps: [
                    'Buka menu "Surat Masuk" di sidebar.',
                    'Klik tombol "+ Buat Surat Masuk" di kanan atas.',
                    'Isi formulir: No. Surat, Perihal, Asal Surat, dan Tanggal.',
                    'Unggah file lampiran PDF surat masuk (maksimal 1MB).',
                    'Klik "Submit" untuk menyimpan surat sekaligus mengirimkannya ke Kepala Sekolah untuk ditinjau.'
                ]
            },
            {
                id: 'buat-surat-keluar',
                title: 'Membuat Surat Keluar',
                steps: [
                    'Buka menu "Surat Keluar" di sidebar.',
                    'Klik tombol "+ Buat Surat Keluar".',
                    'Isi Tujuan, Kode Surat, Perihal, dan Tanggal.',
                    'Unggah file lampiran PDF.',
                    'Klik "Submit" — surat dikirim ke Kepala Sekolah untuk persetujuan.'
                ]
            },
            {
                id: 'teruskan-surat',
                title: 'Meneruskan Surat ke Waka (Disposisi)',
                steps: [
                    'Ketika Kepala Sekolah menyetujui surat masuk, klik "Lihat" di beranda.',
                    'Pilih jabatan Waka penerima disposisi.',
                    'Klik "Teruskan" — surat akan diteruskan ke Waka terkait dan otomatis hilang dari beranda Anda.'
                ]
            },
            {
                id: 'profil',
                title: 'Pengaturan Profil & Sandi',
                steps: [
                    'Buka menu "Pengguna" / "Profil" di sidebar.',
                    'Pilih tab "Ganti Password", kirim OTP ke surel, dan masukkan kata sandi baru untuk meningkatkan keamanan.'
                ]
            }
        ],
        kepsek: [
            {
                id: 'masuk',
                title: 'Masuk ke Sistem',
                steps: [
                    'Buka aplikasi desktop E-Disposisi.',
                    'Masukkan surel dan kata sandi akun Kepala Sekolah.',
                    'Klik "Masuk" untuk masuk ke dashboard.'
                ]
            },
            {
                id: 'tinjau-surat-masuk',
                title: 'Meninjau Surat Masuk (Disposisi)',
                steps: [
                    'Surat masuk yang dikirim TU akan muncul di beranda dengan status "Menunggu".',
                    'Klik tombol "Lihat" pada surat masuk terkait.',
                    'Di halaman detail, temukan panel "Aksi Kepala Sekolah".',
                    'Pilih keputusan: "Setujui" atau "Tolak".',
                    'Pilih rekomendasi jabatan Waka yang akan memproses surat (misal: Waka Kurikulum, Waka Kesiswaan, dll).',
                    'Masukkan catatan tambahan/instruksi khusus.',
                    'Klik "Kirim Persetujuan" — surat akan otomatis hilang dari beranda Anda.'
                ]
            },
            {
                id: 'tinjau-surat-keluar',
                title: 'Meninjau Surat Keluar',
                steps: [
                    'Surat keluar yang baru dibuat TU akan muncul di beranda dengan warna kartu orange dan status "Menunggu".',
                    'Klik "Lihat" pada surat keluar tersebut.',
                    'Pilih keputusan: "Setujui" atau "Tolak" dan berikan catatan Kepala Sekolah.',
                    'Klik "Kirim" — keputusan akan dikirim kembali ke TU dan surat akan hilang dari beranda Anda.'
                ]
            },
            {
                id: 'riwayat',
                title: 'Riwayat Peninjauan',
                steps: [
                    'Buka menu "Riwayat" di sidebar.',
                    'Anda dapat memantau kembali semua surat masuk dan keluar yang pernah Anda setujui atau tolak.',
                    'Gunakan fitur pencarian untuk mempermudah pencarian berkas lama.'
                ]
            }
        ],
        waka: [
            {
                id: 'masuk',
                title: 'Masuk ke Sistem',
                steps: [
                    'Buka aplikasi desktop E-Disposisi.',
                    'Masukkan surel dan kata sandi akun Wakil Kepala Sekolah Anda.',
                    'Klik "Masuk" untuk melihat beranda.'
                ]
            },
            {
                id: 'lihat-surat',
                title: 'Melihat Disposisi Masuk',
                steps: [
                    'Surat masuk yang didisposisikan kepada Anda akan muncul di beranda dengan status "Perlu Tindakan".',
                    'Klik "Lihat" untuk membuka detail surat.',
                    'Anda dapat melihat lampiran PDF surat serta membaca catatan disposisi dari Kepala Sekolah.'
                ]
            },
            {
                id: 'teruskan-ke-user',
                title: 'Meneruskan Disposisi ke Pengguna (Guru/Staf)',
                steps: [
                    'Buka detail surat masuk yang perlu tindakan.',
                    'Centang satu atau lebih Pengguna (Guru / Staff) penerima disposisi lanjutan.',
                    'Tambahkan catatan instruksi spesifik di kolom catatan.',
                    'Klik "Teruskan" — surat akan dikirim ke guru/staf tersebut dan otomatis hilang dari beranda Anda karena sudah ditindak.'
                ]
            },
            {
                id: 'riwayat',
                title: 'Riwayat Disposisi Waka',
                steps: [
                    'Buka menu "Riwayat" untuk memantau surat-surat yang sudah Anda distribusikan ke Guru/Staf.',
                    'Gunakan fitur pencarian di beranda atau riwayat untuk mencari surat lama.'
                ]
            }
        ],
        user: [
            {
                id: 'masuk',
                title: 'Masuk ke Sistem',
                steps: [
                    'Buka aplikasi desktop E-Disposisi.',
                    'Masukkan surel dan kata sandi yang telah didaftarkan Admin.',
                    'Klik "Masuk" untuk masuk ke dashboard.'
                ]
            },
            {
                id: 'lihat-surat',
                title: 'Membaca Surat Disposisi',
                steps: [
                    'Buka menu "Beranda" / "Surat Masuk".',
                    'Surat yang didelegasikan Waka kepada Anda akan tampil sebagai kartu biru.',
                    'Klik "Lihat" untuk membaca detail surat, catatan instruksi dari Waka, serta membuka file PDF lampiran.'
                ]
            },
            {
                id: 'terima-surat',
                title: 'Mengonfirmasi Penerimaan Surat',
                steps: [
                    'Di halaman detail surat yang baru masuk, akan muncul banner merah bertuliskan "Surat belum diterima".',
                    'Klik tombol "Terima Surat".',
                    'Pada kotak dialog konfirmasi, klik "Ya, Terima".',
                    'Setelah Anda klik Terima, status surat berubah menjadi "Selesai" dan surat tersebut otomatis dipindahkan ke halaman "Riwayat".'
                ]
            },
            {
                id: 'ganti-jabatan',
                title: 'Ganti Jabatan (Multi-Jabatan)',
                steps: [
                    'Jika akun Anda memiliki lebih dari satu jabatan (misal: Guru produktif sekaligus Kepala Lab), Anda akan melihat dropdown "Ganti Jabatan" di menu utama.',
                    'Klik dropdown tersebut untuk berpindah jabatan.',
                    'Sistem akan menyaring surat masuk secara otomatis sesuai dengan jabatan aktif yang Anda pilih.'
                ]
            }
        ]
    };

    const dataAlur = {
        admin: ['Admin/TU Buat Surat', 'Kirim ke Kepsek', 'Kepsek Tinjau (Setuju/Tolak)', 'Admin Teruskan ke Waka', 'Waka Teruskan ke Pengguna', 'Pengguna Terima Surat', 'Masuk Riwayat'],
        pegawai: ['Pegawai TU Buat Surat', 'Kirim ke Kepsek', 'Kepsek Tinjau (Setuju/Tolak)', 'Pegawai Teruskan ke Waka', 'Waka Teruskan ke Pengguna', 'Pengguna Terima Surat', 'Masuk Riwayat'],
        kepsek: ['TU Input Surat', 'Kepsek Terima Notif', 'Kepsek Buka Detail', 'Setujui / Tolak + Rekomendasi Waka', 'Selesai & Masuk Riwayat'],
        waka: ['TU Meneruskan Surat', 'Waka Terima Notif', 'Buka Detail Surat', 'Pilih User Penerima + Instruksi', 'Teruskan Surat', 'Masuk Riwayat'],
        user: ['Waka Meneruskan Surat', 'User Terima Notif', 'Buka & Baca Surat', 'Klik Tombol "Terima Surat"', 'Selesai & Masuk Riwayat']
    };

    // =============================================
    // INITIALIZATION & RENDER
    // =============================================
    function init() {
        // 1. Tentukan data berdasarkan role
        let roleKey = "user"; // default
        let roleLabelText = "Pengguna (Guru / Staf)";

        if (activeRole === "admin") {
            roleKey = "admin";
            roleLabelText = "Admin / Tata Usaha";
        } else if (activeRole === "pegawai") {
            roleKey = "pegawai";
            roleLabelText = "Pegawai TU";
        } else if (activeRole === "kepala sekolah") {
            roleKey = "kepsek";
            roleLabelText = "Kepala Sekolah";
        } else if (activeRole.startsWith("waka") || activeRole === "koordinator waka") {
            roleKey = "waka";
            roleLabelText = "Wakil Kepala Sekolah (Waka)";
        }

        roleLabelEl.innerHTML = `Panduan penggunaan E-Disposisi desktop untuk peran <strong>${roleLabelText}</strong>`;

        // 2. Render Alur Disposisi
        const steps = dataAlur[roleKey] || dataAlur.user;
        flowStepsEl.innerHTML = steps.map((step, index) => {
            const isLast = index === steps.length - 1;
            return `
                <div class="flow-step">${step}</div>
                ${!isLast ? '<div class="flow-arrow">➔</div>' : ''}
            `;
        }).join("");

        // 3. Render Accordion
        const panduanSteps = dataPanduan[roleKey] || dataPanduan.user;
        accordionCardEl.innerHTML = panduanSteps.map((item, index) => {
            const stepRows = item.steps.map(step => `
                <div class="step-row">
                    <span class="step-bullet"></span>
                    <span>${step}</span>
                </div>
            `).join("");

            return `
                <div class="accordion-item">
                    <button class="accordion-header" data-id="${item.id}">
                        <span class="accordion-num">${index + 1}</span>
                        <span class="accordion-title">${item.title}</span>
                        <span class="accordion-icon">▼</span>
                    </button>
                    <div class="accordion-content" id="content-${item.id}">
                        <div class="accordion-inner">
                            ${stepRows}
                        </div>
                    </div>
                </div>
            `;
        }).join("");

        // 4. Bind Accordion Toggle Click
        const headers = accordionCardEl.querySelectorAll(".accordion-header");
        headers.forEach(h => {
            h.addEventListener("click", () => {
                const id = h.getAttribute("data-id");
                const content = document.getElementById(`content-${id}`);
                const isActive = h.classList.contains("active");

                // Close all first
                headers.forEach(otherH => {
                    otherH.classList.remove("active");
                    const otherId = otherH.getAttribute("data-id");
                    document.getElementById(`content-${otherId}`).style.maxHeight = "0px";
                });

                // Open active if it was not already active
                if (!isActive) {
                    h.classList.add("active");
                    content.style.maxHeight = content.scrollHeight + "px";
                }
            });
        });

        // 5. Build Sidebar
        buildSidebar();
    }

    init();
})();
