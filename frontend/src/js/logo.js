// =============================================
// logo.js — Auto-load custom logo dari backend
// Digunakan di semua halaman yang punya <img class="logo">
// =============================================

(function () {
    const logoImg = document.querySelector('img.logo');
    if (!logoImg) return;

    // BASE_URL sudah didefinisikan di api.js
    // Jika logo.js diload sebelum api.js, fallback ke default
    const baseUrl = (typeof BASE_URL !== 'undefined') ? BASE_URL : 'http://localhost:7000';

    fetch(baseUrl + '/logo')
        .then(function (res) {
            if (res.ok) {
                // Ganti src logo dengan URL backend + cache buster
                logoImg.src = baseUrl + '/logo?t=' + Date.now();
            }
            // Jika 404, biarkan default ../assets/logo.png
        })
        .catch(function () {
            // Jika backend tidak jalan, biarkan default
        });
})();
