import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getUserInfo } from "./services/api";
import {
  Icon,
  Avatar,
  PreviewModal,
  UploadModal,
} from "./App";
import { fileType, formatDate, sizeInBytes } from "./utils/fileUtils";
import { useTheme } from "./utils/theme";

interface MyUploadsPageProps {
  onLogout: () => void;
  onNavigate: (path: string, spaceId?: string) => void;
}

export default function MyUploadsPage({ onLogout, onNavigate }: MyUploadsPageProps) {
  const queryClient = useQueryClient();
  const { theme, setTheme, isDark, systemDark } = useTheme();
  const [subject, setSubject] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"date" | "name" | "size" | "subject">("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [view, setView] = useState<"grid" | "list">("grid");

  // Modals
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [deleteFile, setDeleteFile] = useState<any>(null);
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  // Click outside for sort menu
  useEffect(() => {
    function handleClickOutside(event: any) {
      if (sortRef.current && !sortRef.current.contains(event.target)) {
        setSortOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Queries
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ["me"],
    queryFn: api.getMe,
  });
  const { data: hierarchy = [], isLoading: hierarchyLoading } = useQuery({
    queryKey: ["hierarchy"],
    queryFn: api.getHierarchy,
  });
  const { data: publicSubjects = [], isLoading: subjectsLoading } = useQuery({
    queryKey: ["publicSubjects"],
    queryFn: api.getPublicSubjects,
  });

  const user = userData || getUserInfo();

  // Debounced search for backend
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch my uploads
  const { data: myFiles = [], isLoading: filesLoading } = useQuery({
    queryKey: ["myUploads", debouncedQuery],
    queryFn: () => api.getMyUploads(debouncedQuery),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (fileId: string) => api.deleteMyUpload(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myUploads"] });
      queryClient.invalidateQueries({ queryKey: ["files"] });
      setDeleteFile(null);
    },
    onError: (err: any) => {
      alert("Failed to delete file: " + (err.message || "Unknown error"));
    },
  });

  // Calculate spaces
  const spaces = useMemo(
    () =>
      (user?.spaces || []).map((value: string) => {
        const node = hierarchy.find((item: any) => item.value === value);
        return {
          id: value,
          label: node?.name || value,
          subtitle:
            node?.type === "batch" ? "Batch files" : "Division-wide files",
        };
      }),
    [user, hierarchy],
  );

  // Helper for space labels
  const formatSpaceLabel = (spaceId: string) => {
    const s = spaces.find((sp: any) => sp.id === spaceId);
    if (s) return s.label;
    if (spaceId === "edivision" || spaceId === "Div E") return "E Division";
    if (spaceId === "e1") return "E1 Batch";
    if (spaceId === "e2") return "E2 Batch";
    return spaceId;
  };

  // Helper for subject labels
  const subjectLabel = (idOrShort: string) => {
    const found = publicSubjects.find(
      (item: any) => item._id === idOrShort || item.shortName === idOrShort,
    );
    return found?.shortName || found?.name || idOrShort;
  };

  // Total storage calculated
  const totalStorage = useMemo(() => {
    const bytes = myFiles.reduce((acc: number, f: any) => acc + sizeInBytes(f.size || ""), 0);
    if (bytes === 0) return "0 MB";
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return (bytes / 1024).toFixed(1) + " KB";
    return mb.toFixed(2) + " MB";
  }, [myFiles]);

  // Unique counts for stats
  const uniqueSubjectsCount = useMemo(() => {
    const set = new Set(myFiles.map((f: any) => f.subjectShortName || f.subject).filter(Boolean));
    return set.size;
  }, [myFiles]);

  const uniqueSpacesCount = useMemo(() => {
    const set = new Set(myFiles.map((f: any) => f.space).filter(Boolean));
    return set.size;
  }, [myFiles]);

  // Dynamic Subject Tabs based on student's uploaded files + semester subjects
  const subjectTabs = useMemo(() => {
    const map = new Map<string, string>();
    // Collect from student's semester subjects
    const department = hierarchy.find(
      (item: any) => item.value === user?.department,
    );
    const semester = hierarchy.find(
      (item: any) => item.value === user?.semester,
    );
    const semesterSubjects = publicSubjects.filter(
      (item: any) =>
        item.departmentId === department?._id &&
        item.semesterId === semester?._id,
    );
    semesterSubjects.forEach((sub: any) => {
      map.set(sub._id, sub.shortName || sub.name);
    });

    // Also include any subjects from uploaded files
    myFiles.forEach((f: any) => {
      if (f.subject && !map.has(f.subject)) {
        map.set(f.subject, f.subjectShortName || f.subjectName || subjectLabel(f.subject));
      }
    });

    return [
      { id: "all", label: "All" },
      ...Array.from(map.entries()).map(([id, label]) => ({ id, label })),
    ];
  }, [myFiles, hierarchy, publicSubjects, user]);

  // Calculate counts per subject
  const counts = useMemo(() => {
    const result: Record<string, number> = { all: myFiles.length };
    subjectTabs.forEach((tab) => {
      if (tab.id !== "all") {
        result[tab.id] = myFiles.filter((f: any) => f.subject === tab.id).length;
      }
    });
    return result;
  }, [myFiles, subjectTabs]);

  // Filter and sort visible files
  const visibleFiles = useMemo(() => {
    const filtered =
      subject === "all"
        ? myFiles
        : myFiles.filter((file: any) => file.subject === subject);

    return [...filtered].sort((a: any, b: any) => {
      let comparison = 0;
      if (sort === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sort === "subject") {
        comparison = subjectLabel(a.subject).localeCompare(subjectLabel(b.subject));
      } else if (sort === "size") {
        comparison = sizeInBytes(b.size) - sizeInBytes(a.size);
      } else {
        comparison = new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      }
      return sortDirection === "asc" ? -comparison : comparison;
    });
  }, [myFiles, subject, sort, sortDirection, publicSubjects]);

  const rootClass = isDark ? "app-shell dark" : "app-shell";

  const isReady = !userLoading && !hierarchyLoading && !subjectsLoading;

  return (
    <div className={rootClass} style={{ minHeight: "100vh" }}>
      {/* Standalone Top Bar - No standard navbar */}
      <header className="my-uploads-topbar">
        <div className="topbar-left">
          <button
            className="back-button"
            onClick={() => onNavigate("/")}
            title="Return to Spaces Dashboard"
          >
            <Icon name="arrowLeft" size={16} />
            <span>Back to Spaces</span>
          </button>
          <div className="topbar-divider" />
          <div className="topbar-title">
            <div className="brand-mark" style={{ width: 30, height: 30, borderRadius: 8 }}>
              <Icon name="folder" size={16} />
            </div>
            <strong>My Uploads Studio</strong>
          </div>
        </div>

        <div className="topbar-right">
          <button
            className="icon-button"
            onClick={toggleTheme}
            title="Toggle Light / Dark mode"
          >
            <Icon
              name={isDark ? "sun" : "moon"}
              size={18}
            />
          </button>

          <div className="user-badge">
            <Avatar name={user?.name} />
            <div className="user-badge-info">
              <strong>{user?.name || "Student"}</strong>
              <small>{user?.email || ""}</small>
            </div>
          </div>

          <button
            className="icon-button"
            onClick={onLogout}
            title="Log out"
            style={{ color: "#ef4444" }}
          >
            <Icon name="logout" size={18} />
          </button>
        </div>
      </header>

      {/* Main Standalone Container - No Sidebar */}
      <div className="my-uploads-container">
        {!isReady ? (
          <div className="dashboard-loading" style={{ minHeight: 380 }}>
            <div className="loading-mark">
              <Icon name="book" size={20} />
            </div>
            <strong>Loading your uploads workspace...</strong>
            <span>Connecting to Cloudflare R2...</span>
          </div>
        ) : (
          <>
            {/* Hero Section */}
            <div className="my-uploads-hero">
              <div>
                <h2>My Uploaded Files</h2>
                <p>
                  Manage, preview, and download all academic materials uploaded by you across your spaces.
                </p>
              </div>
              <button
                className="primary-button"
                onClick={() => setUploadOpen(true)}
                style={{ height: 42, padding: "0 20px" }}
              >
                <Icon name="upload" size={15} />
                <span>Upload New File</span>
              </button>
            </div>

            {/* Stats Cards Grid */}
            <div className="my-uploads-stats-grid">
              <div className="stat-card">
                <div className="stat-card-icon blue">
                  <Icon name="folder" size={20} />
                </div>
                <div>
                  <span className="stat-card-label">Total Files</span>
                  <strong className="stat-card-val">
                    {myFiles.length} {myFiles.length === 1 ? "File" : "Files"}
                  </strong>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-icon green">
                  <Icon name="download" size={20} />
                </div>
                <div>
                  <span className="stat-card-label">Storage in R2</span>
                  <strong className="stat-card-val">{totalStorage}</strong>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-icon purple">
                  <Icon name="book" size={20} />
                </div>
                <div>
                  <span className="stat-card-label">Subjects</span>
                  <strong className="stat-card-val">
                    {uniqueSubjectsCount} {uniqueSubjectsCount === 1 ? "Subject" : "Subjects"}
                  </strong>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card-icon amber">
                  <Icon name="clock" size={20} />
                </div>
                <div>
                  <span className="stat-card-label">Shared Spaces</span>
                  <strong className="stat-card-val">
                    {uniqueSpacesCount} {uniqueSpacesCount === 1 ? "Space" : "Spaces"}
                  </strong>
                </div>
              </div>
            </div>

            {/* Subject Filter Tabs */}
            <div className="subject-tabs" style={{ marginBottom: 20 }}>
              {subjectTabs.map((item: any) => (
                <button
                  key={item.id}
                  className={
                    subject === item.id ? "subject-tab active" : "subject-tab"
                  }
                  onClick={() => setSubject(item.id)}
                >
                  {item.label}
                  <span>{counts[item.id] ?? 0}</span>
                </button>
              ))}
            </div>

            {/* Toolbar */}
            <section className="toolbar my-uploads-toolbar">
              <label className="search-box">
                <Icon name="search" size={14} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search in your uploads..."
                />
                {query && (
                  <button onClick={() => setQuery("")}>
                    <Icon name="x" size={12} />
                  </button>
                )}
              </label>

              <div className="sort-wrap" ref={sortRef}>
                <button
                  className="control-button"
                  onClick={() => setSortOpen((val) => !val)}
                >
                  Sort:{" "}
                  <strong>
                    {sort === "date"
                      ? "Date"
                      : sort === "name"
                        ? "Name"
                        : sort === "size"
                          ? "Size"
                          : "Subject"}
                  </strong>
                  <Icon name="chevron" size={12} />
                </button>
                {sortOpen && (
                  <div className="sort-menu">
                    <div className="sort-menu-header">Sort by</div>
                    {[
                      ["date", "Date uploaded"],
                      ["name", "Name"],
                      ["size", "File size"],
                      ["subject", "Subject"],
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        className={sort === key ? "active" : ""}
                        onClick={() => {
                          setSort(key as any);
                          setSortOpen(false);
                        }}
                      >
                        <span>{label}</span>
                        {sort === key && <Icon name="check" size={12} />}
                      </button>
                    ))}
                    <div className="sort-menu-header">Order</div>
                    <button
                      onClick={() => {
                        setSortDirection("asc");
                        setSortOpen(false);
                      }}
                    >
                      <span>Ascending</span>
                      {sortDirection === "asc" && <Icon name="check" size={12} />}
                    </button>
                    <button
                      onClick={() => {
                        setSortDirection("desc");
                        setSortOpen(false);
                      }}
                    >
                      <span>Descending</span>
                      {sortDirection === "desc" && <Icon name="check" size={12} />}
                    </button>
                  </div>
                )}
              </div>

              <span className="file-count">
                {visibleFiles.length} {visibleFiles.length === 1 ? "file" : "files"}
              </span>

              <div className="view-toggle">
                <button
                  className={view === "grid" ? "active" : ""}
                  title="Grid view"
                  onClick={() => setView("grid")}
                >
                  <Icon name="grid" size={14} />
                </button>
                <button
                  className={view === "list" ? "active" : ""}
                  title="List view"
                  onClick={() => setView("list")}
                >
                  <Icon name="list" size={14} />
                </button>
              </div>
            </section>

            {/* File Display */}
            {filesLoading ? (
              <div className="dashboard-loading" style={{ minHeight: 280 }}>
                <strong>Searching your files...</strong>
              </div>
            ) : visibleFiles.length === 0 ? (
              <div className="empty-state" style={{ minHeight: 320 }}>
                <div className="empty-icon">
                  <Icon name="upload" size={24} />
                </div>
                <h3>No uploads found</h3>
                <p>
                  {query
                    ? "No files in your uploads match your search query."
                    : subject !== "all"
                      ? "You haven't uploaded any files under this subject yet."
                      : "You haven't uploaded any files yet. Upload your class notes, assignments, or slides to share with your division."}
                </p>
                <button
                  className="primary-button"
                  style={{ marginTop: 16 }}
                  onClick={() => setUploadOpen(true)}
                >
                  <Icon name="upload" size={14} /> Upload First File
                </button>
              </div>
            ) : view === "grid" ? (
              <div className="file-grid">
                {visibleFiles.map((file: any) => {
                  const [label, kind] = fileType(file.type, file.name);
                  return (
                    <article
                      key={file._id}
                      className="file-card"
                      onClick={() => setPreviewFile(file)}
                      style={{ cursor: "pointer" }}
                    >
                      <div className={`file-preview ${kind}`}>
                        <span>{label}</span>
                        <div className="file-hover-actions">
                          <button
                            title="Preview"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewFile(file);
                            }}
                          >
                            <Icon name="eye" size={16} />
                          </button>
                          <button
                            title="Download"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(api.getDownloadUrl(file._id), "_blank");
                            }}
                          >
                            <Icon name="download" size={16} />
                          </button>
                          <button
                            title="Delete File"
                            className="danger-action-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteFile(file);
                            }}
                          >
                            <Icon name="trash" size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="file-info">
                        <div className="file-title">
                          <strong title={file.name}>{file.name}</strong>
                        </div>
                        <p style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                          <span className={`subject-badge ${kind}`}>
                            {file.subjectShortName || subjectLabel(file.subject)}
                          </span>
                          <span className="space-pill">
                            {formatSpaceLabel(file.space)}
                          </span>
                        </p>
                        <p style={{ marginTop: 6, display: "flex", justifyContent: "space-between" }}>
                          <span>{formatDate(file.uploadedAt)}</span>
                          <span>{file.size}</span>
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="file-table">
                <div className="file-table-header" style={{ gridTemplateColumns: "2.5fr 1fr 1fr 1fr 1fr 90px" }}>
                  <span>File</span>
                  <span>Subject</span>
                  <span>Shared To</span>
                  <span>Date</span>
                  <span>Size</span>
                  <span style={{ textAlign: "right" }}>Actions</span>
                </div>
                {visibleFiles.map((file: any) => {
                  const [label, kind] = fileType(file.type, file.name);
                  return (
                    <div
                      key={file._id}
                      className="file-row"
                      onClick={() => setPreviewFile(file)}
                      style={{ cursor: "pointer", gridTemplateColumns: "2.5fr 1fr 1fr 1fr 1fr 90px" }}
                    >
                      <div className="row-file">
                        <span className={`row-type ${kind}`}>{label}</span>
                        <strong title={file.name}>{file.name}</strong>
                      </div>
                      <span className={`subject-badge ${kind}`} style={{ justifySelf: "start" }}>
                        {file.subjectShortName || subjectLabel(file.subject)}
                      </span>
                      <span>
                        <span className="space-pill">{formatSpaceLabel(file.space)}</span>
                      </span>
                      <span>{formatDate(file.uploadedAt)}</span>
                      <span>{file.size}</span>
                      <div className="row-actions">
                        <button
                          title="Preview"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewFile(file);
                          }}
                        >
                          <Icon name="eye" size={14} />
                        </button>
                        <button
                          title="Download"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(api.getDownloadUrl(file._id), "_blank");
                          }}
                        >
                          <Icon name="download" size={14} />
                        </button>
                        <button
                          title="Delete"
                          className="danger-action-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteFile(file);
                          }}
                        >
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {uploadOpen && (
        <UploadModal
          spaces={spaces}
          subject={subject}
          subjects={subjectTabs}
          onClose={() => setUploadOpen(false)}
        />
      )}

      {previewFile && (
        <PreviewModal
          file={previewFile}
          subjectLabel={subjectLabel}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {deleteFile && (
        <div className="modal-backdrop">
          <div className="dialog" style={{ maxWidth: 440 }}>
            <div className="dialog-header">
              <div>
                <h2 style={{ color: "#dc2626" }}>Delete File</h2>
                <p>This action cannot be undone</p>
              </div>
              <button
                onClick={() => setDeleteFile(null)}
                disabled={deleteMutation.isPending}
              >
                <Icon name="x" size={16} />
              </button>
            </div>
            <div className="delete-dialog-content">
              Are you sure you want to permanently delete{" "}
              <strong>{deleteFile.name}</strong>?
              <p>
                This file will be permanently removed from Cloudflare R2 and will no longer be visible to other students in {formatSpaceLabel(deleteFile.space)}.
              </p>
            </div>
            <div className="dialog-actions">
              <button
                className="secondary-button"
                onClick={() => setDeleteFile(null)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                className="danger-button"
                onClick={() => deleteMutation.mutate(deleteFile._id)}
                disabled={deleteMutation.isPending}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Icon name="trash" size={14} />
                {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
