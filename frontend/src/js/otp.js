(function () {
    const inputs = document.querySelectorAll('.otp-input');
    const timerElement = document.querySelector('.timer');
    const resendBtn = document.querySelector('.resend');
    const verifyBtn = document.getElementById('btnVerifyOTP');

    const email = localStorage.getItem('reset_email');
    if (!email) {
        alert("Surel tidak ditemukan. Silakan masukkan surel kembali.");
        window.location.href = "confirm_email.html";
        return;
    }

    /* =========================
       TIMER OTP
    ========================= */
    let resendCount = parseInt(localStorage.getItem('resendCount')) || 0;
    let maxResend = 5;
    let timerInterval;

    let endTime = localStorage.getItem('otpEndTime');
    if (!endTime) {
        endTime = Date.now() + 120000; // 2 minutes
        localStorage.setItem('otpEndTime', endTime);
    }

    function updateTimer() {
        let remaining = Math.floor((endTime - Date.now()) / 1000);
        if (remaining < 0) remaining = 0;

        let minutes = Math.floor(remaining / 60);
        let seconds = remaining % 60;

        minutes = String(minutes).padStart(2, '0');
        seconds = String(seconds).padStart(2, '0');

        if (timerElement) {
            timerElement.innerHTML = `⏲ Kode berlaku ${minutes}:${seconds}`;
        }

        if (remaining > 0) {
            if (resendBtn) {
                resendBtn.style.opacity = "0.5";
                resendBtn.style.cursor = "not-allowed";
            }
        } else {
            clearInterval(timerInterval);
            if (resendCount < maxResend) {
                if (resendBtn) {
                    resendBtn.style.opacity = "1";
                    resendBtn.style.cursor = "pointer";
                }
            } else {
                if (resendBtn) {
                    resendBtn.textContent = "Batas resend habis";
                    resendBtn.style.opacity = "0.5";
                    resendBtn.style.cursor = "not-allowed";
                }
            }
        }
    }

    timerInterval = setInterval(updateTimer, 1000);
    updateTimer();

    /* =========================
       RESEND OTP
    ========================= */
    if (resendBtn) {
        resendBtn.addEventListener('click', async () => {
            let remaining = Math.floor((endTime - Date.now()) / 1000);
            if (remaining <= 0 && resendCount < maxResend) {
                resendBtn.textContent = "Mengirim...";
                resendBtn.style.opacity = "0.5";
                resendBtn.style.cursor = "not-allowed";

                try {
                    const res = await apiForgotPassword(email);
                    if (res.ok) {
                        resendCount++;
                        localStorage.setItem('resendCount', resendCount);
                        endTime = Date.now() + 120000;
                        localStorage.setItem('otpEndTime', endTime);
                        updateTimer();
                        timerInterval = setInterval(updateTimer, 1000);
                        alert("OTP berhasil dikirim ulang ke surel Anda.");
                    } else {
                        const data = await res.json();
                        alert(data.error || "Gagal mengirim ulang OTP.");
                    }
                } catch (e) {
                    console.error(e);
                    alert("Gagal menghubungi server.");
                } finally {
                    resendBtn.textContent = "Kirim ulang kode";
                }
            }
        });
    }

    /* =========================
       OTP INPUT FOCUS & EVENTS
    ========================= */
    if (inputs.length > 0) {
        inputs[0].focus();

        inputs.forEach((input, index) => {
            input.addEventListener('input', () => {
                input.value = input.value.replace(/[^0-9]/g, '');
                input.value = input.value.slice(0, 1);

                if (input.value !== '') {
                    if (index < inputs.length - 1) {
                        inputs[index + 1].focus();
                    }
                }
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && input.value === '') {
                    if (index > 0) {
                        inputs[index - 1].focus();
                    }
                }
            });

            input.addEventListener('click', () => {
                for (let i = 0; i < index; i++) {
                    if (inputs[i].value === '') {
                        inputs[i].focus();
                        return;
                    }
                }
            });
        });
    }

    /* =========================
       VERIFY OTP
    ========================= */
    if (verifyBtn) {
        verifyBtn.addEventListener('click', async () => {
            const otpCode = Array.from(inputs).map(i => i.value).join('');
            if (otpCode.length < 6) {
                alert("Masukkan 6 digit kode OTP secara lengkap.");
                return;
            }

            verifyBtn.disabled = true;
            verifyBtn.style.opacity = "0.5";
            const originalText = verifyBtn.textContent;
            verifyBtn.textContent = "Memverifikasi...";

            try {
                const res = await apiVerifyOTP(email, otpCode);
                const data = await res.json();

                if (res.ok) {
                    // Success: go to reset password form page (gantipass.html)
                    localStorage.setItem("otp_verified", "true");
                    window.location.href = "gantipass.html";
                } else {
                    alert(data.error || "Kode OTP salah atau kedaluwarsa.");
                    verifyBtn.disabled = false;
                    verifyBtn.style.opacity = "1";
                    verifyBtn.textContent = originalText;
                }
            } catch (e) {
                console.error(e);
                alert("Server tidak bisa diakses.");
                verifyBtn.disabled = false;
                verifyBtn.style.opacity = "1";
                verifyBtn.textContent = originalText;
            }
        });
    }
})();