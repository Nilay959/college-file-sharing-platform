import React, { useState } from "react";
import { Icon } from "../components/Icons";
import { api, setAuthToken, setUserInfo, User } from "../services/api";

interface AuthPageProps {
  onAuthSuccess: (user: User) => void;
}

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please fill in all required fields");
      return;
    }

    if (isRegister && !name.trim()) {
      setError("Please enter your full name");
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        const res = await api.register({
          name: name.trim(),
          email: email.trim(),
          password,
        });
        setAuthToken(res.token);
        setUserInfo(res.user);
        onAuthSuccess(res.user);
      } else {
        const res = await api.login({
          email: email.trim(),
          password,
        });
        setAuthToken(res.token);
        setUserInfo(res.user);
        onAuthSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card-box">
        {/* Brand */}
        <div className="auth-brand-header">
          <div className="brand-logo-large">
            <Icon name="folder" size={28} />
          </div>
          <h1>FileShare</h1>
          <p>Group-based collaborative file sharing for study groups and teams</p>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tabs-toggle">
          <button
            className={`auth-tab-btn ${!isRegister ? "active" : ""}`}
            onClick={() => {
              setIsRegister(false);
              setError("");
            }}
          >
            Sign In
          </button>
          <button
            className={`auth-tab-btn ${isRegister ? "active" : ""}`}
            onClick={() => {
              setIsRegister(true);
              setError("");
            }}
          >
            Create Account
          </button>
        </div>

        {error && <div className="modal-error-banner" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                autoComplete="name"
              />
            </div>
          )}

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. rahul@example.com"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={isRegister ? "new-password" : "current-password"}
            />
          </div>

          <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
            {loading
              ? isRegister
                ? "Creating account..."
                : "Signing in..."
              : isRegister
              ? "Register & Get Started"
              : "Sign In"}
          </button>
        </form>

        <div className="auth-card-footer">
          {isRegister ? (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setIsRegister(false);
                  setError("");
                }}
              >
                Sign in here
              </button>
            </p>
          ) : (
            <p>
              New to FileShare?{" "}
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setIsRegister(true);
                  setError("");
                }}
              >
                Create a free account
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
