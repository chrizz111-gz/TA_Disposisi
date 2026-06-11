(function () {
    const emailInput = document.getElementById('email');
    const verifyBtn = document.getElementById('btnSendOTP');
    const emailError = document.getElementById('emailError');

    if (emailInput && verifyBtn) {
        // Initial button state (disabled until a valid-looking email is entered)
        verifyBtn.disabled = true;
        verifyBtn.style.opacity = "0.5";
        verifyBtn.style.cursor = "not-allowed";

        emailInput.addEventListener('input', () => {
            const value = emailInput.value.trim();
            if (!value.includes('@') || value.length < 5) {
                verifyBtn.disabled = true;
                verifyBtn.style.opacity = "0.5";
                verifyBtn.style.cursor = "not-allowed";
            } else {
                verifyBtn.disabled = false;
                verifyBtn.style.opacity = "1";
                verifyBtn.style.cursor = "pointer";
            }
        });

        verifyBtn.addEventListener('click', async () => {
            const email = emailInput.value.trim();
            if (!email) return;

            // Clear previous errors
            if (emailError) {
                emailError.textContent = "";
                emailError.style.color = "red";
                emailError.style.marginTop = "5px";
                emailError.style.fontSize = "13px";
            }

            // Disable button during loading
            verifyBtn.disabled = true;
            verifyBtn.style.opacity = "0.5";
            const originalText = verifyBtn.textContent;
            verifyBtn.textContent = "Mengirim...";

            try {
                const res = await apiForgotPassword(email);
                const data = await res.json();

                if (res.ok) {
                    // Success: save email, reset timer and redirect
                    localStorage.setItem("reset_email", email);
                    localStorage.removeItem("otpEndTime"); // start fresh timer on next screen
                    localStorage.removeItem("resendCount");
                    window.location.href = "otp_page.html";
                } else {
                    // Error returned from server
                    if (emailError) {
                        emailError.textContent = data.error || "Gagal mengirim OTP.";
                    }
                    verifyBtn.disabled = false;
                    verifyBtn.style.opacity = "1";
                    verifyBtn.textContent = originalText;
                }
            } catch (err) {
                console.error(err);
                if (emailError) {
                    emailError.textContent = "Server tidak bisa diakses.";
                }
                verifyBtn.disabled = false;
                verifyBtn.style.opacity = "1";
                verifyBtn.textContent = originalText;
            }
        });
    }
})();