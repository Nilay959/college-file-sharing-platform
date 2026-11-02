import React from "react";
import { Icon } from "./Icons";

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ currentPath, onNavigate, onLogout, isOpen = false, onClose }: SidebarProps) {
  const mainNav = [
    { id: "/dashboard", label: "Dashboard", icon: "dashboard" },
    { id: "/groups", label: "My Groups", icon: "users" },
    { id: "/files", label: "All Files", icon: "fileText" },
    { id: "/my-uploads", label: "My Uploads", icon: "upload" },
    { id: "/shared-with-me", label: "Shared With Me", icon: "share" },
  ];

  const handleNavClick = (path: string) => {
    onNavigate(path);
    if (onClose) onClose();
  };

  const isActive = (path: string) => {
    if (path === "/dashboard" && (currentPath === "/" || currentPath === "/dashboard")) return true;
    if (path !== "/dashboard" && currentPath.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && <div className="sidebar-mobile-backdrop" onClick={onClose} />}

      <aside className={`fileshare-sidebar ${isOpen ? "open" : ""}`}>
        {/* Brand Header */}
        <div className="sidebar-brand" onClick={() => handleNavClick("/dashboard")}>
          <div className="brand-logo">
            <Icon name="folder" size={20} />
          </div>
          <span className="brand-name">FileShare</span>
        </div>

        {/* Navigation Links */}
        <nav className="sidebar-nav">
          <div className="nav-section-title">Navigation</div>
          {mainNav.map((item) => {
            const active = isActive(item.id);
            return (
              <button
                key={item.id}
                className={`sidebar-nav-item ${active ? "active" : ""}`}
                onClick={() => handleNavClick(item.id)}
              >
                <Icon name={item.icon} size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="sidebar-footer">
          <div className="nav-section-title">Account</div>
          <button
            className={`sidebar-nav-item ${currentPath === "/profile" ? "active" : ""}`}
            onClick={() => handleNavClick("/profile")}
          >
            <Icon name="user" size={18} />
            <span>Profile</span>
          </button>
          <button
            className={`sidebar-nav-item ${currentPath === "/settings" ? "active" : ""}`}
            onClick={() => handleNavClick("/settings")}
          >
            <Icon name="settings" size={18} />
            <span>Settings</span>
          </button>
          <button
            className="sidebar-nav-item logout"
            onClick={onLogout}
            title="Log out of FileShare"
          >
            <Icon name="logout" size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
