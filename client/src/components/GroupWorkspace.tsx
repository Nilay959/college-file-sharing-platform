import React, { useState, useMemo, useRef, useEffect } from "react";
import { Icon, Avatar } from "./Icons";
import { Group, FileItem, api } from "../services/api";
import { getGroupVisual } from "./LeftSidebar";

interface GroupWorkspaceProps {
  group: Group | null;
  files: FileItem[];
  isLoadingFiles?: boolean;
  onUploadClick: () => void;
  onPreviewFile: (file: FileItem) => void;
  onDeleteFile: (file: FileItem) => void;
  onOpenGroupInfo: () => void;
  isGroupInfoOpen: boolean;
  onBackToSidebar?: () => void;
  activeMemberFilter?: { id: string; name: string } | null;
  onClearMemberFilter?: () => void;
}

// Category & badge helper
export function getFileCategoryInfo(name: string, mime: string) {
  const ext = name.split(".").pop()?.toUpperCase() || "";
  const lowerName = name.toLowerCase();
  const lowerMime = (mime || "").toLowerCase();

  if (lowerMime.includes("pdf") || lowerName.endsWith(".pdf")) {
    return { kind: "pdf", label: "PDF", bg: "#282828", color: "#F1F1F1" };
  }
  if (lowerMime.includes("word") || /\.(docx?|odt|rtf|txt)$/i.test(lowerName)) {
    return { kind: "doc", label: ext || "DOC", bg: "#282828", color: "#F1F1F1" };
  }
  if (lowerMime.includes("excel") || lowerMime.includes("spreadsheet") || /\.(xlsx?|csv)$/i.test(lowerName)) {
    return { kind: "xls", label: ext || "XLS", bg: "#282828", color: "#F1F1F1" };
  }
  if (lowerMime.includes("presentation") || lowerMime.includes("powerpoint") || /\.(pptx?|odp)$/i.test(lowerName)) {
    return { kind: "ppt", label: ext || "PPT", bg: "#282828", color: "#F1F1F1" };
  }
  if (lowerMime.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(lowerName)) {
    return { kind: "img", label: ext || "IMG", bg: "#282828", color: "#F1F1F1" };
  }
  if (lowerMime.includes("zip") || lowerMime.includes("tar") || /\.(zip|rar|7z|gz|tar)$/i.test(lowerName)) {
    return { kind: "zip", label: ext || "ZIP", bg: "#282828", color: "#F1F1F1" };
  }
  if (/\.(js|jsx|ts|tsx|py|java|c|cpp|cs|html|css|json|sql|sh)$/i.test(lowerName)) {
    return { kind: "code", label: ext || "CODE", bg: "#282828", color: "#F1F1F1" };
  }
  return { kind: "file", label: ext || "FILE", bg: "#282828", color: "#F1F1F1" };
}

// Relative time format
export function formatCardTime(dateString?: string): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
  if (diffSec < 172800) return "Yesterday";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function GroupWorkspace({
  group,
  files,
  isLoadingFiles = false,
  onUploadClick,
  onPreviewFile,
  onDeleteFile,
  onOpenGroupInfo,
  isGroupInfoOpen,
  onBackToSidebar,
  activeMemberFilter,
  onClearMemberFilter,
}: GroupWorkspaceProps) {
  // Toolbar state
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "largest" | "smallest">("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Header 3-dot dropdown state
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Active file card dropdown
  const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setHeaderMenuOpen(false);
      }
      const target = e.target as HTMLElement;
      if (!target.closest(".file-card-menu-wrap")) {
        setOpenCardMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter & sort files
  const processedFiles = useMemo(() => {
    return files
      .filter((file) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = file.originalName.toLowerCase().includes(q);
          const matchesUploader = file.uploadedBy?.name?.toLowerCase().includes(q);
          if (!matchesName && !matchesUploader) return false;
        }

        // Type filter
        if (typeFilter !== "all") {
          const { kind } = getFileCategoryInfo(file.originalName, file.mimeType);
          if (typeFilter === "pdf" && kind !== "pdf") return false;
          if (typeFilter === "doc" && kind !== "doc") return false;
          if (typeFilter === "ppt" && kind !== "ppt") return false;
          if (typeFilter === "xls" && kind !== "xls") return false;
          if (typeFilter === "img" && kind !== "img") return false;
          if (typeFilter === "zip" && kind !== "zip") return false;
          if (typeFilter === "code" && kind !== "code") return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortOrder === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (sortOrder === "largest") return (b.fileSize || 0) - (a.fileSize || 0);
        if (sortOrder === "smallest") return (a.fileSize || 0) - (b.fileSize || 0);
        return 0;
      });
  }, [files, searchQuery, typeFilter, sortOrder]);

  if (!group) {
    return (
      <div className="workspace-empty-container">
        <div className="workspace-empty-icon">
          <Icon name="folder" size={48} />
        </div>
        <h2>Select a group to start sharing</h2>
        <p>Choose a group from the left sidebar or create a new group with your team.</p>
      </div>
    );
  }

  const { icon: groupIcon, bg: groupBg, color: groupColor } = getGroupVisual(group.name);

  return (
    <section className="fileshare-workspace-panel">
      {/* ==============================================================
          A. COMPACT GROUP HEADER (Height: 68px, WhatsApp Web style)
          ============================================================== */}
      <header className="workspace-compact-header">
        <div className="header-left-section" onClick={onOpenGroupInfo} role="button" tabIndex={0}>
          {onBackToSidebar && (
            <button
              className="workspace-back-btn"
              onClick={(e) => {
                e.stopPropagation();
                onBackToSidebar();
              }}
              aria-label="Back to groups"
            >
              <Icon name="arrowLeft" size={18} />
            </button>
          )}

          {/* Group Avatar */}
          <div
            className="group-header-avatar"
            style={{ backgroundColor: groupBg, color: groupColor }}
          >
            <Icon name={groupIcon} size={22} />
          </div>

          {/* Group Name & Counts */}
          <div className="group-header-title-box">
            <h2 className="group-header-title" title={group.name}>
              {group.name}
            </h2>
            <span className="group-header-subtitle">
              {group.memberCount || 1} members · {files.length} files
            </span>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="header-right-actions">
          <button
            className="header-icon-action-btn"
            title="Search in this group"
            onClick={() => searchInputRef.current?.focus()}
          >
            <Icon name="search" size={18} />
          </button>

          <div className="header-menu-container" ref={headerMenuRef}>
            <button
              className="header-icon-action-btn"
              title="More options"
              onClick={() => setHeaderMenuOpen((v) => !v)}
            >
              <Icon name="more" size={18} />
            </button>

            {headerMenuOpen && (
              <div className="header-dropdown-menu">
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setHeaderMenuOpen(false);
                    onOpenGroupInfo();
                  }}
                >
                  <Icon name="info" size={15} />
                  <span>Group Info</span>
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setHeaderMenuOpen(false);
                    onUploadClick();
                  }}
                >
                  <Icon name="upload" size={15} />
                  <span>Upload Files</span>
                </button>
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setHeaderMenuOpen(false);
                    navigator.clipboard.writeText(group.inviteCode);
                  }}
                >
                  <Icon name="copy" size={15} />
                  <span>Copy Invite Code</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Optional Member Filter Active Banner */}
      {activeMemberFilter && (
        <div className="workspace-filter-banner">
          <div className="filter-banner-text">
            <Icon name="user" size={14} />
            <span>Showing files uploaded by <strong>{activeMemberFilter.name}</strong></span>
          </div>
          <button className="filter-banner-clear-btn" onClick={onClearMemberFilter}>
            <Icon name="x" size={13} />
            <span>Clear filter</span>
          </button>
        </div>
      )}

      {/* ==============================================================
          B. FILE TOOLBAR (Strict Order & Dimensions:
          [Search (leftmost, flex-grow:1)] [All Types] [Newest First] [Grid|List] [Upload (extreme right)]
          NO tabs above this toolbar)
          ============================================================== */}
      <div className="workspace-file-toolbar">
        {/* 1. Search Files Input (LEFTMOST, flex-grow: 1, widest) */}
        <div className="toolbar-search-box">
          <Icon name="search" size={16} className="toolbar-search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files in this group..."
          />
          {searchQuery && (
            <button
              className="toolbar-search-clear"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
            >
              <Icon name="x" size={13} />
            </button>
          )}
        </div>

        {/* 2. File Type Filter */}
        <div className="toolbar-select-wrap type-select">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter by file type"
          >
            <option value="all">All Types</option>
            <option value="pdf">PDF Documents</option>
            <option value="doc">Word / Text</option>
            <option value="ppt">Presentations</option>
            <option value="xls">Spreadsheets</option>
            <option value="img">Images</option>
            <option value="zip">Archives (ZIP)</option>
            <option value="code">Source Code</option>
          </select>
          <Icon name="chevron" size={12} className="select-chevron-icon" />
        </div>

        {/* 3. Sorting Dropdown */}
        <div className="toolbar-select-wrap sort-select">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            aria-label="Sort files"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="largest">Largest First</option>
            <option value="smallest">Smallest First</option>
          </select>
          <Icon name="chevron" size={12} className="select-chevron-icon" />
        </div>

        {/* 4. Grid / List View Toggle */}
        <div className="toolbar-view-toggle">
          <button
            type="button"
            className={`view-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
            onClick={() => setViewMode("grid")}
            title="Grid view"
          >
            <Icon name="grid" size={15} />
          </button>
          <button
            type="button"
            className={`view-toggle-btn ${viewMode === "list" ? "active" : ""}`}
            onClick={() => setViewMode("list")}
            title="List view"
          >
            <Icon name="list" size={15} />
          </button>
        </div>

        {/* 5. Upload Files Button (EXTREME RIGHT, margin-left: auto) */}
        <button className="toolbar-btn-upload" onClick={onUploadClick}>
          <Icon name="upload" size={15} />
          <span>Upload Files</span>
        </button>
      </div>

      {/* ==============================================================
          C. FILE DISPLAY AREA (Independent Scrollable Container)
          ============================================================== */}
      <div className="workspace-files-scroll-area">
        {isLoadingFiles ? (
          <div className="workspace-loading-state">
            <div className="spinner" />
            <span>Loading group files...</span>
          </div>
        ) : processedFiles.length === 0 ? (
          <div className="workspace-no-files">
            <div className="no-files-icon-box">
              <Icon name="fileText" size={32} />
            </div>
            <h3>{searchQuery || typeFilter !== "all" ? "No matching files" : "No files uploaded yet"}</h3>
            <p>
              {searchQuery || typeFilter !== "all"
                ? "Try adjusting your search terms or filters."
                : "Share lecture notes, practical files, presentations or assignments with this group."}
            </p>
            {!searchQuery && typeFilter === "all" && (
              <button className="toolbar-btn-upload" onClick={onUploadClick} style={{ marginTop: 12 }}>
                <Icon name="upload" size={15} />
                <span>Upload First File</span>
              </button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          /* Responsive Grid View */
          <div className="workspace-file-grid">
            {processedFiles.map((file) => {
              const fileId = file.id || file._id;
              const { kind, label, bg, color } = getFileCategoryInfo(file.originalName, file.mimeType);
              const isImage = kind === "img";
              const isCardMenuOpen = openCardMenuId === fileId;
              const downloadUrl = api.getDownloadUrl(fileId);

              return (
                <div key={fileId} className="file-grid-card">
                  {/* Card Top / Thumbnail Area */}
                  <div
                    className="file-card-preview-area"
                    onClick={() => onPreviewFile(file)}
                    title={`Click to preview ${file.originalName}`}
                  >
                    {isImage ? (
                      <div className="file-card-image-thumbnail">
                        {/* Image preview with fallback */}
                        <img
                          src={downloadUrl}
                          alt={file.originalName}
                          onError={(e) => {
                            // Fallback to graphic box if direct preview cannot render
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                        <div className="image-fallback-badge">
                          <Icon name="image" size={28} />
                        </div>
                      </div>
                    ) : kind === "code" ? (
                      <div className="file-card-code-preview">
                        <div className="code-dots">
                          <span className="dot red" />
                          <span className="dot yellow" />
                          <span className="dot green" />
                        </div>
                        <div className="code-badge-label">{label}</div>
                      </div>
                    ) : (
                      <div className="file-card-badge-preview">
                        <div
                          className="file-card-type-pill"
                          style={{ backgroundColor: bg, color: color }}
                        >
                          <span className="badge-sheet-corner" />
                          <span className="badge-label-text">{label}</span>
                        </div>
                      </div>
                    )}

                    {/* Card 3-dot dropdown menu */}
                    <div
                      className="file-card-menu-wrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="file-card-menu-trigger"
                        onClick={() =>
                          setOpenCardMenuId((current) => (current === fileId ? null : fileId))
                        }
                        title="Actions"
                      >
                        <Icon name="more" size={15} />
                      </button>

                      {isCardMenuOpen && (
                        <div className="card-context-menu">
                          <button
                            className="card-context-item"
                            onClick={() => {
                              setOpenCardMenuId(null);
                              onPreviewFile(file);
                            }}
                          >
                            <Icon name="eye" size={14} />
                            <span>Preview</span>
                          </button>

                          <a
                            href={downloadUrl}
                            download={file.originalName}
                            className="card-context-item"
                            onClick={() => setOpenCardMenuId(null)}
                          >
                            <Icon name="download" size={14} />
                            <span>Download</span>
                          </a>

                          {(file.canDelete || group.role === "admin") && (
                            <button
                              className="card-context-item danger"
                              onClick={() => {
                                setOpenCardMenuId(null);
                                onDeleteFile(file);
                              }}
                            >
                              <Icon name="trash" size={14} />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom / File Details */}
                  <div className="file-card-details">
                    <h4
                      className="file-card-filename"
                      title={file.originalName}
                      onClick={() => onPreviewFile(file)}
                    >
                      {file.originalName}
                    </h4>

                    {/* Uploader Row */}
                    <div className="file-card-uploader-row">
                      <Avatar
                        name={file.uploadedBy?.name}
                        avatarUrl={file.uploadedBy?.avatar}
                        size={20}
                      />
                      <span className="file-card-uploader-name" title={file.uploadedBy?.name}>
                        {file.uploadedBy?.name || "Member"}
                      </span>
                    </div>

                    {/* Size and Time */}
                    <div className="file-card-meta-row">
                      <span>{file.size}</span>
                      <span>·</span>
                      <span>{formatCardTime(file.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List / Table View */
          <div className="workspace-file-list">
            <div className="file-list-header-row">
              <span className="col-name">Name</span>
              <span className="col-uploader">Uploaded by</span>
              <span className="col-size">Size</span>
              <span className="col-date">Date</span>
              <span className="col-actions">Actions</span>
            </div>

            {processedFiles.map((file) => {
              const fileId = file.id || file._id;
              const { label, bg, color } = getFileCategoryInfo(file.originalName, file.mimeType);
              const downloadUrl = api.getDownloadUrl(fileId);

              return (
                <div key={fileId} className="file-list-row">
                  <div className="col-name file-list-name-col" onClick={() => onPreviewFile(file)}>
                    <span
                      className="file-list-badge"
                      style={{ backgroundColor: bg, color: color }}
                    >
                      {label}
                    </span>
                    <span className="file-name-text" title={file.originalName}>
                      {file.originalName}
                    </span>
                  </div>

                  <div className="col-uploader file-list-uploader-col">
                    <Avatar
                      name={file.uploadedBy?.name}
                      avatarUrl={file.uploadedBy?.avatar}
                      size={22}
                    />
                    <span>{file.uploadedBy?.name || "Member"}</span>
                  </div>

                  <div className="col-size">{file.size}</div>
                  <div className="col-date">{formatCardTime(file.createdAt)}</div>

                  <div className="col-actions file-list-actions-col">
                    <button
                      className="list-action-btn"
                      title="Preview"
                      onClick={() => onPreviewFile(file)}
                    >
                      <Icon name="eye" size={15} />
                    </button>

                    <a
                      href={downloadUrl}
                      download={file.originalName}
                      className="list-action-btn"
                      title="Download"
                    >
                      <Icon name="download" size={15} />
                    </a>

                    {(file.canDelete || group.role === "admin") && (
                      <button
                        className="list-action-btn danger"
                        title="Delete"
                        onClick={() => onDeleteFile(file)}
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
