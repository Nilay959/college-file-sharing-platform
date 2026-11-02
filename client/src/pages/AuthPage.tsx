import React, { useState, useEffect, useRef } from "react";
import { Icon } from "../components/Icons";
import { api, setAuthToken, setUserInfo, User } from "../services/api";

interface AuthPageProps {
  onAuthSuccess: (user: User) => void;
  initialRoute?: string;
}

type AuthView = "login" | "register" | "verify" | "forgot" | "reset";

export function AuthPage({ onAuthSuccess, initialRoute }: AuthPageProps) {
  // Determine initial view from URL path
  const getViewFromPath = (): AuthView => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes("register") || path.includes("signup")) return "register";
    if (path.includes("verify")) return "verify";
    if (path.includes("forgot")) return "forgot";
    if (path.includes("reset")) return "reset";
    return "login";
  };

  const [view, setView] = useState<AuthView>(getViewFromPath);

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);

  // Resend Countdown
  const [resendCooldown, setResendCooldown] = useState(0);

  // OTP input refs
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Navigate view with URL sync
  const switchView = (newView: AuthView) => {
    setView(newView);
    setError("");
    setSuccessMsg("");
    const pathMap: Record<AuthView, string> = {
      login: "/login",
      register: "/register",
      verify: "/verify",
      forgot: "/forgot-password",
      reset: "/reset-password",
    };
    window.history.pushState({}, "", pathMap[newView]);
  };

  // Sync with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setView(getViewFromPath());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Resend timer countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Password strength check
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: "Empty", color: "#64748B" };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;

    if (score <= 2) return { score: 1, label: "Weak", color: "#EF4444" };
    if (score <= 4) return { score: 2, label: "Medium", color: "#F59E0B" };
    return { score: 3, label: "Strong", color: "#10B981" };
  };

  const strength = getPasswordStrength(view === "register" ? password : newPassword);

  // Handle OTP digit changes
  const handleOtpChange = (index: number, val: string) => {
    const cleanVal = val.replace(/[^0-9]/g, "").slice(-1);
    const updated = [...otp];
    updated[index] = cleanVal;
    setOtp(updated);

    if (cleanVal && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
    if (!pasted) return;
    const updated = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      updated[i] = pasted[i];
    }
    setOtp(updated);
    const nextIdx = Math.min(5, pasted.length);
    otpInputsRef.current[nextIdx]?.focus();
  };

  // 1. SIGN IN SUBMIT
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.login({ email: email.trim(), password });
      if (res.requiresVerification) {
        setDevOtp(res.devOtp || null);
        setResendCooldown(60);
        setSuccessMsg(res.message || "Please verify your email address to sign in.");
        switchView("verify");
        return;
      }

      setAuthToken(res.token);
      setUserInfo(res.user);
      onAuthSuccess(res.user);
    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  // 2. CREATE ACCOUNT SUBMIT
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!name.trim() || name.trim().length < 2) {
      setError("Please enter your full name (minimum 2 characters).");
      return;
    }

    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must contain at least one uppercase letter, one lowercase letter, and one number.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.register({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      setDevOtp(res.devOtp || null);
      setResendCooldown(60);
      setSuccessMsg(`Verification code sent to ${email.trim()}`);
      switchView("verify");
    } catch (err: any) {
      setError(err.message || "Registration failed. Please check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  // 3. VERIFY REGISTRATION OTP SUBMIT
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const fullOtp = otp.join("");
    if (fullOtp.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.verifyRegistration({
        email: email.trim(),
        otp: fullOtp,
      });

      setAuthToken(res.token);
      setUserInfo(res.user);
      setSuccessMsg("Email verified successfully! Redirecting...");
      setTimeout(() => {
        onAuthSuccess(res.user);
      }, 600);
    } catch (err: any) {
      setError(err.message || "Invalid or expired code. Please request a new code.");
    } finally {
      setLoading(false);
    }
  };

  // 4. RESEND OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || !email.trim()) return;
    setError("");
    setSuccessMsg("");

    try {
      const res = await api.resendOtp({
        email: email.trim(),
        purpose: view === "reset" ? "password_reset" : "registration",
      });
      setDevOtp(res.devOtp || null);
      setResendCooldown(60);
      setSuccessMsg(`A new code was sent to ${email.trim()}`);
    } catch (err: any) {
      setError(err.message || "Failed to resend code.");
    }
  };

  // 5. FORGOT PASSWORD SUBMIT
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.forgotPassword({ email: email.trim() });
      setDevOtp(res.devOtp || null);
      setResendCooldown(60);
      setSuccessMsg("If your email is registered, a password reset code was sent.");
      switchView("reset");
    } catch (err: any) {
      setError(err.message || "Failed to process request.");
    } finally {
      setLoading(false);
    }
  };

  // 6. RESET PASSWORD SUBMIT
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const fullOtp = otp.join("");
    if (fullOtp.length !== 6) {
      setError("Please enter the 6-digit reset code.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError("New password must contain an uppercase letter, lowercase letter, and number.");
      return;
    }

    setLoading(true);

    try {
      await api.resetPassword({
        email: email.trim(),
        otp: fullOtp,
        newPassword,
      });

      setSuccessMsg("Password reset successfully! Please sign in with your new password.");
      setPassword("");
      setTimeout(() => {
        switchView("login");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-portal-wrapper">
      <div className="auth-portal-card">
        {/* Brand Header */}
        <div className="auth-portal-header">
          <div className="auth-brand-logo-badge">
            <Icon name="folder" size={26} />
          </div>
          <h1 className="auth-brand-title">FileShare</h1>
          <p className="auth-brand-subtitle">
            Secure, end-to-end collaborative file sharing for study groups & teams
          </p>
        </div>

        {/* Top View Switcher (Sign In vs Create Account) */}
        {(view === "login" || view === "register") && (
          <div className="auth-nav-tabs">
            <button
              type="button"
              className={`auth-nav-tab ${view === "login" ? "active" : ""}`}
              onClick={() => switchView("login")}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-nav-tab ${view === "register" ? "active" : ""}`}
              onClick={() => switchView("register")}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Feedback Banners */}
        {error && (
          <div className="auth-feedback-banner error">
            <Icon name="x" size={15} />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="auth-feedback-banner success">
            <Icon name="check" size={15} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Development Helper Badge (when mock email preview is available in non-production) */}
        {devOtp && (
          <div className="auth-dev-otp-pill">
            <Icon name="code" size={14} />
            <span>
              Dev Verification Code: <strong>{devOtp}</strong> (Auto-detected)
            </span>
            <button
              type="button"
              className="btn-fill-dev-otp"
              onClick={() => {
                const digits = devOtp.split("");
                setOtp(digits);
              }}
            >
              Auto-fill
            </button>
          </div>
        )}

        {/* ==============================================================
            VIEW 1: SIGN IN FORM
            ============================================================== */}
        {view === "login" && (
          <form onSubmit={handleLoginSubmit} className="auth-portal-form">
            <div className="form-group">
              <label>Email Address</label>
              <div className="input-with-icon">
                <Icon name="user" size={16} className="field-icon" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <div className="label-with-action">
                <label>Password</label>
                <button
                  type="button"
                  className="link-forgot-password"
                  onClick={() => switchView("forgot")}
                >
                  Forgot password?
                </button>
              </div>
              <div className="input-with-icon">
                <Icon name="shield" size={16} className="field-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  <Icon name={showPassword ? "eye" : "lock"} size={16} />
                </button>
              </div>
            </div>

            <div className="auth-options-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember this device</span>
              </label>
            </div>

            <button type="submit" className="btn-auth-submit" disabled={loading}>
              {loading ? (
                <div className="btn-spinner-wrap">
                  <div className="mini-spinner" />
                  <span>Signing in...</span>
                </div>
              ) : (
                <span>Sign In to FileShare</span>
              )}
            </button>

            <div className="auth-footer-prompt">
              <span>Don't have an account yet?</span>
              <button
                type="button"
                className="link-switch-action"
                onClick={() => switchView("register")}
              >
                Create Account
              </button>
            </div>
          </form>
        )}

        {/* ==============================================================
            VIEW 2: CREATE ACCOUNT FORM
            ============================================================== */}
        {view === "register" && (
          <form onSubmit={handleRegisterSubmit} className="auth-portal-form">
            <div className="form-group">
              <label>Full Name *</label>
              <div className="input-with-icon">
                <Icon name="user" size={16} className="field-icon" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  autoComplete="name"
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label>Email Address *</label>
              <div className="input-with-icon">
                <Icon name="bell" size={16} className="field-icon" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password *</label>
              <div className="input-with-icon">
                <Icon name="shield" size={16} className="field-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  <Icon name={showPassword ? "eye" : "lock"} size={16} />
                </button>
              </div>

              {/* Password Strength Indicator */}
              {password && (
                <div className="password-strength-container">
                  <div className="strength-bars">
                    <span className={`bar ${strength.score >= 1 ? "filled" : ""}`} style={{ backgroundColor: strength.score >= 1 ? strength.color : undefined }} />
                    <span className={`bar ${strength.score >= 2 ? "filled" : ""}`} style={{ backgroundColor: strength.score >= 2 ? strength.color : undefined }} />
                    <span className={`bar ${strength.score >= 3 ? "filled" : ""}`} style={{ backgroundColor: strength.score >= 3 ? strength.color : undefined }} />
                  </div>
                  <span className="strength-label" style={{ color: strength.color }}>
                    {strength.label} password
                  </span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Confirm Password *</label>
              <div className="input-with-icon">
                <Icon name="shield" size={16} className="field-icon" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  <Icon name={showConfirmPassword ? "eye" : "lock"} size={16} />
                </button>
              </div>
            </div>

            <button type="submit" className="btn-auth-submit" disabled={loading}>
              {loading ? (
                <div className="btn-spinner-wrap">
                  <div className="mini-spinner" />
                  <span>Creating account...</span>
                </div>
              ) : (
                <span>Create Account & Verify</span>
              )}
            </button>

            <div className="auth-footer-prompt">
              <span>Already registered?</span>
              <button
                type="button"
                className="link-switch-action"
                onClick={() => switchView("login")}
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* ==============================================================
            VIEW 3: EMAIL OTP VERIFICATION
            ============================================================== */}
        {view === "verify" && (
          <form onSubmit={handleVerifySubmit} className="auth-portal-form">
            <div className="verify-instructions-box">
              <div className="verify-icon-wrap">
                <Icon name="shield" size={24} />
              </div>
              <h3>Verify Your Email</h3>
              <p>
                We've sent a 6-digit confirmation code to:
                <br />
                <strong>{email}</strong>
              </p>
            </div>

            <div className="otp-inputs-grid" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    otpInputsRef.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="otp-digit-box"
                  autoFocus={i === 0}
                />
              ))}
            </div>

            <button
              type="submit"
              className="btn-auth-submit"
              disabled={loading || otp.join("").length !== 6}
            >
              {loading ? (
                <div className="btn-spinner-wrap">
                  <div className="mini-spinner" />
                  <span>Verifying code...</span>
                </div>
              ) : (
                <span>Verify & Sign In</span>
              )}
            </button>

            <div className="resend-otp-row">
              {resendCooldown > 0 ? (
                <span className="resend-countdown-text">
                  Resend code in <strong>{resendCooldown}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  className="btn-resend-otp"
                  onClick={handleResendOtp}
                >
                  Resend Verification Code
                </button>
              )}
            </div>

            <div className="auth-footer-prompt">
              <button
                type="button"
                className="link-back-action"
                onClick={() => switchView("register")}
              >
                ← Change Email or Register Again
              </button>
            </div>
          </form>
        )}

        {/* ==============================================================
            VIEW 4: FORGOT PASSWORD REQUEST
            ============================================================== */}
        {view === "forgot" && (
          <form onSubmit={handleForgotSubmit} className="auth-portal-form">
            <div className="verify-instructions-box">
              <div className="verify-icon-wrap">
                <Icon name="link" size={22} />
              </div>
              <h3>Reset Your Password</h3>
              <p>Enter your account email to receive a 6-digit password reset code.</p>
            </div>

            <div className="form-group">
              <label>Account Email</label>
              <div className="input-with-icon">
                <Icon name="user" size={16} className="field-icon" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoFocus
                />
              </div>
            </div>

            <button type="submit" className="btn-auth-submit" disabled={loading}>
              {loading ? "Sending reset code..." : "Send Reset Code"}
            </button>

            <div className="auth-footer-prompt">
              <button
                type="button"
                className="link-back-action"
                onClick={() => switchView("login")}
              >
                ← Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* ==============================================================
            VIEW 5: ENTER RESET CODE & SET NEW PASSWORD
            ============================================================== */}
        {view === "reset" && (
          <form onSubmit={handleResetSubmit} className="auth-portal-form">
            <div className="verify-instructions-box">
              <div className="verify-icon-wrap">
                <Icon name="shield" size={22} />
              </div>
              <h3>Set New Password</h3>
              <p>Enter the 6-digit code sent to <strong>{email}</strong></p>
            </div>

            <div className="otp-inputs-grid" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    otpInputsRef.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="otp-digit-box"
                />
              ))}
            </div>

            <div className="form-group" style={{ marginTop: 14 }}>
              <label>New Password</label>
              <div className="input-with-icon">
                <Icon name="shield" size={16} className="field-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  <Icon name={showPassword ? "eye" : "lock"} size={16} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-auth-submit"
              disabled={loading || otp.join("").length !== 6 || !newPassword}
            >
              {loading ? "Updating password..." : "Reset Password & Sign In"}
            </button>

            <div className="auth-footer-prompt">
              <button
                type="button"
                className="link-back-action"
                onClick={() => switchView("login")}
              >
                ← Back to Sign In
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
