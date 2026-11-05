import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  Users,
  Folder,
  FileText,
  HardDrive,
  Activity,
  Search,
  RefreshCw,
  ArrowLeft,
  Trash2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Download,
  Eye,
  Copy,
  Check,
  TrendingUp,
  UserCheck,
  UserX,
  AlertTriangle,
  FileCode,
  Image,
  Layers,
  Clock,
  ChevronDown,
} from "lucide-react";

import {
  api,
  User,
  AdminMetrics,
  AdminUserItem,
  AdminGroupItem,
  AdminFileItem,
  AdminStorageTelemetry,
} from "../services/api";
import { PreviewModal, DeleteModal } from "../components/Modals";

interface AdminPageProps {
  user: User | null;
  onNavigate: (path: string) => void;
}

type TabType = "metrics" | "users" | "groups" | "files" | "storage";

export function AdminPage({ user, onNavigate }: AdminPageProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("metrics");

  // Search and filter states
  const [userSearch, setUserSearch] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState<"all" | "active" | "deactivated">("all");
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | "admin" | "user">("all");

  const [groupSearch, setGroupSearch] = useState("");

  const [fileSearch, setFileSearch] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState("all");
  const [fileSortOrder, setFileSortOrder] = useState<"newest" | "oldest" | "largest" | "smallest">("newest");

  // Interactive Action states
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<any>(null);

  // Modals for admin actions
  const [userToDelete, setUserToDelete] = useState<AdminUserItem | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<AdminGroupItem | null>(null);
  const [fileToDelete, setFileToDelete] = useState<AdminFileItem | null>(null);

  // 1. Fetch Metrics
  const {
    data: metrics,
    isLoading: isLoadingMetrics,
    refetch: refetchMetrics,
    isFetching: isFetchingMetrics,
  } = useQuery<AdminMetrics>({
    queryKey: ["admin-metrics"],
    queryFn: api.getAdminMetrics,
    refetchInterval: 60000, // Auto refresh every minute
  });

  // 2. Fetch Users
  const {
    data: users = [],
    isLoading: isLoadingUsers,
    refetch: refetchUsers,
  } = useQuery<AdminUserItem[]>({
    queryKey: ["admin-users", userSearch, userStatusFilter, userRoleFilter],
    queryFn: () =>
      api.getAdminUsers({
        search: userSearch,
        status: userStatusFilter,
        role: userRoleFilter,
      }),
  });

  // 3. Fetch Groups
  const {
    data: groups = [],
    isLoading: isLoadingGroups,
    refetch: refetchGroups,
  } = useQuery<AdminGroupItem[]>({
    queryKey: ["admin-groups", groupSearch],
    queryFn: () => api.getAdminGroups({ search: groupSearch }),
  });

  // 4. Fetch Files
  const {
    data: files = [],
    isLoading: isLoadingFiles,
    refetch: refetchFiles,
  } = useQuery<AdminFileItem[]>({
    queryKey: ["admin-files", fileSearch, fileTypeFilter, fileSortOrder],
    queryFn: () =>
      api.getAdminFiles({
        search: fileSearch,
        type: fileTypeFilter,
        sort: fileSortOrder,
      }),
  });

  // 5. Fetch Storage Telemetry
  const {
    data: storageData,
    isLoading: isLoadingStorage,
    refetch: refetchStorage,
  } = useQuery<AdminStorageTelemetry>({
    queryKey: ["admin-storage"],
    queryFn: api.getAdminStorage,
    enabled: activeTab === "storage" || activeTab === "metrics",
  });

  // Manual refresh all
  const handleRefreshAll = () => {
    refetchMetrics();
    refetchUsers();
    refetchGroups();
    refetchFiles();
    refetchStorage();
  };

  // User Actions
  const toggleUserStatusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      api.updateAdminUserStatus(userId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
    },
    onError: (err: any) => alert(err.message || "Failed to update user status"),
  });

  const toggleUserRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "user" | "admin" }) =>
      api.updateAdminUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
    },
    onError: (err: any) => alert(err.message || "Failed to update user role"),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => api.deleteAdminUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["admin-groups"] });
      queryClient.invalidateQueries({ queryKey: ["admin-files"] });
      setUserToDelete(null);
    },
    onError: (err: any) => alert(err.message || "Failed to delete user"),
  });

  // Group Actions
  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: string) => api.deleteAdminGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-groups"] });
      queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["admin-files"] });
      setGroupToDelete(null);
    },
    onError: (err: any) => alert(err.message || "Failed to delete group"),
  });

  // File Actions
  const deleteFileMutation = useMutation({
    mutationFn: (fileId: string) => api.deleteAdminFile(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-files"] });
      queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["admin-storage"] });
      setFileToDelete(null);
    },
    onError: (err: any) => alert(err.message || "Failed to delete file"),
  });

  const handleCopyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="admin-portal-root">
      {/* ==============================================================
          A. ADMIN CONSOLE TOP HEADER
          ============================================================== */}
      <header className="admin-console-header">
        <div className="admin-header-left">
          <button
            className="btn-admin-back"
            onClick={() => onNavigate("/app")}
            title="Return to FileShare Workspace"
          >
            <ArrowLeft size={16} />
            <span>Workspace</span>
          </button>

          <div className="admin-brand-block">
            <div className="admin-logo-badge">
              <Folder size={18} />
            </div>
            <div className="admin-title-box">
              <div className="admin-title-row">
                <h1>FileShare</h1>
                <span className="admin-pill-tag">ADMIN CONSOLE</span>
              </div>
              <span className="admin-subtext">System Administration & Analytics</span>
            </div>
          </div>
        </div>

        <div className="admin-header-right">
          <div className="system-health-pill">
            <span className="health-dot live" />
            <span>System Operational</span>
          </div>

          <button
            className={`btn-admin-refresh ${isFetchingMetrics ? "spinning" : ""}`}
            onClick={handleRefreshAll}
            title="Refresh System Data"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>

          <div className="admin-current-user">
            <div className="admin-avatar-box">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} />
              ) : (
                <span>{(user?.name || "A").charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="admin-user-details">
              <strong>{user?.name || "Admin"}</strong>
              <small>{user?.email}</small>
            </div>
          </div>
        </div>
      </header>

      {/* ==============================================================
          B. NAVIGATION TABS BAR
          ============================================================== */}
      <nav className="admin-nav-tabs">
        <button
          className={`admin-tab-btn ${activeTab === "metrics" ? "active" : ""}`}
          onClick={() => setActiveTab("metrics")}
        >
          <TrendingUp size={15} />
          <span>Metrics & Overview</span>
        </button>

        <button
          className={`admin-tab-btn ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          <Users size={15} />
          <span>Users</span>
          {metrics && <span className="tab-count-badge">{metrics.overview.totalUsers}</span>}
        </button>

        <button
          className={`admin-tab-btn ${activeTab === "groups" ? "active" : ""}`}
          onClick={() => setActiveTab("groups")}
        >
          <Folder size={15} />
          <span>Groups</span>
          {metrics && <span className="tab-count-badge">{metrics.overview.totalGroups}</span>}
        </button>

        <button
          className={`admin-tab-btn ${activeTab === "files" ? "active" : ""}`}
          onClick={() => setActiveTab("files")}
        >
          <FileText size={15} />
          <span>Files</span>
          {metrics && <span className="tab-count-badge">{metrics.overview.totalFiles}</span>}
        </button>

        <button
          className={`admin-tab-btn ${activeTab === "storage" ? "active" : ""}`}
          onClick={() => setActiveTab("storage")}
        >
          <HardDrive size={15} />
          <span>Storage & Telemetry</span>
          {metrics && (
            <span className="tab-count-badge orange">{metrics.overview.formattedTotalStorage}</span>
          )}
        </button>
      </nav>

      {/* ==============================================================
          C. MAIN CONTENT AREA
          ============================================================== */}
      <main className="admin-main-container">
        {/* ==============================================================
            TAB 1: METRICS & OVERVIEW
            ============================================================== */}
        {activeTab === "metrics" && (
          <div className="admin-tab-content">
            {isLoadingMetrics ? (
              <div className="admin-loading-card">
                <div className="spinner" />
                <span>Loading system metrics...</span>
              </div>
            ) : metrics ? (
              <>
                {/* 1. KEY KPI CARDS */}
                <div className="admin-kpi-grid">
                  {/* KPI 1: DAU */}
                  <div className="admin-metric-card highlighted">
                    <div className="metric-header">
                      <span className="metric-title">DAILY ACTIVE USERS (DAU)</span>
                      <div className="metric-icon-box orange">
                        <Activity size={18} />
                      </div>
                    </div>
                    <div className="metric-primary-value">{metrics.engagement.dau}</div>
                    <div className="metric-footer-note">
                      <span>{metrics.engagement.wau} Weekly</span>
                      <span className="bullet">·</span>
                      <span>{metrics.engagement.mau} Monthly</span>
                      <span className="bullet">·</span>
                      <strong className="text-orange">{metrics.engagement.engagementRatio}% Stickiness</strong>
                    </div>
                  </div>

                  {/* KPI 2: Total Users */}
                  <div className="admin-metric-card">
                    <div className="metric-header">
                      <span className="metric-title">TOTAL REGISTERED USERS</span>
                      <div className="metric-icon-box">
                        <Users size={18} />
                      </div>
                    </div>
                    <div className="metric-primary-value">{metrics.overview.totalUsers}</div>
                    <div className="metric-footer-note">
                      <span className="text-success">{metrics.overview.activeUsersCount} Active</span>
                      <span className="bullet">·</span>
                      <span className="text-muted">{metrics.overview.deactivatedUsersCount} Deactivated</span>
                      <span className="bullet">·</span>
                      <span>{metrics.overview.adminUsersCount} Admins</span>
                    </div>
                  </div>

                  {/* KPI 3: Total Storage */}
                  <div className="admin-metric-card">
                    <div className="metric-header">
                      <span className="metric-title">TOTAL CLOUD STORAGE USED</span>
                      <div className="metric-icon-box">
                        <HardDrive size={18} />
                      </div>
                    </div>
                    <div className="metric-primary-value">{metrics.overview.formattedTotalStorage}</div>
                    <div className="metric-footer-note">
                      <span>Across {metrics.overview.totalFiles} files</span>
                      <span className="bullet">·</span>
                      <span>Avg {metrics.overview.formattedAvgFileSize}/file</span>
                    </div>
                  </div>

                  {/* KPI 4: Total Groups */}
                  <div className="admin-metric-card">
                    <div className="metric-header">
                      <span className="metric-title">TOTAL ACTIVE GROUPS</span>
                      <div className="metric-icon-box">
                        <Folder size={18} />
                      </div>
                    </div>
                    <div className="metric-primary-value">{metrics.overview.totalGroups}</div>
                    <div className="metric-footer-note">
                      <span>Collaboration spaces created across campus</span>
                    </div>
                  </div>
                </div>

                {/* 2. STORAGE DISTRIBUTION & ACTIVITY TREND SECTION */}
                <div className="admin-dashboard-two-col">
                  {/* Storage Breakdown */}
                  <div className="admin-card-section">
                    <div className="section-header">
                      <h3>Storage Utilization by Category</h3>
                      <button
                        className="btn-section-action"
                        onClick={() => setActiveTab("storage")}
                      >
                        Deep Dive <ExternalLink size={12} />
                      </button>
                    </div>

                    {/* Proportional Multi-Segment Bar */}
                    <div className="storage-multi-bar">
                      {metrics.storageBreakdown.map((item, idx) => (
                        <div
                          key={item.category}
                          className={`storage-bar-seg seg-${idx % 6}`}
                          style={{ width: `${Math.max(item.percentage, 2)}%` }}
                          title={`${item.category}: ${item.formattedSize} (${item.percentage}%)`}
                        />
                      ))}
                    </div>

                    <div className="storage-category-list">
                      {metrics.storageBreakdown.map((item, idx) => (
                        <div key={item.category} className="storage-category-row">
                          <div className="cat-name-box">
                            <span className={`cat-dot seg-${idx % 6}`} />
                            <strong>{item.category}</strong>
                            <small className="cat-file-count">({item.count} files)</small>
                          </div>
                          <div className="cat-size-box">
                            <span>{item.formattedSize}</span>
                            <span className="cat-percent">{item.percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 7-Day Upload & Engagement Trend */}
                  <div className="admin-card-section">
                    <div className="section-header">
                      <h3>7-Day Upload & Activity Trend</h3>
                      <span className="badge-subtle">Past 7 Days</span>
                    </div>

                    <div className="trend-timeline-container">
                      {metrics.activityTrend.map((day) => (
                        <div key={day.date} className="trend-day-row">
                          <div className="trend-day-label">{day.date}</div>
                          <div className="trend-bar-track">
                            <div
                              className="trend-bar-fill"
                              style={{
                                width: `${Math.min(
                                  Math.max((day.uploadsCount / 10) * 100, 4),
                                  100
                                )}%`,
                              }}
                            />
                          </div>
                          <div className="trend-day-metrics">
                            <strong>{day.uploadsCount} uploads</strong>
                            <small>{day.formattedUploadBytes}</small>
                            <span className="trend-users-pill">
                              {day.activeUsers} users
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. RECENT SYSTEM AUDIT FEED */}
                <div className="admin-card-section audit-section">
                  <div className="section-header">
                    <h3>Recent Platform Activities (Audit Feed)</h3>
                    <span className="badge-subtle">Live Event Stream</span>
                  </div>

                  <div className="admin-audit-feed">
                    {metrics.recentActivities.length === 0 ? (
                      <div className="admin-empty-text">No recent platform activity logged.</div>
                    ) : (
                      metrics.recentActivities.map((act) => (
                        <div key={act._id} className="audit-feed-item">
                          <div className="audit-icon-wrap">
                            <Clock size={14} />
                          </div>
                          <div className="audit-content">
                            <div className="audit-header-line">
                              <strong>{act.userId?.name || "System"}</strong>
                              <span className="audit-email">({act.userId?.email || "internal"})</span>
                              <span className="audit-action-tag">{act.action.replace("_", " ")}</span>
                              {act.groupId?.name && (
                                <span className="audit-group-tag">in {act.groupId.name}</span>
                              )}
                            </div>
                            <p className="audit-details">{act.details}</p>
                          </div>
                          <div className="audit-timestamp">
                            {new Date(act.createdAt).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* ==============================================================
            TAB 2: USERS DIRECTORY
            ============================================================== */}
        {activeTab === "users" && (
          <div className="admin-tab-content">
            {/* Filter Toolbar */}
            <div className="admin-filter-toolbar">
              <div className="admin-search-box">
                <Search size={15} />
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>

              <div className="admin-filter-group">
                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value as any)}
                  aria-label="Filter user status"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Only</option>
                  <option value="deactivated">Deactivated Only</option>
                </select>

                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value as any)}
                  aria-label="Filter user role"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Administrators</option>
                  <option value="user">Standard Users</option>
                </select>
              </div>

              <div className="admin-count-indicator">
                Showing <strong>{users.length}</strong> users
              </div>
            </div>

            {/* Users Table */}
            <div className="admin-table-container">
              {isLoadingUsers ? (
                <div className="admin-loading-card">
                  <div className="spinner" />
                  <span>Loading users directory...</span>
                </div>
              ) : users.length === 0 ? (
                <div className="admin-empty-card">
                  <UserX size={32} />
                  <h3>No matching users found</h3>
                  <p>Try modifying your search criteria or status filter.</p>
                </div>
              ) : (
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Groups</th>
                      <th>Uploads</th>
                      <th>Storage</th>
                      <th>Last Seen</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const isCurrentUser = String(u._id) === String(user?._id || user?.id);
                      return (
                        <tr key={u._id}>
                          <td>
                            <div className="table-user-cell">
                              <div className="table-avatar">
                                {u.avatar ? (
                                  <img src={u.avatar} alt={u.name} />
                                ) : (
                                  <span>{u.name.charAt(0).toUpperCase()}</span>
                                )}
                              </div>
                              <div className="table-user-names">
                                <strong>{u.name}</strong>
                                {isCurrentUser && <span className="you-pill">You</span>}
                              </div>
                            </div>
                          </td>
                          <td className="text-muted">{u.email}</td>
                          <td>
                            <span className={`role-badge ${u.role === "admin" ? "admin" : "user"}`}>
                              {u.role === "admin" ? "Admin" : "Student / User"}
                            </span>
                          </td>
                          <td>
                            <span className={`status-pill ${u.isActive ? "active" : "deactivated"}`}>
                              <span className="dot" />
                              {u.isActive ? "Active" : "Deactivated"}
                            </span>
                          </td>
                          <td>{u.groupsCount}</td>
                          <td>{u.filesCount}</td>
                          <td>{u.formattedStorage}</td>
                          <td className="text-muted">
                            {u.lastLogin
                              ? new Date(u.lastLogin).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                })
                              : "Never"}
                          </td>
                          <td className="text-right">
                            <div className="table-actions-cell">
                              {/* Toggle Status */}
                              {!isCurrentUser && (
                                <button
                                  className={`btn-table-icon ${u.isActive ? "danger-hover" : "success-hover"}`}
                                  onClick={() =>
                                    toggleUserStatusMutation.mutate({
                                      userId: u._id,
                                      isActive: !u.isActive,
                                    })
                                  }
                                  title={u.isActive ? "Deactivate Account" : "Activate Account"}
                                >
                                  {u.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                                </button>
                              )}

                              {/* Toggle Role */}
                              {!isCurrentUser && (
                                <button
                                  className="btn-table-icon"
                                  onClick={() =>
                                    toggleUserRoleMutation.mutate({
                                      userId: u._id,
                                      role: u.role === "admin" ? "user" : "admin",
                                    })
                                  }
                                  title={
                                    u.role === "admin"
                                      ? "Demote to standard user"
                                      : "Promote to system administrator"
                                  }
                                >
                                  <Shield size={14} />
                                </button>
                              )}

                              {/* Delete User */}
                              {!isCurrentUser && (
                                <button
                                  className="btn-table-icon danger"
                                  onClick={() => setUserToDelete(u)}
                                  title="Delete user permanently"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ==============================================================
            TAB 3: GROUPS DIRECTORY
            ============================================================== */}
        {activeTab === "groups" && (
          <div className="admin-tab-content">
            {/* Filter Toolbar */}
            <div className="admin-filter-toolbar">
              <div className="admin-search-box">
                <Search size={15} />
                <input
                  type="text"
                  placeholder="Search groups by name or invite code..."
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                />
              </div>

              <div className="admin-count-indicator">
                Showing <strong>{groups.length}</strong> groups
              </div>
            </div>

            {/* Groups Table */}
            <div className="admin-table-container">
              {isLoadingGroups ? (
                <div className="admin-loading-card">
                  <div className="spinner" />
                  <span>Loading groups directory...</span>
                </div>
              ) : groups.length === 0 ? (
                <div className="admin-empty-card">
                  <Folder size={32} />
                  <h3>No groups found</h3>
                  <p>No workspace groups match your search criteria.</p>
                </div>
              ) : (
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>Group Name</th>
                      <th>Invite Code</th>
                      <th>Owner / Creator</th>
                      <th>Members</th>
                      <th>Files</th>
                      <th>Storage</th>
                      <th>Created Date</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((g) => (
                      <tr key={g._id}>
                        <td>
                          <div className="table-group-cell">
                            <div className="group-avatar-square">
                              <Folder size={16} />
                            </div>
                            <div className="group-name-col">
                              <strong>{g.name}</strong>
                              {g.description && <small>{g.description}</small>}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div
                            className="invite-code-pill"
                            onClick={() => handleCopyInviteCode(g.inviteCode)}
                            title="Click to copy invite code"
                          >
                            <span>{g.inviteCode}</span>
                            {copiedCode === g.inviteCode ? (
                              <Check size={12} className="text-success" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="owner-cell">
                            <span>{g.createdBy?.name || "System"}</span>
                            <small className="text-muted">{g.createdBy?.email}</small>
                          </div>
                        </td>
                        <td>{g.memberCount} members</td>
                        <td>{g.fileCount} files</td>
                        <td>{g.formattedStorage}</td>
                        <td className="text-muted">
                          {new Date(g.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="text-right">
                          <button
                            className="btn-table-icon danger"
                            onClick={() => setGroupToDelete(g)}
                            title="Delete group permanently"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ==============================================================
            TAB 4: FILES DIRECTORY
            ============================================================== */}
        {activeTab === "files" && (
          <div className="admin-tab-content">
            {/* Filter Toolbar */}
            <div className="admin-filter-toolbar">
              <div className="admin-search-box">
                <Search size={15} />
                <input
                  type="text"
                  placeholder="Search files by name..."
                  value={fileSearch}
                  onChange={(e) => setFileSearch(e.target.value)}
                />
              </div>

              <div className="admin-filter-group">
                <select
                  value={fileTypeFilter}
                  onChange={(e) => setFileTypeFilter(e.target.value)}
                  aria-label="Filter by file type"
                >
                  <option value="all">All File Types</option>
                  <option value="pdf">PDF Documents</option>
                  <option value="image">Images</option>
                  <option value="doc">Word / Documents</option>
                  <option value="ppt">Presentations</option>
                  <option value="xls">Spreadsheets</option>
                  <option value="code">Source Code</option>
                  <option value="zip">Archives (ZIP)</option>
                </select>

                <select
                  value={fileSortOrder}
                  onChange={(e) => setFileSortOrder(e.target.value as any)}
                  aria-label="Sort files"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="largest">Largest First</option>
                  <option value="smallest">Smallest First</option>
                </select>
              </div>

              <div className="admin-count-indicator">
                Showing <strong>{files.length}</strong> files
              </div>
            </div>

            {/* Files Table */}
            <div className="admin-table-container">
              {isLoadingFiles ? (
                <div className="admin-loading-card">
                  <div className="spinner" />
                  <span>Loading files directory...</span>
                </div>
              ) : files.length === 0 ? (
                <div className="admin-empty-card">
                  <FileText size={32} />
                  <h3>No files found</h3>
                  <p>No uploaded files match your search criteria.</p>
                </div>
              ) : (
                <table className="admin-data-table">
                  <thead>
                    <tr>
                      <th>File Name</th>
                      <th>Category</th>
                      <th>Size</th>
                      <th>Uploaded By</th>
                      <th>Group</th>
                      <th>Uploaded Date</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((f) => (
                      <tr key={f._id}>
                        <td>
                          <div className="table-file-cell" onClick={() => setPreviewFile(f)}>
                            <div className="file-cat-pill">{f.category}</div>
                            <strong className="file-name" title={f.originalName}>
                              {f.originalName}
                            </strong>
                          </div>
                        </td>
                        <td className="text-muted">{f.mimeType || f.category}</td>
                        <td>{f.formattedSize}</td>
                        <td>
                          <div className="uploader-cell">
                            <span>{f.uploadedBy?.name || "Unknown"}</span>
                            <small className="text-muted">{f.uploadedBy?.email}</small>
                          </div>
                        </td>
                        <td>
                          <span className="file-group-tag">{f.group?.name || "General"}</span>
                        </td>
                        <td className="text-muted">
                          {new Date(f.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="text-right">
                          <div className="table-actions-cell">
                            <button
                              className="btn-table-icon"
                              onClick={() => setPreviewFile(f)}
                              title="Preview File"
                            >
                              <Eye size={14} />
                            </button>
                            <a
                              href={api.getDownloadUrl(f._id)}
                              download={f.originalName}
                              className="btn-table-icon"
                              title="Download File"
                            >
                              <Download size={14} />
                            </a>
                            <button
                              className="btn-table-icon danger"
                              onClick={() => setFileToDelete(f)}
                              title="Delete file permanently (Moderation)"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ==============================================================
            TAB 5: STORAGE & TELEMETRY
            ============================================================== */}
        {activeTab === "storage" && (
          <div className="admin-tab-content">
            {isLoadingStorage ? (
              <div className="admin-loading-card">
                <div className="spinner" />
                <span>Loading storage telemetry...</span>
              </div>
            ) : storageData ? (
              <>
                {/* Summary Cards */}
                <div className="admin-kpi-grid">
                  <div className="admin-metric-card highlighted">
                    <div className="metric-header">
                      <span className="metric-title">TOTAL CLOUD STORAGE</span>
                      <div className="metric-icon-box orange">
                        <HardDrive size={18} />
                      </div>
                    </div>
                    <div className="metric-primary-value">{storageData.formattedTotalStorage}</div>
                    <div className="metric-footer-note">
                      <span>Across {storageData.totalFiles} files in system</span>
                    </div>
                  </div>

                  <div className="admin-metric-card">
                    <div className="metric-header">
                      <span className="metric-title">ACTIVE FILE CATEGORIES</span>
                      <div className="metric-icon-box">
                        <Layers size={18} />
                      </div>
                    </div>
                    <div className="metric-primary-value">{storageData.categoryBreakdown.length}</div>
                    <div className="metric-footer-note">
                      <span>Document, Presentation, Media, Archives, Code</span>
                    </div>
                  </div>

                  <div className="admin-metric-card">
                    <div className="metric-header">
                      <span className="metric-title">TOP STORAGE GROUP</span>
                      <div className="metric-icon-box">
                        <Folder size={18} />
                      </div>
                    </div>
                    <div className="metric-primary-value">
                      {storageData.topGroups[0]?.name || "None"}
                    </div>
                    <div className="metric-footer-note">
                      <span>{storageData.topGroups[0]?.formattedSize || "0 B"} used</span>
                    </div>
                  </div>

                  <div className="admin-metric-card">
                    <div className="metric-header">
                      <span className="metric-title">TOP UPLOADER</span>
                      <div className="metric-icon-box">
                        <Users size={18} />
                      </div>
                    </div>
                    <div className="metric-primary-value">
                      {storageData.topUsers[0]?.name || "None"}
                    </div>
                    <div className="metric-footer-note">
                      <span>{storageData.topUsers[0]?.formattedSize || "0 B"} uploaded</span>
                    </div>
                  </div>
                </div>

                {/* Storage Breakdown Details Table */}
                <div className="admin-card-section">
                  <div className="section-header">
                    <h3>Storage Breakdown by File Format</h3>
                    <span className="badge-subtle">Byte Aggregation</span>
                  </div>

                  <div className="admin-table-container">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th>Total Files</th>
                          <th>Storage Used</th>
                          <th>Percentage Share</th>
                          <th style={{ width: "35%" }}>Distribution</th>
                        </tr>
                      </thead>
                      <tbody>
                        {storageData.categoryBreakdown.map((cat, idx) => (
                          <tr key={cat.category}>
                            <td>
                              <div className="cat-name-box">
                                <span className={`cat-dot seg-${idx % 6}`} />
                                <strong>{cat.category}</strong>
                              </div>
                            </td>
                            <td>{cat.count} files</td>
                            <td>{cat.formattedSize}</td>
                            <td>
                              <strong>{cat.percentage}%</strong>
                            </td>
                            <td>
                              <div className="telemetry-bar-wrap">
                                <div
                                  className={`telemetry-bar-fill seg-${idx % 6}`}
                                  style={{ width: `${Math.max(cat.percentage, 1)}%` }}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top Groups & Users Two-Col Grid */}
                <div className="admin-dashboard-two-col">
                  {/* Top Groups by Storage */}
                  <div className="admin-card-section">
                    <div className="section-header">
                      <h3>Top Groups by Storage Usage</h3>
                    </div>

                    <div className="admin-rank-list">
                      {storageData.topGroups.length === 0 ? (
                        <div className="admin-empty-text">No groups with uploads yet.</div>
                      ) : (
                        storageData.topGroups.map((g, idx) => (
                          <div key={g.id} className="admin-rank-item">
                            <span className="rank-number">{idx + 1}</span>
                            <div className="rank-info">
                              <strong>{g.name}</strong>
                              <small>Code: {g.inviteCode} · {g.fileCount} files</small>
                            </div>
                            <div className="rank-stats">
                              <span>{g.formattedSize}</span>
                              <small>{g.percentage}%</small>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Top Users by Storage */}
                  <div className="admin-card-section">
                    <div className="section-header">
                      <h3>Top Users by Storage Usage</h3>
                    </div>

                    <div className="admin-rank-list">
                      {storageData.topUsers.length === 0 ? (
                        <div className="admin-empty-text">No user uploads recorded.</div>
                      ) : (
                        storageData.topUsers.map((u, idx) => (
                          <div key={u.id} className="admin-rank-item">
                            <span className="rank-number">{idx + 1}</span>
                            <div className="rank-info">
                              <strong>{u.name}</strong>
                              <small>{u.email} · {u.fileCount} files</small>
                            </div>
                            <div className="rank-stats">
                              <span>{u.formattedSize}</span>
                              <small>{u.percentage}%</small>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Largest Files Table */}
                <div className="admin-card-section">
                  <div className="section-header">
                    <h3>Top 5 Largest Files in Cloud Storage</h3>
                  </div>

                  <div className="admin-table-container">
                    <table className="admin-data-table">
                      <thead>
                        <tr>
                          <th>File Name</th>
                          <th>Category</th>
                          <th>Size</th>
                          <th>Group</th>
                          <th>Uploader</th>
                          <th>Uploaded Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {storageData.largestFiles.map((file) => (
                          <tr key={file.id}>
                            <td>
                              <strong className="file-name">{file.name}</strong>
                            </td>
                            <td>
                              <span className="file-cat-pill">{file.category}</span>
                            </td>
                            <td>
                              <strong className="text-orange">{file.formattedSize}</strong>
                            </td>
                            <td>{file.groupName}</td>
                            <td>{file.uploaderName}</td>
                            <td className="text-muted">
                              {new Date(file.createdAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}
      </main>

      {/* ==============================================================
          D. MODALS FOR ADMIN CONFIRMATIONS
          ============================================================== */}
      {/* 1. Delete User Modal */}
      <DeleteModal
        isOpen={Boolean(userToDelete)}
        title="Permanently Delete User"
        message={`Are you sure you want to permanently delete user "${userToDelete?.name}" (${userToDelete?.email})? All files uploaded by this user, their group memberships, and groups they own will be permanently erased.`}
        confirmLabel="Delete User"
        onConfirm={() => userToDelete && deleteUserMutation.mutate(userToDelete._id)}
        onClose={() => setUserToDelete(null)}
        loading={deleteUserMutation.isPending}
      />

      {/* 2. Delete Group Modal */}
      <DeleteModal
        isOpen={Boolean(groupToDelete)}
        title="Permanently Delete Group"
        message={`Are you sure you want to delete group "${groupToDelete?.name}"? All shared files, memberships, and records in this group will be permanently deleted.`}
        confirmLabel="Delete Group"
        onConfirm={() => groupToDelete && deleteGroupMutation.mutate(groupToDelete._id)}
        onClose={() => setGroupToDelete(null)}
        loading={deleteGroupMutation.isPending}
      />

      {/* 3. Delete File Modal */}
      <DeleteModal
        isOpen={Boolean(fileToDelete)}
        title="Permanently Delete File (Moderation)"
        message={`Are you sure you want to permanently delete "${fileToDelete?.originalName}" from cloud storage? This file will become inaccessible to all group members.`}
        confirmLabel="Delete File"
        onConfirm={() => fileToDelete && deleteFileMutation.mutate(fileToDelete._id)}
        onClose={() => setFileToDelete(null)}
        loading={deleteFileMutation.isPending}
      />

      {/* 4. Preview Modal */}
      <PreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
}
