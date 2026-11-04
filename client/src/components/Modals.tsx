import React, { useState, useRef, useEffect } from "react";
import { Icon, Avatar } from "./Icons";
import { Group, FileItem, User, ActivityItem, api } from "../services/api";

// 1. Create Group Modal
export function CreateGroupModal({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string) => Promise<any>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a group name");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onCreate(name.trim(), description.trim());
      setName("");
      setDescription("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-badge blue">
              <Icon name="plus" size={18} />
            </div>
            <div>
              <h3>Create New Group</h3>
              <p>Start a collaborative workspace and share files with members</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>

        {error && <div className="modal-error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Group Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., CSE Semester 5, Web Dev Team, AI Lab"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Description (Optional)</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this group for? Share resources, syllabus, lecture notes..."
            />
          </div>

          <div className="modal-info-note">
            <Icon name="shield" size={16} />
            <span>A permanent unique invite code will be automatically generated. You can share it anytime.</span>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading || !name.trim()}>
              {loading ? "Creating..." : "Create Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 2. Join Group Modal
export function JoinGroupModal({
  isOpen,
  onClose,
  onJoin,
}: {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (inviteCode: string) => Promise<any>;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError("Please enter the invite code");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onJoin(code.trim().toUpperCase());
      setCode("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to join group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-badge sky">
              <Icon name="users" size={18} />
            </div>
            <div>
              <h3>Join a Group</h3>
              <p>Enter the permanent invite code shared with you</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>

        {error && <div className="modal-error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Group Invite Code</label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g., CS5X8K2P"
              maxLength={12}
              style={{ letterSpacing: "2px", fontWeight: 700, textTransform: "uppercase" }}
              autoFocus
            />
            <small style={{ color: "#6b7280", marginTop: 4, display: "block" }}>
              Invite codes are typically 8 characters long and not case-sensitive.
            </small>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading || !code.trim()}>
              {loading ? "Joining..." : "Join Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 3. Upload File Modal
export function UploadModal({
  isOpen,
  onClose,
  groups,
  defaultGroupId,
  targetGroup,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  groups: Group[];
  defaultGroupId?: string;
  targetGroup?: Group | null;
  onSuccess: () => void;
}) {
  const initialGroupId = defaultGroupId || targetGroup?.id || (targetGroup as any)?._id || (groups[0]?.id || (groups[0] as any)?._id || "");
  const [groupId, setGroupId] = useState(initialGroupId);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const activeId = defaultGroupId || targetGroup?.id || (targetGroup as any)?._id || (groups[0]?.id || (groups[0] as any)?._id || "");
      setGroupId(activeId);
      setFile(null);
      setError("");
    }
  }, [isOpen, defaultGroupId, targetGroup, groups]);

  if (!isOpen) return null;

  const activeGroup = targetGroup || groups.find((g) => (g.id || (g as any)._id) === groupId) || null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = groupId || defaultGroupId || targetGroup?.id || (targetGroup as any)?._id;
    if (!targetId) {
      setError("Please choose a target group");
      return;
    }
    if (!file) {
      setError("Please select a file to upload");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await api.uploadFile(targetId, file);
      setFile(null);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to upload file");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-badge blue">
              <Icon name="upload" size={18} />
            </div>
            <div>
              <h3>{activeGroup ? `Upload File to ${activeGroup.name}` : "Upload File to Group"}</h3>
              <p>{activeGroup ? `File will be uploaded directly to ${activeGroup.name}` : "Share notes, documents, slides, or archives with group members"}</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>

        {error && <div className="modal-error-banner">{error}</div>}

        <form onSubmit={handleUpload}>
          {activeGroup ? (
            <div className="form-group">
              <label>Target Group</label>
              <div className="upload-group-locked-display">
                <div className="locked-group-icon">
                  <Icon name="folder" size={16} />
                </div>
                <span className="locked-group-name">{activeGroup.name}</span>
                <span className="locked-group-pill">Current Group</span>
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label>Select Target Group *</label>
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                required
              >
                <option value="" disabled>Choose a group...</option>
                {groups.map((grp) => {
                  const gid = grp.id || (grp as any)._id;
                  return (
                    <option key={gid} value={gid}>
                      {grp.name} ({grp.role === "admin" ? "Admin" : "Member"})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <div className="form-group">
            <label>File *</label>
            <div
              className={`fileshare-dropzone ${isDragOver ? "dragover" : ""} ${file ? "has-file" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />

              <div className="dropzone-icon">
                <Icon name="upload" size={24} />
              </div>

              {file ? (
                <div className="dropzone-file-selected">
                  <strong>{file.name}</strong>
                  <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                  <small style={{ color: "#FF7A1A", marginTop: 4 }}>Click or drag another file to replace</small>
                </div>
              ) : (
                <div className="dropzone-instructions">
                  <strong>Drag and drop your file here</strong>
                  <span>or click to browse files from your computer</span>
                  <small>PDF, DOCX, PPTX, XLSX, ZIP, Images up to 50 MB</small>
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading || !file || !groupId}>
              {loading ? "Uploading to R2..." : "Upload File"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 4. File Preview Modal
export function PreviewModal({
  file,
  onClose,
}: {
  file: FileItem | null;
  onClose: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (!file) return;
    let isMounted = true;
    setLoading(true);
    api.getPreview(file.id || file._id)
      .then((res) => {
        if (isMounted) setPreviewUrl(res.previewUrl);
      })
      .catch((err) => {
        console.warn("Could not fetch presigned preview URL:", err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [file]);

  if (!file) return null;

  const isPdf = file.mimeType?.toLowerCase().includes("pdf") || file.originalName.toLowerCase().endsWith(".pdf");
  const isImage = file.mimeType?.toLowerCase().startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.originalName);
  const downloadUrl = api.getDownloadUrl(file.id || file._id);

  return (
    <div className="modal-overlay preview" onClick={onClose}>
      <div className="preview-container" onClick={(e) => e.stopPropagation()}>
        <div className="preview-header">
          <div className="preview-file-meta">
            <button className="preview-back-btn" onClick={onClose} title="Close Preview">
              <Icon name="arrowLeft" size={18} />
            </button>
            <div>
              <strong className="preview-filename">{file.originalName}</strong>
              <div className="preview-submeta">
                <span className="badge-group">{file.groupId?.name || "Group"}</span>
                <span>Uploaded by {file.uploadedBy?.name || "Member"}</span>
                <span>{file.size}</span>
              </div>
            </div>
          </div>

          <div className="preview-actions">
            <a
              href={downloadUrl}
              className="btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
              download={file.originalName}
            >
              <Icon name="download" size={15} />
              <span>Download</span>
            </a>
            <button className="modal-close-btn" onClick={onClose}>
              <Icon name="x" size={18} />
            </button>
          </div>
        </div>

        <div className="preview-body">
          {loading ? (
            <div className="preview-loading">
              <div className="spinner" />
              <span>Loading preview from Cloudflare R2...</span>
            </div>
          ) : isPdf && previewUrl ? (
            <iframe
              src={previewUrl}
              title={file.originalName}
              className="preview-iframe"
            />
          ) : isImage && previewUrl ? (
            <div className="preview-image-wrap">
              <img src={previewUrl} alt={file.originalName} />
            </div>
          ) : (
            <div className="preview-unavailable">
              <div className="unavailable-icon">
                <Icon name="fileText" size={32} />
              </div>
              <h3>Preview unavailable for this format</h3>
              <p>This file type cannot be previewed directly in the browser.</p>
              <a
                href={downloadUrl}
                className="btn-primary"
                style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}
                download={file.originalName}
              >
                <Icon name="download" size={16} />
                <span>Download {file.originalName}</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 5. Delete Confirmation Modal
export function DeleteModal({
  isOpen,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onClose,
  loading = false,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-badge danger">
              <Icon name="trash" size={18} />
            </div>
            <div>
              <h3 style={{ color: "#EF4444" }}>{title}</h3>
              <p>This action cannot be undone</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} disabled={loading}>
            <Icon name="x" size={16} />
          </button>
        </div>

        <div style={{ margin: "16px 0", fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)" }}>
          {message}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// 6. User Settings Modal
export function SettingsModal({
  isOpen,
  onClose,
  user,
  onUpdateUser,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUpdateUser: (updatedUser: User) => void;
}) {
  const [name, setName] = useState(user?.name || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setAvatar(user.avatar || "");
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
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
      setTimeout(() => {
        setMessage("");
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-badge blue">
              <Icon name="settings" size={18} />
            </div>
            <div>
              <h3>Account Settings</h3>
              <p>Manage your profile and account preferences</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} disabled={loading}>
            <Icon name="x" size={16} />
          </button>
        </div>

        {message && <div className="modal-success-banner">{message}</div>}
        {error && <div className="modal-error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="profile-avatar-preview-row" style={{ display: "flex", alignItems: "center", gap: 14, margin: "16px 0" }}>
            <Avatar name={name || user?.name} avatarUrl={avatar || user?.avatar} size={48} />
            <div className="form-group" style={{ flex: 1, margin: 0 }}>
              <label>Avatar Image URL</label>
              <input
                type="url"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://example.com/photo.jpg"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Full Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              disabled
              value={user?.email || ""}
              style={{ opacity: 0.65, cursor: "not-allowed" }}
            />
          </div>

          <div className="form-group">
            <label>New Password (Optional)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep current password"
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading || !name.trim()}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 7. Notifications Modal
export function NotificationsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [stats, setStats] = useState<{ recentActivity: ActivityItem[] } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    api.getDashboard()
      .then((data) => setStats(data))
      .catch((err) => console.error("Failed to load notifications:", err))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-icon-badge blue">
              <Icon name="bell" size={18} />
            </div>
            <div>
              <h3>Recent Notifications</h3>
              <p>Activity across all your groups</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="notifications-modal-list" style={{ maxHeight: 360, overflowY: "auto", margin: "16px 0" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: 24, color: "#94A3B8" }}>Loading activity...</div>
          ) : !stats?.recentActivity || stats.recentActivity.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: "#94A3B8" }}>No recent notifications</div>
          ) : (
            stats.recentActivity.map((act) => (
              <div
                key={act._id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 8,
                  marginBottom: 6,
                  backgroundColor: "rgba(255, 255, 255, 0.03)",
                  fontSize: 13,
                }}
              >
                <div style={{ color: "#FF7A1A", marginTop: 2 }}>
                  <Icon name={act.action.includes("upload") ? "upload" : "users"} size={16} />
                </div>
                <div>
                  <div>
                    <strong>{act.userId?.name || "Member"}</strong>{" "}
                    {act.action === "uploaded_file" && "uploaded"}
                    {act.action === "joined_group" && "joined"}
                    {act.action === "created_group" && "created"}{" "}
                    {act.fileId?.originalName ? `"${act.fileId.originalName}"` : ""}{" "}
                    in <strong>{act.groupId?.name || "Group"}</strong>
                  </div>
                  <small style={{ color: "#94A3B8" }}>
                    {new Date(act.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                  </small>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
