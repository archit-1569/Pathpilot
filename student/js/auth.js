const loginForm = document.querySelector("#loginForm");
const registerForm = document.querySelector("#registerForm");
const forgotForm = document.querySelector("#forgotForm");
const resetForm = document.querySelector("#resetForm");

// ── Check for expired session / deleted account ────────────────── //
const urlParams = new URLSearchParams(window.location.search);
const reason = urlParams.get("reason") || (urlParams.get("expired") ? "expired" : null);
if (reason && loginForm) {
  const msg = reason === "deleted"
    ? "This account no longer exists. Please create a new account."
    : "Your session has expired. Please sign in again.";
  showMessage(
    loginForm.querySelector(".message"),
    msg,
    "error",
  );
}

if (loginForm)
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = loginForm.querySelector('button[type="submit"]');
    setBusy(button, true, "Signing in...");
    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: document.querySelector("#email").value,
          password: document.querySelector("#password").value,
        }),
      });
      setSession(data);
      // Fetch profile name and enrich stored user object
      try {
        const profile = await apiRequest("/profiles/me");
        const stored = JSON.parse(
          localStorage.getItem("pathpilot-user") || "{}",
        );
        stored.name = profile.name;
        localStorage.setItem("pathpilot-user", JSON.stringify(stored));
      } catch (_) {
        /* profile fetch failing is non-fatal */
      }
      location.href = "index.html";
    } catch (error) {
      showMessage(message, error.message);
    } finally {
      setBusy(button, false);
    }
  });

if (registerForm) {
  const otpForm = document.querySelector("#otpForm");
  const otpInput = document.querySelector("#otp");
  const otpMessage = document.querySelector("#otpMessage");
  const resendOtpLink = document.querySelector("#resendOtpLink");
  const authCardTitle = document.querySelector("#authCardTitle");
  const authCardSubtitle = document.querySelector("#authCardSubtitle");
  const registerMessage = document.querySelector("#message");

  let registeredEmail = "";
  let registeredName = "";

  const origTitle = "Create account";
  const origSubtitle = 'Already have an account? <a href="login.html">Sign in</a>';

  function showRegistrationForm() {
    authCardTitle.textContent = origTitle;
    authCardSubtitle.innerHTML = origSubtitle;
    registerForm.style.display = "block";
    otpForm.style.display = "none";
  }

  function showOtpForm(email, name) {
    registeredEmail = email;
    registeredName = name;
    
    authCardTitle.textContent = "Verify your email";
    authCardSubtitle.innerHTML = 'Made a mistake? <a href="#" id="backToRegister" style="color: var(--purple); font-weight: 800;">Go back</a>';
    
    document.querySelector("#backToRegister").addEventListener("click", (e) => {
      e.preventDefault();
      showRegistrationForm();
    });

    registerForm.style.display = "none";
    otpForm.style.display = "block";
    otpInput.value = "";
  }

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = registerForm.querySelector('button[type="submit"]');
    const nameValue = document.querySelector("#name").value;
    const emailValue = document.querySelector("#email").value;
    const passwordValue = document.querySelector("#password").value;
    const confirmPasswordValue = document.querySelector("#confirmPassword").value;

    if (passwordValue !== confirmPasswordValue) {
      showMessage(registerMessage, "Passwords do not match");
      return;
    }
    
    setBusy(button, true, "Creating account...");
    try {
      const data = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: nameValue,
          email: emailValue,
          password: passwordValue,
        }),
      });
      showOtpForm(emailValue, nameValue);
    } catch (error) {
      showMessage(registerMessage, error.message);
    } finally {
      setBusy(button, false);
    }
  });

  otpForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = otpForm.querySelector('button[type="submit"]');
    setBusy(button, true, "Verifying...");
    try {
      const data = await apiRequest("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({
          email: registeredEmail,
          otp: otpInput.value,
        }),
      });
      
      setSession(data);
      const stored = JSON.parse(localStorage.getItem("pathpilot-user") || "{}");
      stored.name = registeredName;
      localStorage.setItem("pathpilot-user", JSON.stringify(stored));
      
      showMessage(otpMessage, "Email verified successfully! Redirecting...", "success");
      setTimeout(() => {
        location.href = "profile.html";
      }, 1000);
    } catch (error) {
      showMessage(otpMessage, error.message);
    } finally {
      setBusy(button, false);
    }
  });

  resendOtpLink.addEventListener("click", async (event) => {
    event.preventDefault();
    try {
      const data = await apiRequest("/auth/resend-otp", {
        method: "POST",
        body: JSON.stringify({
          email: registeredEmail,
        }),
      });
      showMessage(otpMessage, "A new verification code has been sent.", "success");
    } catch (error) {
      showMessage(otpMessage, error.message);
    }
  });

  // Password visibility toggle logic
  document.querySelectorAll(".password-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const input = document.getElementById(targetId);
      if (input) {
        const isPwd = input.type === "password";
        input.type = isPwd ? "text" : "password";
        btn.classList.toggle("show-pwd", isPwd);
      }
    });
  });
}

if (forgotForm) {
  const otpForm = document.querySelector("#otpForm");
  const otpInput = document.querySelector("#otp");
  const otpMessage = document.querySelector("#otpMessage");
  const resendOtpLink = document.querySelector("#resendOtpLink");
  const authCardTitle = document.querySelector("#authCardTitle");
  const authCardSubtitle = document.querySelector("#authCardSubtitle");
  const forgotMessage = document.querySelector("#message");

  let resetEmail = "";
  let resetToken = "";

  const origTitle = "Reset password";
  const origSubtitle = 'Remembered it? <a href="login.html">Return to sign in</a>';

  function showForgotForm() {
    authCardTitle.textContent = origTitle;
    authCardSubtitle.innerHTML = origSubtitle;
    forgotForm.style.display = "block";
    otpForm.style.display = "none";
    if (resetForm) resetForm.style.display = "none";
  }

  function showOtpForm(email) {
    resetEmail = email;
    authCardTitle.textContent = "Verify reset code";
    authCardSubtitle.innerHTML = 'Made a mistake? <a href="#" id="backToForgot" style="color: var(--purple); font-weight: 800;">Go back</a>';
    
    // Add a tiny delay to ensure the backToForgot link is rendered before query selecting
    setTimeout(() => {
      const backLink = document.querySelector("#backToForgot");
      if (backLink) {
        backLink.addEventListener("click", (e) => {
          e.preventDefault();
          showForgotForm();
        });
      }
    }, 0);

    forgotForm.style.display = "none";
    otpForm.style.display = "block";
    if (resetForm) resetForm.style.display = "none";
    otpInput.value = "";
  }

  function showResetForm() {
    authCardTitle.textContent = "Set new password";
    authCardSubtitle.innerHTML = "Choose a secure password and confirm it";
    forgotForm.style.display = "none";
    otpForm.style.display = "none";
    if (resetForm) resetForm.style.display = "block";
  }

  forgotForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = forgotForm.querySelector('button[type="submit"]');
    const emailValue = document.querySelector("#email").value;
    setBusy(button, true, "Sending code...");
    try {
      const data = await apiRequest("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: emailValue }),
      });
      showOtpForm(emailValue);
    } catch (error) {
      showMessage(forgotMessage, error.message);
    } finally {
      setBusy(button, false);
    }
  });

  otpForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = otpForm.querySelector('button[type="submit"]');
    setBusy(button, true, "Verifying...");
    try {
      const data = await apiRequest("/auth/verify-reset-otp", {
        method: "POST",
        body: JSON.stringify({
          email: resetEmail,
          otp: otpInput.value,
        }),
      });
      resetToken = data.reset_token;
      showResetForm();
    } catch (error) {
      showMessage(otpMessage, error.message);
    } finally {
      setBusy(button, false);
    }
  });

  resendOtpLink.addEventListener("click", async (event) => {
    event.preventDefault();
    try {
      await apiRequest("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: resetEmail }),
      });
      showMessage(otpMessage, "A new verification code has been sent.", "success");
    } catch (error) {
      showMessage(otpMessage, error.message);
    }
  });

  if (resetForm) {
    resetForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = resetForm.querySelector('button[type="submit"]');
      const newPasswordValue = document.querySelector("#newPassword").value;
      const confirmPasswordValue = document.querySelector("#confirmPassword").value;
      const resetMessage = document.querySelector("#resetMessage");

      if (newPasswordValue !== confirmPasswordValue) {
        showMessage(resetMessage, "Passwords do not match");
        return;
      }

      setBusy(button, true, "Setting password...");
      try {
        const data = await apiRequest("/auth/reset-password", {
          method: "POST",
          body: JSON.stringify({
            token: resetToken,
            new_password: newPasswordValue,
          }),
        });
        showMessage(resetMessage, `${data.message}. Redirecting to login...`, "success");
        setTimeout(() => {
          location.href = "login.html";
        }, 1500);
      } catch (error) {
        showMessage(resetMessage, error.message);
      } finally {
        setBusy(button, false);
      }
    });
  }

  // Password visibility toggle logic
  document.querySelectorAll(".password-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const input = document.getElementById(targetId);
      if (input) {
        const isPwd = input.type === "password";
        input.type = isPwd ? "text" : "password";
        btn.classList.toggle("show-pwd", isPwd);
      }
    });
  });
}
