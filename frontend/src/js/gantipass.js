(function () {
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');
    const bars = document.querySelectorAll('.bar');
    const text = document.getElementById('statusText');
    const matchText = document.getElementById('matchText');
    const submitBtn = document.getElementById('btnSavePassword');

    const email = localStorage.getItem('reset_email');
    if (!email) {
        alert("Surel tidak ditemukan. Silakan masukkan surel kembali.");
        window.location.href = "confirm_email.html";
        return;
    }

    /* =========================
       VALIDASI RULE PASSWORD
    ========================= */
    function validasiPassword(value) {
        // minimal 8 karakter
        if (value.length < 8) {
            return "Kata sandi minimal 8 karakter";
        }

        // minimal satu huruf besar
        if (!/[A-Z]/.test(value)) {
            return "Kata sandi harus mengandung minimal satu huruf besar";
        }

        // minimal satu huruf kecil
        if (!/[a-z]/.test(value)) {
            return "Kata sandi harus mengandung minimal satu huruf kecil";
        }

        // minimal satu angka
        if (!/[0-9]/.test(value)) {
            return "Kata sandi harus mengandung minimal satu angka";
        }

        return "valid";
    }

    /* =========================
       PASSWORD STRENGTH
    ========================= */
    if (password) {
        password.addEventListener('input', function () {
            const value = password.value;

            // RESET BAR
            bars.forEach(bar => {
                bar.style.background = '#ddd';
                bar.style.transform = 'scaleX(0.3)';
            });

            // VALIDASI
            const valid = validasiPassword(value);

            // kalau tidak valid
            if (valid !== "valid") {
                text.textContent = valid;
                text.style.color = "red";
                return;
            }

            // FULL BAR jika valid
            bars.forEach(bar => {
                bar.style.background = '#00c853';
                bar.style.transform = 'scaleX(1)';
            });

            text.textContent = "✔ Kata sandi valid";
            text.style.color = "#00c853";

            checkMatch();
        });
    }

    /* =========================
       VALIDASI KONFIRMASI PASSWORD
    ========================= */
    function checkMatch() {
        if (!confirmPassword || !password) return false;

        if (confirmPassword.value === "") {
            matchText.textContent = "";
            return false;
        }

        if (password.value === confirmPassword.value) {
            matchText.textContent = "✔ Kata sandi cocok";
            matchText.style.color = "green";
            return true;
        } else {
            matchText.textContent = "✖ Kata sandi tidak cocok";
            matchText.style.color = "red";
            return false;
        }
    }

    if (confirmPassword) {
        confirmPassword.addEventListener('input', checkMatch);
    }

    /* =========================
       SHOW / HIDE PASSWORD 👁️
    ========================= */
    const toggles = document.querySelectorAll('.toggle-password');
    toggles.forEach(toggle => {
        toggle.addEventListener('click', function () {
            const input = this.parentElement.querySelector('input');
            const img = this.querySelector('img');
            if (input) {
                if (input.type === "password") {
                    input.type = "text";
                    if (img) img.src = "../assets/eye.png";
                } else {
                    input.type = "password";
                    if (img) img.src = "../assets/eye-off.png";
                }
            }
        });
    });

    /* =========================
       SUBMIT NEW PASSWORD
    ========================= */
    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            const newPassword = password.value;
            const confirmVal = confirmPassword.value;

            // 1. Validasi kecocokan password
            if (newPassword !== confirmVal) {
                alert("Kata sandi dan konfirmasi kata sandi tidak cocok.");
                return;
            }

            // 2. Validasi kekuatan password (aturan lokal)
            const validResult = validasiPassword(newPassword);
            if (validResult !== "valid") {
                alert(validResult);
                return;
            }

            // Disable button
            submitBtn.disabled = true;
            submitBtn.style.opacity = "0.5";
            const originalText = submitBtn.textContent;
            submitBtn.textContent = "Menyimpan...";

            try {
                const res = await apiResetPassword(email, newPassword);
                const data = await res.json();

                if (res.ok) {
                    // Success: clear local state and go to success page
                    localStorage.removeItem("reset_email");
                    localStorage.removeItem("otpEndTime");
                    localStorage.removeItem("resendCount");
                    localStorage.removeItem("otp_verified");
                    window.location.href = "berhasilpass.html";
                } else {
                    alert(data.error || "Gagal menyetel kata sandi baru.");
                    submitBtn.disabled = false;
                    submitBtn.style.opacity = "1";
                    submitBtn.textContent = originalText;
                }
            } catch (e) {
                console.error(e);
                alert("Server tidak bisa diakses.");
                submitBtn.disabled = false;
                submitBtn.style.opacity = "1";
                submitBtn.textContent = originalText;
            }
        });
    }
})();