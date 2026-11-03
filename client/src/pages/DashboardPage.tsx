import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Icon, Avatar } from "../components/Icons";
import { api, User } from "../services/api";
import { formatTimeAgo } from "../components/FileTable";

interface DashboardPageProps {
  user: User | null;
  onNavigate: (path: string) => void;
  onOpenCreateGroup: () => void;
  onOpenJoinGroup: () => void;
  onOpenUpload: () => void;
}

export function DashboardPage({
  user,
  onNavigate,
  onOpenCreateGroup,
  onOpenJoinGroup,
  onOpenUpload,
}: DashboardPageProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: api.getDashboard,
    refetchInterval: 15000,
  });

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <div className="dashboard-page-container">
      {/* Welcome Banner */}
      <div className="dashboard-hero">
        <div>
          <h2>Dashboard</h2>
          <p className="dashboard-greeting">Welcome back, {firstName}! 👋</p>
        </div>
        <div className="dashboard-hero-actions">
          <button className="btn-primary" onClick={onOpenUpload}>
            <Icon name="upload" size={15} />
            <span>Upload File</span>
          </button>
        </div>
      </div>

      {/* Top 3 Stat Cards */}
      <div className="dashboard-stats-grid">
        <div className="stat-card blue" onClick={() => onNavigate("/groups")}>
          <div className="stat-card-icon blue">
            <Icon name="folder" size={22} />
          </div>
          <div className="stat-card-text">
            <span className="stat-label">My Groups</span>
            <strong className="stat-value">
              {isLoading ? "..." : `${stats?.totalGroups || 0} ${stats?.totalGroups === 1 ? "group" : "groups"}`}
            </strong>
          </div>
        </div>

        <div className="stat-card green" onClick={() => onNavigate("/groups")}>
          <div className="stat-card-icon green">
            <Icon name="users" size={22} />
          </div>
          <div className="stat-card-text">
            <span className="stat-label">Group Members</span>
            <strong className="stat-value">
              {isLoading ? "..." : `${stats?.totalMembers || 0} ${stats?.totalMembers === 1 ? "member" : "members"}`}
            </strong>
          </div>
        </div>

        <div className="stat-card orange" onClick={() => onNavigate("/files")}>
          <div className="stat-card-icon orange">
            <Icon name="fileText" size={22} />
          </div>
          <div className="stat-card-text">
            <span className="stat-label">All Files</span>
            <strong className="stat-value">
              {isLoading ? "..." : `${stats?.totalFiles || 0} ${stats?.totalFiles === 1 ? "file" : "files"}`}
            </strong>
          </div>
        </div>
      </div>

      {/* 2-Column Section: Recent Activity & Quick Actions */}
      <div className="dashboard-content-grid">
        {/* Recent Activity */}
        <div className="dashboard-panel">
          <div className="panel-header">
            <h3>Recent Activity</h3>
            <button className="panel-link-btn" onClick={() => onNavigate("/files")}>
              View All
            </button>
          </div>

          <div className="activity-list">
            {isLoading ? (
              <div className="panel-loading">
                <div className="spinner" />
                <span>Loading activity...</span>
              </div>
            ) : !stats?.recentActivity || stats.recentActivity.length === 0 ? (
              <div className="activity-empty">
                <Icon name="activity" size={24} />
                <p>No recent activity yet. Create or join a group to start sharing!</p>
              </div>
            ) : (
              stats.recentActivity.map((act) => {
                const isUploader = act.action === "uploaded_file";
                const isJoin = act.action === "joined_group";
                const isCreate = act.action === "created_group";
                const isSelf = act.userId?._id === user?.id;

                return (
                  <div key={act._id} className="activity-item">
                    <div className={`activity-icon-badge ${isUploader ? "blue" : isJoin ? "green" : isCreate ? "orange" : "gray"}`}>
                      <Icon
                        name={isUploader ? "upload" : isJoin ? "users" : isCreate ? "folder" : "activity"}
                        size={16}
                      />
                    </div>
                    <div className="activity-body">
                      <div className="activity-text">
                        <strong>{isSelf ? "You" : act.userId?.name || "A member"}</strong>{" "}
                        {isUploader ? (
                          <>
                            uploaded{" "}
                            <span className="activity-highlight">
                              "{act.fileId?.originalName || "a file"}"
                            </span>{" "}
                            in{" "}
                            <strong className="activity-group-name">
                              {act.groupId?.name || "a group"}
                            </strong>
                          </>
                        ) : isJoin ? (
                          <>
                            joined the group{" "}
                            <strong className="activity-group-name">
                              {act.groupId?.name || "group"}
                            </strong>
                          </>
                        ) : isCreate ? (
                          <>
                            created the group{" "}
                            <strong className="activity-group-name">
                              {act.groupId?.name || "group"}
                            </strong>
                          </>
                        ) : (
                          <span>{act.details}</span>
                        )}
                      </div>
                      <span className="activity-time">{formatTimeAgo(act.createdAt)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="dashboard-panel quick-actions-panel">
          <div className="panel-header">
            <h3>Quick Actions</h3>
          </div>

          <div className="quick-actions-list">
            <div className="quick-action-card" onClick={onOpenCreateGroup}>
              <div className="quick-action-icon green">
                <Icon name="plus" size={20} />
              </div>
              <div className="quick-action-text">
                <strong>Create Group</strong>
                <p>Start a new group, auto-generate invite code, and share files</p>
              </div>
            </div>

            <div className="quick-action-card" onClick={onOpenJoinGroup}>
              <div className="quick-action-icon sky">
                <Icon name="users" size={20} />
              </div>
              <div className="quick-action-text">
                <strong>Join Group</strong>
                <p>Enter an 8-character invite code to join an existing group</p>
              </div>
            </div>

            <div className="quick-action-card" onClick={onOpenUpload}>
              <div className="quick-action-icon blue">
                <Icon name="upload" size={20} />
              </div>
              <div className="quick-action-text">
                <strong>Upload Materials</strong>
                <p>Upload lecture notes, assignments, or slides to any of your groups</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
