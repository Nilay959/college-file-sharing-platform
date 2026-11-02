import React, { useState, useEffect } from "react";
import { Icon, Avatar } from "./Icons";
import { Group, FileItem, GroupMemberItem, ActivityItem, User, api } from "../services/api";
import { getGroupVisual } from "./LeftSidebar";
import { getFileCategoryInfo, formatCardTime } from "./GroupWorkspace";

interface GroupInfoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group | null;
  files: FileItem[];
  currentUser: User | null;
  onSelectMemberFilter?: (member: { id: string; name: string }) => void;
  onDeleteGroupClick: () => void;
  onGroupUpdated: () => void;
  onPreviewFile: (file: FileItem) => void;
}

export function GroupInfoDrawer({
  isOpen,
  onClose,
  group,
  files,
  currentUser,
  onSelectMemberFilter,
  onDeleteGroupClick,
  onGroupUpdated,
  onPreviewFile,
}: GroupInfoDrawerProps) {
  const [activeSubView, setActiveSubView] = useState<"overview" | "media" | "members" | "activity" | "settings">("overview");
  const [members, setMembers] = useState<GroupMemberItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Group Settings state
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");

  const groupId = group?.id || group?._id;
  const isAdmin = group?.role === "admin";

  // Reset to overview when group changes or drawer opens
  useEffect(() => {
    if (group) {
      setEditName(group.name || "");
      setEditDesc(group.description || "");
    }
    setActiveSubView("overview");
  }, [groupId, isOpen]);

  // Fetch members when group or members view opens
  useEffect(() => {
    if (!groupId || !isOpen) return;

    let isMounted = true;
    setLoadingMembers(true);
    api.getGroupMembers(groupId)
      .then((data) => {
        if (isMounted) setMembers(data);
      })
      .catch((err) => {
        console.error("Failed to load group members:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingMembers(false);
      });

    return () => {
      isMounted = false;
    };
  }, [groupId, isOpen]);

  // Fetch activities when activity view is opened
  useEffect(() => {
    if (!groupId || !isOpen || activeSubView !== "activity") return;

    let isMounted = true;
    setLoadingActivity(true);
    api.getGroupActivity(groupId)
      .then((data) => {
        if (isMounted) setActivities(data);
      })
      .catch((err) => {
        console.error("Failed to load activities:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingActivity(false);
      });

    return () => {
      isMounted = false;
    };
  }, [groupId, isOpen, activeSubView]);

  if (!group || !isOpen) return null;

  const { icon, bg, color } = getGroupVisual(group.name);

  // Copy code handler
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(group.inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // fallback
    }
  };

  // Share link handler
  const handleShareLink = async () => {
    const inviteLink = `${window.location.origin}?invite=${group.inviteCode}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Join ${group.name} on FileShare`,
          text: `Join our group "${group.name}" using permanent code ${group.inviteCode}`,
          url: inviteLink,
        });
      } else {
        await navigator.clipboard.writeText(inviteLink);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Save Settings handler
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !groupId) return;
    setIsSavingSettings(true);
    setSettingsMessage("");
    try {
      await api.updateGroup(groupId, {
        name: editName.trim(),
        description: editDesc.trim(),
      });
      setSettingsMessage("Group details updated successfully!");
      onGroupUpdated();
      setTimeout(() => setSettingsMessage(""), 3000);
    } catch (err: any) {
      setSettingsMessage(err.message || "Failed to update group");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Remove member handler
  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!groupId) return;
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this group?`)) return;
    try {
      await api.removeGroupMember(groupId, userId);
      setMembers((prev) => prev.filter((m) => m.userId !== userId && m._id !== userId));
      onGroupUpdated();
    } catch (err: any) {
      alert(err.message || "Failed to remove member");
    }
  };

  // Count files per member in this group
  const memberFileCounts = files.reduce((acc, f) => {
    const uploaderId = f.uploadedBy?._id;
    if (uploaderId) {
      acc[uploaderId] = (acc[uploaderId] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  return (
    <aside className="fileshare-group-info-drawer">
      {/* Drawer Top Bar */}
      <div className="drawer-top-header">
        {activeSubView !== "overview" ? (
          <button
            className="drawer-back-btn"
            onClick={() => setActiveSubView("overview")}
            aria-label="Back to overview"
          >
            <Icon name="arrowLeft" size={18} />
          </button>
        ) : null}

        <h3 className="drawer-title">
          {activeSubView === "overview" && "Group Info"}
          {activeSubView === "media" && "Media, Links & Files"}
          {activeSubView === "members" && `Members (${members.length})`}
          {activeSubView === "activity" && "Group Activity"}
          {activeSubView === "settings" && "Group Settings"}
        </h3>

        <button className="drawer-close-btn" onClick={onClose} aria-label="Close group info">
          <Icon name="x" size={18} />
        </button>
      </div>

      {/* Drawer Content Body */}
      <div className="drawer-scroll-body">
        {/* ==============================================================
            1. MAIN OVERVIEW
            ============================================================== */}
        {activeSubView === "overview" && (
          <div className="drawer-overview-container">
            {/* A. Group Profile */}
            <div className="group-profile-card">
              <div
                className="group-large-avatar"
                style={{ backgroundColor: bg, color: color }}
              >
                <Icon name={icon} size={36} />
              </div>

              <h2 className="group-profile-name" title={group.name}>
                {group.name}
              </h2>

              <span className="group-profile-stats">
                {group.memberCount || members.length || 1} members · {files.length} files
              </span>

              {/* Group Description */}
              {group.description ? (
                <div className="group-description-box">
                  <Icon name="fileText" size={16} className="desc-icon" />
                  <p>{group.description}</p>
                </div>
              ) : null}
            </div>

            {/* B. Permanent Invitation Code */}
            <div className="group-invite-section">
              <div className="invite-section-header">
                <Icon name="link" size={15} />
                <span>Invitation Code (Permanent)</span>
              </div>

              <div className="invite-code-pill-box" onClick={handleCopyCode} title="Click to copy code">
                <span className="invite-code-text">{group.inviteCode}</span>
                <button className="invite-code-inline-copy">
                  <Icon name={copiedCode ? "check" : "copy"} size={16} />
                </button>
              </div>

              <div className="invite-actions-row">
                <button
                  type="button"
                  className={`btn-drawer-invite ${copiedCode ? "success" : ""}`}
                  onClick={handleCopyCode}
                >
                  <Icon name={copiedCode ? "check" : "copy"} size={15} />
                  <span>{copiedCode ? "Copied!" : "Copy Code"}</span>
                </button>

                <button
                  type="button"
                  className="btn-drawer-invite primary"
                  onClick={handleShareLink}
                >
                  <Icon name={copiedLink ? "check" : "share"} size={15} />
                  <span>{copiedLink ? "Link Copied!" : "Share Link"}</span>
                </button>
              </div>
            </div>

            {/* C. Group Navigation Sections */}
            <div className="drawer-nav-sections">
              <button
                className="drawer-nav-row"
                onClick={() => setActiveSubView("media")}
              >
                <div className="nav-row-left">
                  <div className="nav-row-icon-box">
                    <Icon name="folder" size={17} />
                  </div>
                  <span>Media, Links and Files</span>
                </div>
                <div className="nav-row-right">
                  <span className="nav-count-badge">{files.length}</span>
                  <Icon name="chevronRight" size={16} />
                </div>
              </button>

              <button
                className="drawer-nav-row"
                onClick={() => setActiveSubView("members")}
              >
                <div className="nav-row-left">
                  <div className="nav-row-icon-box">
                    <Icon name="users" size={17} />
                  </div>
                  <span>Members</span>
                </div>
                <div className="nav-row-right">
                  <span className="nav-count-badge">{members.length || group.memberCount || 1}</span>
                  <Icon name="chevronRight" size={16} />
                </div>
              </button>

              <button
                className="drawer-nav-row"
                onClick={() => setActiveSubView("activity")}
              >
                <div className="nav-row-left">
                  <div className="nav-row-icon-box">
                    <Icon name="code" size={17} />
                  </div>
                  <span>Group Activity</span>
                </div>
                <div className="nav-row-right">
                  <Icon name="chevronRight" size={16} />
                </div>
              </button>

              <button
                className="drawer-nav-row"
                onClick={() => setActiveSubView("settings")}
              >
                <div className="nav-row-left">
                  <div className="nav-row-icon-box">
                    <Icon name="settings" size={17} />
                  </div>
                  <span>Group Settings</span>
                </div>
                <div className="nav-row-right">
                  <Icon name="chevronRight" size={16} />
                </div>
              </button>
            </div>

            {/* Danger Zone: Bottom of Group Settings / Overview (Admin Only) */}
            {isAdmin && (
              <div className="drawer-danger-zone-box">
                <button
                  type="button"
                  className="btn-danger-delete-group"
                  onClick={onDeleteGroupClick}
                >
                  <Icon name="trash" size={16} />
                  <div className="danger-btn-text">
                    <strong>Delete Group</strong>
                    <small>Only group admin can delete the group.</small>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ==============================================================
            2. MEMBERS SUBVIEW
            ============================================================== */}
        {activeSubView === "members" && (
          <div className="drawer-members-view">
            <div className="members-subview-header">
              <span className="members-count-label">{members.length} members in this group</span>
            </div>

            {loadingMembers ? (
              <div className="drawer-loading">
                <div className="spinner" />
                <span>Loading members...</span>
              </div>
            ) : members.length === 0 ? (
              <div className="drawer-empty-state">
                <p>No members found</p>
              </div>
            ) : (
              <div className="drawer-members-list">
                {members.map((m) => {
                  const mId = m.userId || m._id || m.memberId;
                  const isUserAdmin = m.role === "admin";
                  const isCurrent = currentUser?.id === mId || currentUser?._id === mId;
                  const uploadCount = memberFileCounts[mId] || 0;

                  return (
                    <div
                      key={mId}
                      className="drawer-member-card"
                      onClick={() => {
                        if (onSelectMemberFilter) {
                          onSelectMemberFilter({ id: mId, name: m.name });
                          onClose();
                        }
                      }}
                      title={`Click to view files uploaded by ${m.name}`}
                    >
                      <Avatar name={m.name} avatarUrl={m.avatar} size={36} />

                      <div className="member-card-content">
                        <div className="member-name-row">
                          <strong className="member-full-name">{m.name}</strong>
                          {isUserAdmin && <span className="member-role-badge">Admin</span>}
                          {isCurrent && <span className="member-you-badge">You</span>}
                        </div>

                        <div className="member-submeta-row">
                          <span>{uploadCount} {uploadCount === 1 ? "file" : "files"}</span>
                          <span>·</span>
                          <span>Joined {formatCardTime(m.joinedAt)}</span>
                        </div>
                      </div>

                      {isAdmin && !isCurrent && !isUserAdmin && (
                        <button
                          className="member-remove-btn"
                          title="Remove member from group"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveMember(mId, m.name);
                          }}
                        >
                          <Icon name="x" size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==============================================================
            3. MEDIA, LINKS & FILES SUBVIEW
            ============================================================== */}
        {activeSubView === "media" && (
          <div className="drawer-media-view">
            <span className="media-count-label">{files.length} items shared</span>

            {files.length === 0 ? (
              <div className="drawer-empty-state">
                <p>No files shared in this group yet</p>
              </div>
            ) : (
              <div className="drawer-files-quick-list">
                {files.map((file) => {
                  const fileId = file.id || file._id;
                  const { label, bg, color } = getFileCategoryInfo(file.originalName, file.mimeType);

                  return (
                    <div
                      key={fileId}
                      className="drawer-file-item"
                      onClick={() => onPreviewFile(file)}
                    >
                      <span className="drawer-file-badge" style={{ backgroundColor: bg, color: color }}>
                        {label}
                      </span>
                      <div className="drawer-file-info">
                        <strong className="file-name" title={file.originalName}>{file.originalName}</strong>
                        <small>{file.size} · {file.uploadedBy?.name}</small>
                      </div>
                      <Icon name="chevronRight" size={14} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==============================================================
            4. GROUP ACTIVITY SUBVIEW
            ============================================================== */}
        {activeSubView === "activity" && (
          <div className="drawer-activity-view">
            {loadingActivity ? (
              <div className="drawer-loading">
                <div className="spinner" />
                <span>Loading activity...</span>
              </div>
            ) : activities.length === 0 ? (
              <div className="drawer-empty-state">
                <p>No recent activity in this group</p>
              </div>
            ) : (
              <div className="drawer-activity-timeline">
                {activities.map((act) => {
                  const actionIcon = act.action.includes("upload")
                    ? "upload"
                    : act.action.includes("joined")
                    ? "users"
                    : "activity";

                  return (
                    <div key={act._id} className="drawer-activity-item">
                      <div className="activity-icon-node">
                        <Icon name={actionIcon} size={14} />
                      </div>
                      <div className="activity-details">
                        <p className="activity-text">
                          <strong>{act.userId?.name || "Member"}</strong>{" "}
                          {act.action === "uploaded_file" && "uploaded"}
                          {act.action === "joined_group" && "joined the group"}
                          {act.action === "created_group" && "created the group"}
                          {act.action === "deleted_file" && "deleted a file"}{" "}
                          {act.fileId?.originalName ? (
                            <span className="activity-filename">"{act.fileId.originalName}"</span>
                          ) : ""}
                        </p>
                        <span className="activity-timestamp">{formatCardTime(act.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==============================================================
            5. GROUP SETTINGS SUBVIEW
            ============================================================== */}
        {activeSubView === "settings" && (
          <div className="drawer-settings-view">
            {settingsMessage && (
              <div className={`drawer-msg-banner ${settingsMessage.includes("success") ? "success" : "error"}`}>
                {settingsMessage}
              </div>
            )}

            <form onSubmit={handleSaveSettings}>
              <div className="form-group">
                <label>Group Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={!isAdmin || isSavingSettings}
                  required
                />
              </div>

              <div className="form-group">
                <label>Group Description</label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  disabled={!isAdmin || isSavingSettings}
                  placeholder="What is this group for?"
                />
              </div>

              <div className="form-group">
                <label>Permanent Invite Code</label>
                <div className="code-read-only-box">
                  <code>{group.inviteCode}</code>
                  <span className="badge-immutable">Immutable</span>
                </div>
                <small style={{ color: "#94A3B8", marginTop: 4, display: "block" }}>
                  This invitation code is permanent and can never be changed.
                </small>
              </div>

              {isAdmin && (
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSavingSettings || !editName.trim()}
                  style={{ width: "100%", marginTop: 12 }}
                >
                  {isSavingSettings ? "Saving..." : "Save Group Settings"}
                </button>
              )}
            </form>

            {/* Danger Zone at the bottom of Group Settings */}
            {isAdmin && (
              <div className="settings-danger-section">
                <span className="danger-heading">Danger Zone</span>
                <p className="danger-subtext">
                  Deleting this group permanently removes all uploaded files, member memberships, and shared data.
                </p>
                <button
                  type="button"
                  className="btn-danger-block"
                  onClick={onDeleteGroupClick}
                >
                  <Icon name="trash" size={15} />
                  <span>Delete Group</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
