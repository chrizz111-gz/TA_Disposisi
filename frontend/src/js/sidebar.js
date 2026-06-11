const sidebar = document.getElementById("sidebar");
const btn = document.getElementById("toggleSidebar");

// Append Panduan button to sidebar dynamically
if (sidebar) {
    const link = document.createElement("a");
    link.href = "panduan.html";
    link.className = "side-btn";
    link.innerHTML = `PANDUAN <img src="../assets/log.png" alt="">`;
    sidebar.appendChild(link);
}

if (btn) {
    btn.addEventListener("click", () => {
        sidebar.classList.toggle("hidden");

        // Ubah model tombol
        if (sidebar.classList.contains("hidden")) {
            btn.classList.remove("open");
            btn.classList.add("closed");
            btn.innerText = "III";
        } else {
            btn.classList.remove("closed");
            btn.classList.add("open");
            btn.innerHTML = "<span>☰</span>";
        }
    });
}
