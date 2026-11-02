import React, { useState, useMemo } from "react";
import { Icon, Avatar } from "./Icons";
import { FileItem, api } from "../services/api";

interface FileTableProps {
  files: FileItem[];
  isLoading?: boolean;
  showGroupBadge?: boolean;
  onPreview: (file: FileItem) => void;
  onDelete?: (file: FileItem) => void;
  onUploadClick?: () => void;
  emptyTitle?: string;
  emptyMessage?: string;
  onNavigateUser?: (userId: string) => void;
}

export function getFileCategory(name: string, mime: string): { label: string; kind: string } {
  const ext = name.split(".").pop()?.toUpperCase() || "";
  const lowerName = name.toLowerCase();
  const lowerMime = (mime || "").toLowerCase();

  if (lowerMime.includes("pdf") || lowerName.endsWith(".pdf")) return { label: "PDF", kind: "pdf" };
  if (lowerMime.includes("word") || /\.(docx?|odt|txt|rtf)$/i.test(lowerName)) return { label: ext || "DOC", kind: "doc" };
  if (lowerMime.includes("excel") || lowerMime.includes("spreadsheet") || /\.(xlsx?|csv)$/i.test(lowerName)) return { label: ext || "XLS", kind: "xls" };
  if (lowerMime.includes("presentation") || lowerMime.includes("powerpoint") || /\.(pptx?|odp)$/i.test(lowerName)) return { label: ext || "PPT", kind: "ppt" };
  if (lowerMime.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(lowerName)) return { label: ext || "IMG", kind: "img" };
  if (lowerMime.includes("zip") || lowerMime.includes("tar") || /\.(zip|rar|7z|gz)$/i.test(lowerName)) return { label: "ZIP", kind: "zip" };
  return { label: ext || "FILE", kind: "file" };
}

export function formatTimeAgo(dateString?: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSec < 60) return "Just now";
  if (diffInSec < 3600) return `${Math.floor(diffInSec / 60)} min ago`;
  if (diffInSec < 86400) return `${Math.floor(diffInSec / 3600)} hour ago`;
  if (diffInSec < 172800) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function FileTable({
  files,
  isLoading = false,
  showGroupBadge = false,
  onPreview,
  onDelete,
  onUploadClick,
  emptyTitle = "No files found",
  emptyMessage = "No files match your query or have been uploaded to this group yet.",
  onNavigateUser,
}: FileTableProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortKey, setSortKey] = useState<"newest" | "oldest" | "name" | "size">("newest");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Filtering & Sorting
  const filteredFiles = useMemo(() => {
    return files
      .filter((file) => {
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchesName = file.originalName.toLowerCase().includes(q);
          const matchesUploader = file.uploadedBy?.name?.toLowerCase().includes(q);
          const matchesGroup = file.groupId?.name?.toLowerCase().includes(q);
          if (!matchesName && !matchesUploader && !matchesGroup) return false;
        }

        if (typeFilter !== "all") {
          const { kind } = getFileCategory(file.originalName, file.mimeType);
          if (typeFilter === "pdf" && kind !== "pdf") return false;
          if (typeFilter === "doc" && kind !== "doc") return false;
          if (typeFilter === "xls" && kind !== "xls") return false;
          if (typeFilter === "ppt" && kind !== "ppt") return false;
          if (typeFilter === "img" && kind !== "img") return false;
          if (typeFilter === "zip" && kind !== "zip") return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortKey === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortKey === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (sortKey === "name") return a.originalName.localeCompare(b.originalName);
        if (sortKey === "size") return (b.fileSize || 0) - (a.fileSize || 0);
        return 0;
      });
  }, [files, search, typeFilter, sortKey]);

  return (
    <div className="file-section-wrap">
      {/* Table Toolbar */}
      <div className="file-toolbar">
        <div className="file-toolbar-left">
          {onUploadClick && (
            <button className="btn-primary" onClick={onUploadClick}>
              <Icon name="upload" size={15} />
              <span>Upload Files</span>
            </button>
          )}

          <div className="file-search-wrap">
            <Icon name="search" size={15} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files in this list..."
            />
            {search && (
              <button className="clear-btn" onClick={() => setSearch("")}>
                <Icon name="x" size={12} />
              </button>
            )}
          </div>
        </div>

        <div className="file-toolbar-right">
          {/* Type Filter */}
          <select
            className="filter-select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="pdf">PDF Documents</option>
            <option value="doc">Word / Documents</option>
            <option value="xls">Spreadsheets</option>
            <option value="ppt">Presentations</option>
            <option value="img">Images</option>
            <option value="zip">Archives / ZIP</option>
          </select>

          {/* Sort Filter */}
          <select
            className="filter-select"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as any)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Name (A-Z)</option>
            <option value="size">Size (Large to Small)</option>
          </select>

          {/* View Toggle */}
          <div className="view-toggle-btns">
            <button
              className={`view-btn ${viewMode === "table" ? "active" : ""}`}
              onClick={() => setViewMode("table")}
              title="Table View"
            >
              <Icon name="list" size={15} />
            </button>
            <button
              className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Grid View"
            >
              <Icon name="grid" size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="file-state-box loading">
          <div className="spinner" />
          <span>Loading files...</span>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="file-state-box empty">
          <div className="empty-icon-box">
            <Icon name="fileText" size={28} />
          </div>
          <h4>{emptyTitle}</h4>
          <p>{emptyMessage}</p>
          {onUploadClick && (
            <button className="btn-primary" style={{ marginTop: 16 }} onClick={onUploadClick}>
              <Icon name="upload" size={15} />
              <span>Upload First File</span>
            </button>
          )}
        </div>
      ) : viewMode === "table" ? (
        <div className="file-table-container">
          <table className="fileshare-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input type="checkbox" className="custom-checkbox" aria-label="Select all" />
                </th>
                <th>Name</th>
                {showGroupBadge && <th>Group</th>}
                <th>Uploaded By</th>
                <th>Size</th>
                <th>Uploaded On</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.map((file) => {
                const { label, kind } = getFileCategory(file.originalName, file.mimeType);
                const downloadUrl = api.getDownloadUrl(file.id || file._id);

                return (
                  <tr key={file.id || file._id} onClick={() => onPreview(file)} className="clickable-row">
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="custom-checkbox" aria-label="Select file" />
                    </td>
                    <td>
                      <div className="table-filename-cell">
                        <span className={`file-badge-icon ${kind}`}>{label}</span>
                        <strong className="file-title-text" title={file.originalName}>
                          {file.originalName}
                        </strong>
                      </div>
                    </td>
                    {showGroupBadge && (
                      <td>
                        <span className="badge-group">{file.groupId?.name || "Group"}</span>
                      </td>
                    )}
                    <td onClick={(e) => {
                      if (onNavigateUser && file.uploadedBy?._id) {
                        e.stopPropagation();
                        onNavigateUser(file.uploadedBy._id);
                      }
                    }}>
                      <div className="table-uploader-cell" title={file.uploadedBy?.email || ""}>
                        <Avatar name={file.uploadedBy?.name} avatarUrl={file.uploadedBy?.avatar} size={24} />
                        <span className={onNavigateUser ? "user-link" : ""}>{file.uploadedBy?.name || "Member"}</span>
                      </div>
                    </td>
                    <td className="text-muted">{file.size}</td>
                    <td className="text-muted">{formatTimeAgo(file.createdAt)}</td>
                    <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                      <div className="table-actions-cell">
                        <a
                          href={downloadUrl}
                          className="action-icon-btn"
                          title="Download"
                          download={file.originalName}
                        >
                          <Icon name="download" size={15} />
                        </a>
                        <button
                          className="action-icon-btn"
                          title="Preview"
                          onClick={() => onPreview(file)}
                        >
                          <Icon name="eye" size={15} />
                        </button>
                        {file.canDelete && onDelete && (
                          <button
                            className="action-icon-btn danger"
                            title="Delete file"
                            onClick={() => onDelete(file)}
                          >
                            <Icon name="trash" size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid View */
        <div className="file-grid-container">
          {filteredFiles.map((file) => {
            const { label, kind } = getFileCategory(file.originalName, file.mimeType);
            const downloadUrl = api.getDownloadUrl(file.id || file._id);

            return (
              <div
                key={file.id || file._id}
                className="fileshare-grid-card"
                onClick={() => onPreview(file)}
              >
                <div className={`grid-card-preview ${kind}`}>
                  <span className="grid-kind-badge">{label}</span>
                  <div className="grid-hover-actions" onClick={(e) => e.stopPropagation()}>
                    <button title="Preview" onClick={() => onPreview(file)}>
                      <Icon name="eye" size={15} />
                    </button>
                    <a href={downloadUrl} title="Download" download={file.originalName}>
                      <Icon name="download" size={15} />
                    </a>
                    {file.canDelete && onDelete && (
                      <button className="danger" title="Delete" onClick={() => onDelete(file)}>
                        <Icon name="trash" size={15} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid-card-details">
                  <strong className="grid-card-title" title={file.originalName}>
                    {file.originalName}
                  </strong>
                  {showGroupBadge && (
                    <span className="badge-group" style={{ marginTop: 4 }}>
                      {file.groupId?.name || "Group"}
                    </span>
                  )}
                  <div className="grid-card-meta">
                    <span className="grid-uploader">
                      <Avatar name={file.uploadedBy?.name} size={18} />
                      <span>{file.uploadedBy?.name?.split(" ")[0] || "Member"}</span>
                    </span>
                    <span>{file.size}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
