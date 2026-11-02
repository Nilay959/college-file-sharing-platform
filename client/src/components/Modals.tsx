import React, { useState, useRef } from "react";
import { Icon } from "./Icons";
import { Group, FileItem, api } from "../services/api";

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
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  groups: Group[];
  defaultGroupId?: string;
  onSuccess: () => void;
}) {
  const [groupId, setGroupId] = useState(defaultGroupId || (groups[0]?.id || ""));
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

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
    if (!groupId) {
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
      await api.uploadFile(groupId, file);
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
              <h3>Upload File to Group</h3>
              <p>Share notes, documents, slides, or archives with group members</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>

        {error && <div className="modal-error-banner">{error}</div>}

        <form onSubmit={handleUpload}>
          <div className="form-group">
            <label>Select Target Group *</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              required
            >
              <option value="" disabled>Choose a group...</option>
              {groups.map((grp) => (
                <option key={grp.id} value={grp.id}>
                  {grp.name} ({grp.role === "admin" ? "Admin" : "Member"})
                </option>
              ))}
            </select>
          </div>

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
                  <small style={{ color: "#6366F1", marginTop: 4 }}>Click or drag another file to replace</small>
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
