import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Icon, Avatar } from "../components/Icons";
import { api, FileItem } from "../services/api";
import { FileTable, formatTimeAgo } from "../components/FileTable";
import { PreviewModal } from "../components/Modals";

interface UserProfilePageProps {
  userId: string;
  onBack: () => void;
  onSelectGroup?: (groupId: string) => void;
}

export function UserProfilePage({ userId, onBack, onSelectGroup }: UserProfilePageProps) {
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: () => api.getUserProfile(userId),
  });

  if (isLoading) {
    return (
      <div className="file-state-box loading" style={{ minHeight: 400 }}>
        <div className="spinner" />
        <span>Loading member profile...</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="file-state-box empty" style={{ minHeight: 400 }}>
        <div className="empty-icon-box">
          <Icon name="shield" size={32} />
        </div>
        <h4>Access Restricted</h4>
        <p>{(error as any)?.message || "You can only view profiles and uploads of members within your common groups."}</p>
        <button className="btn-primary" onClick={onBack} style={{ marginTop: 16 }}>
          <Icon name="arrowLeft" size={15} />
          <span>Go Back</span>
        </button>
      </div>
    );
  }

  const { user, commonGroups, files, isSelf } = data;

  return (
    <div className="user-profile-page-container">
      {/* Header Profile Card */}
      <div className="user-profile-hero">
        <button className="back-btn" onClick={onBack} title="Back">
          <Icon name="arrowLeft" size={18} />
        </button>

        <div className="profile-hero-content">
          <Avatar name={user.name} avatarUrl={user.avatar} size={64} />

          <div className="profile-hero-details">
            <div className="profile-hero-title">
              <h2>{user.name}</h2>
              {isSelf && <span className="role-badge member">You</span>}
            </div>
            <p className="profile-email">{user.email}</p>
            <div className="profile-meta-row">
              <span>
                <Icon name="clock" size={14} /> Joined {formatTimeAgo(user.createdAt)}
              </span>
              <span>•</span>
              <span>
                <Icon name="fileText" size={14} /> {files.length} {files.length === 1 ? "file" : "files"} in common groups
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Common Groups Section */}
      <div className="common-groups-section">
        <h4>Common Groups ({commonGroups.length})</h4>
        <div className="common-groups-pills">
          {commonGroups.length === 0 ? (
            <span className="text-muted" style={{ fontSize: 13 }}>No common groups</span>
          ) : (
            commonGroups.map((grp) => (
              <button
                key={grp._id || grp.id}
                className="common-group-pill"
                onClick={() => onSelectGroup && onSelectGroup(grp._id || grp.id)}
              >
                <Icon name="folder" size={14} />
                <span>{grp.name}</span>
                <small>{grp.inviteCode}</small>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Files Uploaded by this User in Common Groups */}
      <div className="profile-files-section">
        <div className="section-title-wrap" style={{ marginBottom: 16 }}>
          <h3>Files Uploaded by {user.name.split(" ")[0]} ({files.length})</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: "4px 0 0" }}>
            Showing only materials shared inside groups you have in common.
          </p>
        </div>

        <FileTable
          files={files}
          showGroupBadge={true}
          onPreview={(f) => setPreviewFile(f)}
          emptyTitle="No uploads found in common groups"
          emptyMessage={`${user.name} has not uploaded any files to your shared groups yet.`}
        />
      </div>

      <PreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
}
