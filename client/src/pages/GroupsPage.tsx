import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "../components/Icons";
import { api, Group } from "../services/api";

interface GroupsPageProps {
  onSelectGroup: (groupId: string) => void;
  onOpenCreateGroup: () => void;
  onOpenJoinGroup: () => void;
}

export function GroupsPage({
  onSelectGroup,
  onOpenCreateGroup,
  onOpenJoinGroup,
}: GroupsPageProps) {
  const [search, setSearch] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: api.getGroups,
  });

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredGroups = groups.filter((g) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return g.name.toLowerCase().includes(q) || (g.description && g.description.toLowerCase().includes(q));
  });

  return (
    <div className="groups-page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2>My Groups</h2>
          <p>Create, join, and collaborate in academic and project groups</p>
        </div>
        <div className="page-header-actions">
          <button className="btn-secondary" onClick={onOpenJoinGroup}>
            <Icon name="users" size={15} />
            <span>Join Group</span>
          </button>
          <button className="btn-primary" onClick={onOpenCreateGroup}>
            <Icon name="plus" size={15} />
            <span>Create Group</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="groups-toolbar">
        <div className="file-search-wrap" style={{ maxWidth: 360 }}>
          <Icon name="search" size={15} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter groups by name..."
          />
          {search && (
            <button className="clear-btn" onClick={() => setSearch("")}>
              <Icon name="x" size={12} />
            </button>
          )}
        </div>
        <span className="text-muted" style={{ fontSize: 13 }}>
          {filteredGroups.length} {filteredGroups.length === 1 ? "group" : "groups"} found
        </span>
      </div>

      {/* Group Cards Grid */}
      {isLoading ? (
        <div className="file-state-box loading">
          <div className="spinner" />
          <span>Loading your groups...</span>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="file-state-box empty">
          <div className="empty-icon-box">
            <Icon name="folder" size={32} />
          </div>
          <h4>No groups found</h4>
          <p>
            {search
              ? "No groups match your search criteria."
              : "You are not a member of any groups yet. Create a new group or join with an invite code."}
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button className="btn-secondary" onClick={onOpenJoinGroup}>
              <Icon name="users" size={14} />
              <span>Join with Code</span>
            </button>
            <button className="btn-primary" onClick={onOpenCreateGroup}>
              <Icon name="plus" size={14} />
              <span>Create New Group</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="groups-cards-grid">
          {filteredGroups.map((group) => {
            const isAdmin = group.role === "admin";
            const isCopied = copiedCode === group.inviteCode;

            return (
              <div
                key={group.id || group._id}
                className="group-card"
                onClick={() => onSelectGroup(group.id || group._id)}
              >
                <div className="group-card-header">
                  <div className="group-card-icon">
                    <Icon name="folder" size={22} />
                  </div>
                  <span className={`role-badge ${isAdmin ? "admin" : "member"}`}>
                    {isAdmin ? "Admin" : "Member"}
                  </span>
                </div>

                <h3 className="group-card-title">{group.name}</h3>
                <p className="group-card-desc">
                  {group.description || "No description provided for this group."}
                </p>

                {/* Invite Code Pill */}
                <div
                  className="invite-code-pill"
                  onClick={(e) => handleCopyCode(e, group.inviteCode)}
                  title="Click to copy invite code"
                >
                  <span className="invite-label">Invite Code:</span>
                  <strong>{group.inviteCode}</strong>
                  <button className="copy-icon-btn" aria-label="Copy code">
                    <Icon name={isCopied ? "check" : "copy"} size={14} />
                  </button>
                  {isCopied && <span className="copied-tooltip">Copied!</span>}
                </div>

                <div className="group-card-footer">
                  <div className="group-card-stats">
                    <span>
                      <Icon name="users" size={14} /> {group.memberCount || 1} members
                    </span>
                    <span>
                      <Icon name="fileText" size={14} /> {group.fileCount || 0} files
                    </span>
                  </div>

                  <button className="group-open-btn">
                    <span>Open</span>
                    <Icon name="chevron" size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
