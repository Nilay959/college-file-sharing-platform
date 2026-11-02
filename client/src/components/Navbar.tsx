import React, { useState, useRef, useEffect } from "react";
import { Icon, Avatar } from "./Icons";
import { User } from "../services/api";

interface NavbarProps {
  user: User | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onToggleSidebar?: () => void;
  onOpenUpload?: () => void;
}

export function Navbar({
  user,
  searchQuery,
  onSearchChange,
  onNavigate,
  onLogout,
  isDark,
  onToggleTheme,
  onToggleSidebar,
  onOpenUpload,
}: NavbarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="fileshare-topbar">
      <div className="topbar-left-zone">
        {onToggleSidebar && (
          <button className="mobile-menu-btn" onClick={onToggleSidebar} title="Toggle Sidebar">
            <Icon name="list" size={20} />
          </button>
        )}

        {/* Global Search Bar */}
        <div className="topbar-search">
          <Icon name="search" size={16} className="search-icon" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search files, users or groups..."
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => onSearchChange("")}>
              <Icon name="x" size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="topbar-right-zone">
        {/* Quick Upload Button */}
        {onOpenUpload && (
          <button className="topbar-upload-btn" onClick={onOpenUpload}>
            <Icon name="upload" size={15} />
            <span>Upload</span>
          </button>
        )}

        {/* Theme Toggle Button */}
        <button
          className="topbar-icon-btn"
          onClick={onToggleTheme}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          <Icon name={isDark ? "sun" : "moon"} size={18} />
        </button>

        {/* Notification Bell */}
        <button className="topbar-icon-btn notification" title="Notifications">
          <Icon name="bell" size={18} />
        </button>

        {/* User Profile Pill & Dropdown */}
        <div className="user-dropdown-wrap" ref={menuRef}>
          <button
            className="topbar-user-pill"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            title="User menu"
          >
            <Avatar name={user?.name} avatarUrl={user?.avatar} size={32} />
            <span className="user-pill-name">{user?.name?.split(" ")[0] || "User"}</span>
            <Icon name="chevron" size={14} />
          </button>

          {userMenuOpen && (
            <div className="user-dropdown-menu">
              <div className="user-dropdown-header">
                <strong>{user?.name || "Member"}</strong>
                <small>{user?.email || ""}</small>
              </div>

              <div className="user-dropdown-divider" />

              <button
                className="user-dropdown-item"
                onClick={() => {
                  setUserMenuOpen(false);
                  onNavigate("/profile");
                }}
              >
                <Icon name="user" size={15} />
                <span>My Profile</span>
              </button>

              <button
                className="user-dropdown-item"
                onClick={() => {
                  setUserMenuOpen(false);
                  onNavigate("/my-uploads");
                }}
              >
                <Icon name="upload" size={15} />
                <span>My Uploads</span>
              </button>

              <button
                className="user-dropdown-item"
                onClick={() => {
                  setUserMenuOpen(false);
                  onNavigate("/settings");
                }}
              >
                <Icon name="settings" size={15} />
                <span>Settings</span>
              </button>

              <div className="user-dropdown-divider" />

              <button
                className="user-dropdown-item danger"
                onClick={() => {
                  setUserMenuOpen(false);
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
    </header>
  );
}
