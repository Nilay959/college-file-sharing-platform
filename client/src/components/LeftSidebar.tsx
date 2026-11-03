import React, { useState, useMemo, useRef, useEffect } from "react";
import { Icon, Avatar } from "./Icons";
import { Group, User, FileItem, api } from "../services/api";

interface LeftSidebarProps {
  groups: Group[];
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
  onOpenCreateGroup: () => void;
  onOpenJoinGroup: () => void;
  onOpenSettings: () => void;
  onOpenNotifications: () => void;
  user: User | null;
  onLogout: () => void;
  onSelectFileFromGlobalSearch?: (file: FileItem) => void;
  onSelectMemberFromGlobalSearch?: (groupId: string, memberId: string) => void;
}

// Helper to assign a pleasant icon and color for groups
export function getGroupVisual(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("dsa") || lower.includes("code") || lower.includes("dev") || lower.includes("programming")) {
    return { icon: "code", bg: "#252525", color: "#F1F1F1" };
  }
  if (lower.includes("team") || lower.includes("project") || lower.includes("club") || lower.includes("batch")) {
    return { icon: "users", bg: "#252525", color: "#F1F1F1" };
  }
  if (lower.includes("web") || lower.includes("lab") || lower.includes("tech")) {
    return { icon: "laptop", bg: "#252525", color: "#F1F1F1" };
  }
  if (lower.includes("semester") || lower.includes("sem") || lower.includes("cse") || lower.includes("exam")) {
    return { icon: "gradCap", bg: "#252525", color: "#F1F1F1" };
  }
  return { icon: "folder", bg: "#252525", color: "#F1F1F1" };
}

// Format relative time like WhatsApp (e.g., 4:23 pm, Yesterday, 20 Oct)
export function formatWhatsAppTime(dateString?: string): string {
  if (!dateString) return "Recently";
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  return date.toLocaleDateString([], { day: "numeric", month: "short" });
}

export function LeftSidebar({
  groups,
  selectedGroupId,
  onSelectGroup,
  onOpenCreateGroup,
  onOpenJoinGroup,
  onOpenSettings,
  onOpenNotifications,
  user,
  onLogout,
  onSelectFileFromGlobalSearch,
  onSelectMemberFromGlobalSearch,
}: LeftSidebarProps) {
  const [globalSearch, setGlobalSearch] = useState("");
  const [searchResults, setSearchResults] = useState<{ files: FileItem[] }>({ files: [] });
  const [isSearchingFiles, setIsSearchingFiles] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter groups locally
  const filteredGroups = useMemo(() => {
    if (!globalSearch.trim()) return groups;
    const q = globalSearch.toLowerCase();
    return groups.filter(
      (g) => g.name.toLowerCase().includes(q) || (g.description && g.description.toLowerCase().includes(q))
    );
  }, [groups, globalSearch]);

  // Debounced search for files across accessible groups
  useEffect(() => {
    if (!globalSearch.trim() || globalSearch.length < 2) {
      setSearchResults({ files: [] });
      setIsSearchingFiles(false);
      return;
    }

    let isCurrent = true;
    setIsSearchingFiles(true);

    const timer = setTimeout(() => {
      api.getAllFiles({ q: globalSearch.trim() })
        .then((files) => {
          if (isCurrent) setSearchResults({ files: files.slice(0, 5) });
        })
        .catch(() => {})
        .finally(() => {
          if (isCurrent) setIsSearchingFiles(false);
        });
    }, 250);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [globalSearch]);

  return (
    <aside className="fileshare-left-sidebar">
      {/* 1. Header (WhatsApp style) */}
      <div className="sidebar-header">
        <div className="sidebar-brand-box">
          <div className="brand-logo-gradient">
            <Icon name="folder" size={20} />
          </div>
          <span className="app-brand-title">FileShare</span>
        </div>

        <div className="sidebar-header-actions">
          <button
            className="header-action-btn"
            title="Notifications"
            onClick={onOpenNotifications}
          >
            <Icon name="bell" size={18} />
          </button>

          <button
            className="header-action-btn"
            title="Settings"
            onClick={onOpenSettings}
          >
            <Icon name="settings" size={18} />
          </button>

          {/* User Avatar Menu */}
          <div className="user-avatar-menu-wrapper" ref={userMenuRef}>
            <button
              className="user-avatar-trigger"
              onClick={() => setUserDropdownOpen((v) => !v)}
              title={user?.name || "User account"}
            >
              <Avatar name={user?.name} avatarUrl={user?.avatar} size={32} />
            </button>

            {userDropdownOpen && (
              <div className="sidebar-user-dropdown">
                <div className="user-dropdown-info">
                  <strong>{user?.name || "User"}</strong>
                  <small>{user?.email}</small>
                </div>
                <div className="dropdown-divider" />
                <button
                  className="dropdown-item"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    onOpenSettings();
                  }}
                >
                  <Icon name="user" size={15} />
                  <span>Account Settings</span>
                </button>
                <button
                  className="dropdown-item danger"
                  onClick={() => {
                    setUserDropdownOpen(false);
                    onLogout();
                  }}
                >
                  <Icon name="logout" size={15} />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Global Search Bar */}
      <div className="sidebar-search-container">
        <div className="sidebar-search-bar">
          <Icon name="search" size={16} className="search-icon" />
          <input
            type="text"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Search groups, members or files..."
          />
          {globalSearch && (
            <button
              className="clear-search-btn"
              onClick={() => setGlobalSearch("")}
              aria-label="Clear search"
            >
              <Icon name="x" size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 3. Action Buttons: Create & Join Group */}
      <div className="sidebar-action-buttons-row">
        <button className="btn-create-group" onClick={onOpenCreateGroup}>
          <Icon name="plus" size={16} />
          <span>Create Group</span>
        </button>

        <button className="btn-join-group" onClick={onOpenJoinGroup}>
          <Icon name="link" size={15} />
          <span>Join Group</span>
        </button>
      </div>

      {/* Global Search Results Dropdown Overlay (when typing files/members) */}
      {globalSearch.trim().length >= 2 && searchResults.files.length > 0 && (
        <div className="global-search-results-overlay">
          <div className="search-section-label">MATCHING FILES</div>
          {searchResults.files.map((file) => (
            <div
              key={file.id || file._id}
              className="search-result-file-item"
              onClick={() => {
                if (file.groupId?._id) onSelectGroup(file.groupId._id);
                if (onSelectFileFromGlobalSearch) onSelectFileFromGlobalSearch(file);
                setGlobalSearch("");
              }}
            >
              <Icon name="fileText" size={16} className="result-file-icon" />
              <div className="result-file-meta">
                <strong title={file.originalName}>{file.originalName}</strong>
                <span>in {file.groupId?.name || "Group"} • {file.uploadedBy?.name}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Group List Header */}
      <div className="sidebar-groups-header">
        <span>YOUR GROUPS ({groups.length})</span>
      </div>

      {/* 5. Scrollable Group List */}
      <div className="sidebar-groups-list">
        {groups.length === 0 ? (
          <div className="sidebar-no-groups">
            <div className="no-groups-icon">
              <Icon name="folder" size={28} />
            </div>
            <h4>No groups yet</h4>
            <p>Create a new group or join with an invite code to begin sharing files.</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="sidebar-no-groups">
            <p>No groups match "{globalSearch}"</p>
          </div>
        ) : (
          filteredGroups.map((group) => {
            const isSelected = selectedGroupId === (group.id || group._id);
            const { icon, bg, color } = getGroupVisual(group.name);
            const timeFormatted = formatWhatsAppTime(group.createdAt);

            return (
              <div
                key={group.id || group._id}
                className={`sidebar-group-item ${isSelected ? "selected" : ""}`}
                onClick={() => onSelectGroup(group.id || group._id)}
              >
                {/* Group Avatar */}
                <div
                  className="group-item-avatar"
                  style={{ backgroundColor: bg, color: color }}
                >
                  <Icon name={icon} size={20} />
                </div>

                {/* Group Info */}
                <div className="group-item-content">
                  <div className="group-item-top-row">
                    <span className="group-item-name" title={group.name}>
                      {group.name}
                    </span>
                    <span className="group-item-time">{timeFormatted}</span>
                  </div>

                  <div className="group-item-bottom-row">
                    <span className="group-item-submeta">
                      {group.memberCount || 1} members · {group.fileCount || 0} files
                    </span>

                    {/* Optional unread badge or role indicator */}
                    {group.role === "admin" && (
                      <span className="group-admin-pill" title="Group Admin">Admin</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
