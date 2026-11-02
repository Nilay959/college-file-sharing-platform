import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Icon, Avatar } from "../components/Icons";
import { api, Group, FileItem, GroupMemberItem } from "../services/api";
import { FileTable, formatTimeAgo } from "../components/FileTable";
import { UploadModal, PreviewModal, DeleteModal } from "../components/Modals";

interface GroupWorkspacePageProps {
  groupId: string;
  onBack: () => void;
  onNavigateUser?: (userId: string) => void;
}

export function GroupWorkspacePage({ groupId, onBack, onNavigateUser }: GroupWorkspacePageProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"files" | "members" | "uploads" | "activity">("files");
  const [copied, setCopied] = useState(false);

  // Modals state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [deleteFileItem, setDeleteFileItem] = useState<FileItem | null>(null);
  const [removeMemberItem, setRemoveMemberItem] = useState<GroupMemberItem | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteGroupOpen, setDeleteGroupOpen] = useState(false);

  // Group Details Query
  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => api.getGroup(groupId),
  });

  // Group Files Query
  const { data: files = [], isLoading: filesLoading } = useQuery({
    queryKey: ["group-files", groupId],
    queryFn: () => api.getGroupFiles(groupId),
  });

  // Group Members Query
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["group-members", groupId],
    queryFn: () => api.getGroupMembers(groupId),
  });

  // Group Activity Query
  const { data: activities = [], isLoading: activityLoading } = useQuery({
    queryKey: ["group-activity", groupId],
    queryFn: () => api.getGroupActivity(groupId),
    enabled: activeTab === "activity",
  });

  // Mutations
  const deleteFileMutation = useMutation({
    mutationFn: (fileId: string) => api.deleteFile(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-files", groupId] });
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setDeleteFileItem(null);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => api.removeGroupMember(groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
      queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      setRemoveMemberItem(null);
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: () => api.deleteGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      onBack();
    },
  });

  const handleCopyCode = () => {
    if (!group?.inviteCode) return;
    navigator.clipboard.writeText(group.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isAdmin = group?.role === "admin";

  // Member-wise files calculation for "Uploads" tab
  const memberUploads = React.useMemo(() => {
    const map = new Map<string, { member: GroupMemberItem | { name: string; email: string; avatar?: string }; files: FileItem[] }>();

    members.forEach((m) => {
      map.set(m.userId, { member: m, files: [] });
    });

    files.forEach((f) => {
      const uploaderId = f.uploadedBy?._id;
      if (uploaderId && map.has(uploaderId)) {
        map.get(uploaderId)!.files.push(f);
      } else if (uploaderId) {
        map.set(uploaderId, {
          member: {
            name: f.uploadedBy?.name || "Member",
            email: f.uploadedBy?.email || "",
            avatar: f.uploadedBy?.avatar,
          },
          files: [f],
        });
      }
    });

    return Array.from(map.entries()).map(([userId, data]) => ({
      userId,
      member: data.member,
      files: data.files,
    }));
  }, [members, files]);

  if (groupLoading) {
    return (
      <div className="file-state-box loading" style={{ minHeight: 400 }}>
        <div className="spinner" />
        <span>Loading group workspace...</span>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="file-state-box empty" style={{ minHeight: 400 }}>
        <h4>Group not found</h4>
        <p>This group may have been removed or you are no longer a member.</p>
        <button className="btn-primary" onClick={onBack} style={{ marginTop: 16 }}>
          <Icon name="arrowLeft" size={15} />
          <span>Back to Groups</span>
        </button>
      </div>
    );
  }

  return (
    <div className="group-workspace-container">
      {/* Workspace Header */}
      <div className="workspace-header">
        <div className="workspace-header-left">
          <button className="back-btn" onClick={onBack} title="Back to Groups">
            <Icon name="arrowLeft" size={18} />
          </button>

          <div className="group-avatar-mark">
            <Icon name="folder" size={24} />
          </div>

          <div className="workspace-title-box">
            <h2>{group.name}</h2>
            <div className="workspace-meta">
              <span>{group.memberCount || members.length} members</span>
              <span>•</span>
              <span>{group.fileCount || files.length} files</span>
              {group.description && (
                <>
                  <span>•</span>
                  <span className="group-desc-inline">{group.description}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="workspace-header-right">
          {/* Permanent Invite Code Badge */}
          <div
            className="workspace-invite-pill"
            onClick={handleCopyCode}
            title="Click to copy permanent invite code"
          >
            <span className="invite-prefix">Invite Code:</span>
            <strong>{group.inviteCode}</strong>
            <button className="copy-icon-btn" aria-label="Copy invite code">
              <Icon name={copied ? "check" : "copy"} size={14} />
            </button>
            {copied && <span className="copied-tooltip">Copied!</span>}
          </div>

          {/* Group Settings / Actions */}
          {isAdmin ? (
            <button
              className="btn-secondary"
              onClick={() => setDeleteGroupOpen(true)}
              style={{ color: "#EF4444" }}
              title="Delete this group"
            >
              <Icon name="trash" size={15} />
              <span>Delete Group</span>
            </button>
          ) : (
            <button
              className="btn-secondary"
              onClick={() => {
                // Member leaving group
                if (window.confirm("Are you sure you want to leave this group?")) {
                  const me = members.find((m) => m.userId === group?.createdBy);
                  // Current user leaving
                  api.removeGroupMember(groupId, "").then(() => onBack());
                }
              }}
              title="Leave this group"
            >
              <Icon name="logout" size={15} />
              <span>Leave</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="workspace-tabs-nav">
        <button
          className={`workspace-tab ${activeTab === "files" ? "active" : ""}`}
          onClick={() => setActiveTab("files")}
        >
          <Icon name="fileText" size={16} />
          <span>Files</span>
          <span className="tab-count">{files.length}</span>
        </button>

        <button
          className={`workspace-tab ${activeTab === "members" ? "active" : ""}`}
          onClick={() => setActiveTab("members")}
        >
          <Icon name="users" size={16} />
          <span>Members</span>
          <span className="tab-count">{members.length}</span>
        </button>

        <button
          className={`workspace-tab ${activeTab === "uploads" ? "active" : ""}`}
          onClick={() => setActiveTab("uploads")}
        >
          <Icon name="upload" size={16} />
          <span>Uploads</span>
        </button>

        <button
          className={`workspace-tab ${activeTab === "activity" ? "active" : ""}`}
          onClick={() => setActiveTab("activity")}
        >
          <Icon name="activity" size={16} />
          <span>Activity</span>
        </button>
      </div>

      {/* Tab 1: Files */}
      {activeTab === "files" && (
        <FileTable
          files={files}
          isLoading={filesLoading}
          onPreview={(f) => setPreviewFile(f)}
          onDelete={(f) => setDeleteFileItem(f)}
          onUploadClick={() => setUploadOpen(true)}
          onNavigateUser={onNavigateUser}
          emptyTitle="No files in this group yet"
          emptyMessage="Be the first to upload lecture notes, assignments, or slides for this group."
        />
      )}

      {/* Tab 2: Members */}
      {activeTab === "members" && (
        <div className="members-tab-content">
          <div className="members-header-bar">
            <div>
              <h3>Group Members ({members.length})</h3>
              <p>Members can view, download, preview, and upload files in this group.</p>
            </div>
            <button className="btn-secondary" onClick={handleCopyCode}>
              <Icon name="copy" size={14} />
              <span>{copied ? "Invite Code Copied!" : "Copy Invite Code"}</span>
            </button>
          </div>

          <div className="members-table-wrap">
            <table className="fileshare-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Joined On</th>
                  {isAdmin && <th style={{ textAlign: "right" }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const isMemberAdmin = m.role === "admin";
                  return (
                    <tr key={m._id || m.userId}>
                      <td>
                        <div
                          className="member-profile-cell clickable"
                          onClick={() => onNavigateUser && onNavigateUser(m.userId)}
                        >
                          <Avatar name={m.name} avatarUrl={m.avatar} size={36} />
                          <div>
                            <strong className="user-link">{m.name}</strong>
                            <small>{m.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`role-badge ${isMemberAdmin ? "admin" : "member"}`}>
                          {isMemberAdmin ? "Admin" : "Member"}
                        </span>
                      </td>
                      <td className="text-muted">{formatTimeAgo(m.joinedAt)}</td>
                      {isAdmin && (
                        <td style={{ textAlign: "right" }}>
                          {!isMemberAdmin && (
                            <button
                              className="action-icon-btn danger"
                              title="Remove member"
                              onClick={() => setRemoveMemberItem(m)}
                            >
                              <Icon name="trash" size={15} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Uploads (Member-wise breakdown) */}
      {activeTab === "uploads" && (
        <div className="member-uploads-breakdown">
          {memberUploads.length === 0 ? (
            <div className="file-state-box empty">
              <Icon name="upload" size={28} />
              <h4>No uploads yet</h4>
              <p>No files have been uploaded to this group.</p>
            </div>
          ) : (
            memberUploads.map(({ userId, member, files: userFiles }) => (
              <div key={userId} className="member-uploads-group-card">
                <div className="member-uploads-header">
                  <div
                    className="member-info-row clickable"
                    onClick={() => onNavigateUser && onNavigateUser(userId)}
                  >
                    <Avatar name={member.name} avatarUrl={member.avatar} size={32} />
                    <div>
                      <strong className="user-link">{member.name}</strong>
                      <small>{member.email}</small>
                    </div>
                  </div>
                  <span className="uploads-count-badge">
                    {userFiles.length} {userFiles.length === 1 ? "file" : "files"}
                  </span>
                </div>

                {userFiles.length === 0 ? (
                  <div className="member-no-files">No files uploaded yet</div>
                ) : (
                  <div className="member-files-mini-list">
                    {userFiles.map((f) => (
                      <div
                        key={f.id || f._id}
                        className="member-mini-file-row"
                        onClick={() => setPreviewFile(f)}
                      >
                        <div className="mini-file-info">
                          <Icon name="fileText" size={16} />
                          <span className="mini-file-name" title={f.originalName}>
                            {f.originalName}
                          </span>
                        </div>
                        <div className="mini-file-actions">
                          <span className="text-muted">{f.size}</span>
                          <button
                            className="action-icon-btn"
                            title="Download"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(api.getDownloadUrl(f.id || f._id), "_blank");
                            }}
                          >
                            <Icon name="download" size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 4: Activity */}
      {activeTab === "activity" && (
        <div className="workspace-activity-tab">
          {activityLoading ? (
            <div className="file-state-box loading">
              <div className="spinner" />
              <span>Loading group activity...</span>
            </div>
          ) : activities.length === 0 ? (
            <div className="file-state-box empty">
              <Icon name="activity" size={28} />
              <h4>No activity yet</h4>
              <p>Activity logs will show when members join, upload, or manage files.</p>
            </div>
          ) : (
            <div className="activity-timeline">
              {activities.map((act) => (
                <div key={act._id} className="timeline-item">
                  <div className="timeline-icon">
                    <Icon
                      name={
                        act.action === "uploaded_file"
                          ? "upload"
                          : act.action === "joined_group"
                          ? "users"
                          : act.action === "created_group"
                          ? "folder"
                          : "activity"
                      }
                      size={15}
                    />
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <strong>{act.userId?.name || "Member"}</strong>
                      <span className="timeline-time">{formatTimeAgo(act.createdAt)}</span>
                    </div>
                    <p className="timeline-text">{act.details}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        groups={[group]}
        defaultGroupId={group.id || group._id}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["group-files", groupId] });
          queryClient.invalidateQueries({ queryKey: ["group", groupId] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
        }}
      />

      <PreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />

      <DeleteModal
        isOpen={!!deleteFileItem}
        title="Delete File"
        message={`Are you sure you want to delete "${deleteFileItem?.originalName}"? This file will be permanently removed from Cloudflare R2.`}
        confirmLabel="Delete Permanently"
        loading={deleteFileMutation.isPending}
        onConfirm={() => deleteFileItem && deleteFileMutation.mutate(deleteFileItem.id || deleteFileItem._id)}
        onClose={() => setDeleteFileItem(null)}
      />

      <DeleteModal
        isOpen={!!removeMemberItem}
        title="Remove Member"
        message={`Are you sure you want to remove ${removeMemberItem?.name} from ${group.name}? They will no longer have access to group files.`}
        confirmLabel="Remove Member"
        loading={removeMemberMutation.isPending}
        onConfirm={() => removeMemberItem && removeMemberMutation.mutate(removeMemberItem.userId)}
        onClose={() => setRemoveMemberItem(null)}
      />

      <DeleteModal
        isOpen={deleteGroupOpen}
        title="Delete Entire Group"
        message={`Are you sure you want to permanently delete "${group.name}"? All ${files.length} uploaded files in this group will be deleted from Cloudflare R2 and all memberships removed.`}
        confirmLabel="Delete Group"
        loading={deleteGroupMutation.isPending}
        onConfirm={() => deleteGroupMutation.mutate()}
        onClose={() => setDeleteGroupOpen(false)}
      />
    </div>
  );
}
