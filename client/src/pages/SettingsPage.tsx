import React, { useState } from "react";
import { Icon, Avatar } from "../components/Icons";
import { User, api } from "../services/api";

interface SettingsPageProps {
  user: User | null;
  onUpdateUser: (u: User) => void;
  theme: string;
  onSetTheme: (t: "light" | "dark" | "system") => void;
}

export function SettingsPage({ user, onUpdateUser, theme, onSetTheme }: SettingsPageProps) {
  const [name, setName] = useState(user?.name || "");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const updateData: any = {};
      if (name.trim()) updateData.name = name.trim();
      if (avatar !== undefined) updateData.avatar = avatar.trim();
      if (password.trim()) updateData.password = password;

      const res = await api.updateProfile(updateData);
      onUpdateUser(res.user);
      setPassword("");
      setMessage("Profile settings updated successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page-container">
      <div className="page-header">
        <div>
          <h2>Settings & Preferences</h2>
          <p>Manage your account profile, credentials, and application appearance</p>
        </div>
      </div>

      <div className="settings-cards-stack">
        {/* Profile Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <h3>Profile Information</h3>
            <p>Update your display name, avatar, and password</p>
          </div>

          {message && <div className="modal-success-banner">{message}</div>}
          {error && <div className="modal-error-banner">{error}</div>}

          <form onSubmit={handleSave} className="settings-form">
            <div className="profile-avatar-preview-row">
              <Avatar name={name || user?.name} avatarUrl={avatar || user?.avatar} size={54} />
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <label>Avatar Image URL (Optional)</label>
                <input
                  type="url"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || ""}
                style={{ opacity: 0.7, cursor: "not-allowed" }}
              />
              <small style={{ color: "#6b7280", marginTop: 4, display: "block" }}>
                Email address cannot be changed once registered.
              </small>
            </div>

            <div className="form-group">
              <label>New Password (Leave blank to keep current)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Saving changes..." : "Save Changes"}
            </button>
          </form>
        </div>

        {/* Appearance Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <h3>Appearance & Theme</h3>
            <p>Choose your preferred interface theme</p>
          </div>

          <div className="theme-options-grid">
            <div
              className={`theme-option-box ${theme === "light" ? "active" : ""}`}
              onClick={() => onSetTheme("light")}
            >
              <div className="theme-icon-wrap">
                <Icon name="sun" size={20} />
              </div>
              <strong>Light Theme</strong>
              <p>Clean, bright white and gray surface</p>
            </div>

            <div
              className={`theme-option-box ${theme === "dark" ? "active" : ""}`}
              onClick={() => onSetTheme("dark")}
            >
              <div className="theme-icon-wrap">
                <Icon name="moon" size={20} />
              </div>
              <strong>Dark Theme</strong>
              <p>Comfortable dark slate and navy palette</p>
            </div>

            <div
              className={`theme-option-box ${theme === "system" ? "active" : ""}`}
              onClick={() => onSetTheme("system")}
            >
              <div className="theme-icon-wrap">
                <Icon name="settings" size={20} />
              </div>
              <strong>System Default</strong>
              <p>Automatically match your OS settings</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
