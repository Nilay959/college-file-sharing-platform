import React from "react";
import { Folder, ArrowLeft, Home, LayoutGrid } from "lucide-react";

interface NotFoundPageProps {
  onNavigate: (path: string) => void;
  isAuthenticated: boolean;
}

export function NotFoundPage({ onNavigate, isAuthenticated }: NotFoundPageProps) {
  return (
    <div className="not-found-page-root">
      <div className="ambient-glow glow-mid-center" />
      <div className="not-found-card">
        <div className="not-found-icon-wrap">
          <Folder size={44} className="text-indigo-400" />
        </div>
        <span className="not-found-code-badge">404 ERROR</span>
        <h1 className="not-found-title">Page Not Found</h1>
        <p className="not-found-desc">
          The link you followed may be broken, or the page may have been removed.
        </p>

        <div className="not-found-actions">
          <button
            type="button"
            className="btn-hero-primary"
            onClick={() => onNavigate("/")}
          >
            <Home size={16} />
            <span>Back to Home</span>
          </button>

          {isAuthenticated ? (
            <button
              type="button"
              className="btn-hero-secondary"
              onClick={() => onNavigate("/app")}
            >
              <LayoutGrid size={16} />
              <span>Open Workspace</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn-hero-secondary"
              onClick={() => onNavigate("/login")}
            >
              <ArrowLeft size={16} />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
