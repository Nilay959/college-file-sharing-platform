import React, { useState, useEffect } from "react";
import {
  Folder,
  Share2,
  Shield,
  Users,
  UploadCloud,
  Download,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Lock,
  Key,
  FileText,
  Sparkles,
  Menu,
  X,
  Zap,
  HardDrive,
  Search,
  Copy,
  Check,
  ChevronRight,
  FileCode,
  FileSpreadsheet,
  FileImage,
} from "lucide-react";

interface LandingPageProps {
  onNavigate: (path: string) => void;
  isAuthenticated: boolean;
}

export function LandingPage({ onNavigate, isAuthenticated }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Monitor scroll for navbar blur effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleCopyDemoCode = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText("CS-E2-2026");
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="landing-page-root">
      {/* Ambient Radial Gradient Glows (TransferPro Inspired: Electric Blue + Sunset Orange/Yellow) */}
      <div className="ambient-glow glow-blue-left" />
      <div className="ambient-glow glow-orange-right" />
      <div className="ambient-glow glow-mid-subtle" />

      {/* ==============================================================
          A. NAVIGATION BAR
          ============================================================== */}
      <header className={`landing-navbar ${scrolled ? "scrolled" : ""}`}>
        <div className="landing-nav-container">
          {/* Logo & Brand */}
          <div className="landing-nav-brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div className="nav-brand-icon">
              <Folder size={20} className="text-white" />
            </div>
            <span className="nav-brand-title">FileShare</span>
          </div>

          {/* Desktop Nav Links (Pill Style) */}
          <nav className="landing-nav-links">
            <button type="button" className="nav-link-btn" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              Home
            </button>
            <button type="button" className="nav-link-btn" onClick={() => scrollToSection("features")}>
              Features
            </button>
            <button type="button" className="nav-link-btn" onClick={() => scrollToSection("how-it-works")}>
              How It Works
            </button>
            <button type="button" className="nav-link-btn" onClick={() => scrollToSection("security")}>
              Security
            </button>
          </nav>

          {/* Right Action Buttons */}
          <div className="landing-nav-actions">
            {isAuthenticated ? (
              <button
                type="button"
                className="btn-nav-gradient"
                onClick={() => onNavigate("/app")}
              >
                <span>Go to Workspace</span>
                <ArrowRight size={15} />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn-nav-ghost"
                  onClick={() => onNavigate("/login")}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className="btn-nav-gradient"
                  onClick={() => onNavigate("/register")}
                >
                  <span>Get Started</span>
                  <ArrowRight size={15} />
                </button>
              </>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className="btn-mobile-menu-toggle"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="landing-mobile-menu">
            <button type="button" className="mobile-menu-item" onClick={() => { setMobileMenuOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
              Home
            </button>
            <button type="button" className="mobile-menu-item" onClick={() => scrollToSection("features")}>
              Features
            </button>
            <button type="button" className="mobile-menu-item" onClick={() => scrollToSection("how-it-works")}>
              How It Works
            </button>
            <button type="button" className="mobile-menu-item" onClick={() => scrollToSection("security")}>
              Security
            </button>
            <div className="mobile-menu-divider" />
            {isAuthenticated ? (
              <button type="button" className="mobile-menu-btn-gradient" onClick={() => onNavigate("/app")}>
                Go to Workspace
              </button>
            ) : (
              <div className="mobile-menu-auth-group">
                <button type="button" className="mobile-menu-btn-ghost" onClick={() => onNavigate("/login")}>
                  Sign In
                </button>
                <button type="button" className="mobile-menu-btn-gradient" onClick={() => onNavigate("/register")}>
                  Get Started Free
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* ==============================================================
          B. HERO SECTION (TransferPro Inspired Proportions & Layout)
          ============================================================== */}
      <section className="landing-hero-section">
        <div className="hero-grid-container">
          {/* Left Column: Headline & Value Proposition */}
          <div className="hero-text-column">
            {/* Small Badge */}
            <div className="hero-pill-badge">
              <span className="badge-dot" />
              <span>Simple. Secure. Collaborative.</span>
            </div>

            {/* Main Headline (Geometric Sans, Tight Tracking, Italic Accents, Vibrant Gradient) */}
            <h1 className="hero-main-heading">
              <em>Your Files.</em> <br />
              Your Groups. <br />
              <span className="hero-gradient-text"><em>Everything Connected.</em></span>
            </h1>

            {/* Supporting Description */}
            <p className="hero-supporting-description">
              Share files effortlessly with your teams, classmates and communities. Create groups, invite members and manage everything from one secure workspace.
            </p>

            {/* Call to Action Buttons */}
            <div className="hero-cta-group">
              <button
                type="button"
                className="btn-hero-primary"
                onClick={() => onNavigate(isAuthenticated ? "/app" : "/register")}
              >
                <span>Get Started Free</span>
                <ArrowRight size={17} />
              </button>
              <button
                type="button"
                className="btn-hero-secondary"
                onClick={() => scrollToSection("features")}
              >
                <span>Explore Features</span>
              </button>
            </div>

            {/* Three Benefit Indicators */}
            <div className="hero-benefit-indicators">
              <div className="benefit-item">
                <Shield size={16} className="benefit-icon text-cyan" />
                <span>Secure File Sharing</span>
              </div>
              <div className="benefit-divider" />
              <div className="benefit-item">
                <Users size={16} className="benefit-icon text-orange" />
                <span>Group Collaboration</span>
              </div>
              <div className="benefit-divider" />
              <div className="benefit-item">
                <HardDrive size={16} className="benefit-icon text-yellow" />
                <span>Easy File Management</span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Product Mockup (TransferPro Bento Dashboard Style) */}
          <div className="hero-mockup-column">
            <div className="mockup-perspective-wrap">
              {/* Outer Dashboard Card */}
              <div className="mockup-main-card">
                {/* Mockup Window Top Header Bar */}
                <div className="mockup-header-bar">
                  <div className="mockup-window-controls">
                    <span className="window-dot red" />
                    <span className="window-dot yellow" />
                    <span className="window-dot green" />
                  </div>
                  <div className="mockup-group-title-pill">
                    <Folder size={13} className="text-cyan" />
                    <span>Computer Science – E Division</span>
                  </div>
                  <div className="mockup-header-pills">
                    <span className="mockup-sub-pill">
                      <Users size={12} />
                      <span>32 members</span>
                    </span>
                  </div>
                </div>

                {/* TransferPro Style Top Grid: Left Drag & Speedometer + Right 2x2 Bento */}
                <div className="mockup-bento-grid">
                  {/* Left Bento: Drag & Drop + Speedometer Arc Gauge */}
                  <div className="bento-drag-panel">
                    <div className="drag-panel-text">
                      <h3 className="drag-title">Drag & Drop Files</h3>
                      <p className="drag-subtitle">
                        Transfer notes, slides or archives up to 2GB directly into your group.
                      </p>
                      <button
                        type="button"
                        className="btn-mockup-browse"
                        onClick={() => onNavigate(isAuthenticated ? "/app" : "/register")}
                      >
                        <UploadCloud size={15} />
                        <span>Upload Files</span>
                      </button>
                    </div>

                    {/* Speedometer Arc SVG */}
                    <div className="speedometer-box">
                      <div className="speedometer-arc-wrap">
                        <svg viewBox="0 0 200 115" className="speedometer-svg">
                          <defs>
                            <linearGradient id="speedArcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#35D6BC" />
                              <stop offset="35%" stopColor="#7FE089" />
                              <stop offset="70%" stopColor="#FFD34E" />
                              <stop offset="100%" stopColor="#FF7518" />
                            </linearGradient>
                          </defs>
                          {/* Background Track */}
                          <path
                            d="M 25 105 A 75 75 0 0 1 175 105"
                            fill="none"
                            stroke="rgba(255, 255, 255, 0.08)"
                            strokeWidth="14"
                            strokeLinecap="round"
                          />
                          {/* Colorful Active Gauge Arc */}
                          <path
                            d="M 25 105 A 75 75 0 0 1 162 62"
                            fill="none"
                            stroke="url(#speedArcGradient)"
                            strokeWidth="14"
                            strokeLinecap="round"
                          />
                          {/* Needle Indicator */}
                          <line
                            x1="100"
                            y1="105"
                            x2="150"
                            y2="68"
                            stroke="#FF7518"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                          />
                          <circle cx="100" cy="105" r="5" fill="#FFD34E" />
                        </svg>
                      </div>
                      <div className="speed-readout">
                        <span className="speed-value">1200 MBPS</span>
                        <span className="speed-caption">Uploading Speed</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Bento: 2x2 Clean Feature Bento Cards */}
                  <div className="bento-cards-2x2">
                    {/* Card 1: Clean White Card with Permanent Invite Code */}
                    <div className="bento-mini-card card-white" onClick={handleCopyDemoCode}>
                      <div className="bento-card-top">
                        <div className="bento-icon-circle dark">
                          <Key size={13} />
                        </div>
                        <div className="bento-arrow-circle dark">
                          <ArrowUpRight size={13} />
                        </div>
                      </div>
                      <div className="bento-card-body">
                        <span className="bento-label-dark">Permanent Invite</span>
                        <strong className="bento-code-dark">CS-E2-2026</strong>
                      </div>
                      <button type="button" className="bento-pill-btn dark">
                        {copiedCode ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                        <span>{copiedCode ? "Copied" : "Copy Code"}</span>
                      </button>
                    </div>

                    {/* Card 2: Clean White Card with Files & Mini Badges */}
                    <div className="bento-mini-card card-white">
                      <div className="bento-card-top">
                        <div className="bento-icon-circle dark">
                          <Folder size={13} />
                        </div>
                        <div className="bento-arrow-circle dark">
                          <ArrowUpRight size={13} />
                        </div>
                      </div>
                      <div className="bento-card-body">
                        <strong className="bento-title-dark">4 Shared Files</strong>
                        <span className="bento-sub-dark">Lecture notes & labs</span>
                      </div>
                      <div className="bento-file-chips">
                        <span className="mini-chip chip-red">PDF</span>
                        <span className="mini-chip chip-blue">DOC</span>
                        <span className="mini-chip chip-amber">ZIP</span>
                        <span className="mini-chip chip-green">IMG</span>
                      </div>
                    </div>

                    {/* Card 3: Deep Royal Blue Card for Storage Usage */}
                    <div className="bento-mini-card card-blue">
                      <div className="bento-card-top">
                        <div className="bento-icon-circle blue">
                          <HardDrive size={13} />
                        </div>
                        <div className="bento-arrow-circle light">
                          <ArrowUpRight size={13} />
                        </div>
                      </div>
                      <div className="bento-card-body">
                        <span className="bento-label-light">Cloud Storage</span>
                        <div className="bento-storage-metric">
                          <strong>14.2</strong>
                          <span>/50 GB</span>
                        </div>
                        <span className="bento-avail-light">35.8 GB Available</span>
                      </div>
                      {/* Gradient Bar */}
                      <div className="bento-bar-track">
                        <div className="bento-bar-fill" style={{ width: "38%" }} />
                      </div>
                    </div>

                    {/* Card 4: Clean White Card with Security/Verified Access */}
                    <div className="bento-mini-card card-white">
                      <div className="bento-card-top">
                        <div className="bento-icon-circle dark">
                          <Shield size={13} />
                        </div>
                        <div className="bento-arrow-circle dark">
                          <ArrowUpRight size={13} />
                        </div>
                      </div>
                      <div className="bento-card-body">
                        <strong className="bento-title-dark">Secure Access</strong>
                        <span className="bento-sub-dark">Member-only downloads</span>
                      </div>
                      <div className="bento-verify-badge">
                        <CheckCircle2 size={12} className="text-emerald-600" />
                        <span>Verified Members</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Recent Transfers (TransferPro Style) */}
                <div className="mockup-transfers-bar">
                  <div className="transfers-bar-header">
                    <span className="transfers-title">Recent Transfers</span>
                    <button
                      type="button"
                      className="transfers-view-all-pill"
                      onClick={() => onNavigate(isAuthenticated ? "/app" : "/register")}
                    >
                      View All
                    </button>
                  </div>

                  <div className="transfers-grid-row">
                    {/* Transfer 1: Sent */}
                    <div className="transfer-mini-card">
                      <div className="transfer-card-top">
                        <div className="transfer-doc-icon">
                          <FileText size={15} />
                        </div>
                        <span className="transfer-status-pill sent">Sent</span>
                      </div>
                      <div className="transfer-card-info">
                        <strong>DBMS_Notes.pdf</strong>
                        <small>2.4 MB · Nilay</small>
                      </div>
                    </div>

                    {/* Transfer 2: Uploading */}
                    <div className="transfer-mini-card">
                      <div className="transfer-card-top">
                        <div className="transfer-doc-icon">
                          <UploadCloud size={15} />
                        </div>
                        <span className="transfer-status-pill uploading">Uploading</span>
                      </div>
                      <div className="transfer-card-info">
                        <strong>Project_Source.zip</strong>
                        <small>78% · 14.5 MB</small>
                      </div>
                    </div>

                    {/* Transfer 3: Ready */}
                    <div className="transfer-mini-card hide-on-compact">
                      <div className="transfer-card-top">
                        <div className="transfer-doc-icon">
                          <Share2 size={15} />
                        </div>
                        <span className="transfer-status-pill ready">Ready</span>
                      </div>
                      <div className="transfer-card-info">
                        <strong>System_Diagram.png</strong>
                        <small>3.1 MB · Amit</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==============================================================
          C. FEATURES SECTION (TransferPro Bento Style Variety)
          ============================================================== */}
      <section id="features" className="landing-section features-section">
        <div className="section-container">
          <div className="section-header-block">
            <span className="section-sub-badge">Platform Capabilities</span>
            <h2 className="section-main-heading">
              Everything Your Team Needs to Share Files
            </h2>
            <p className="section-description">
              Engineered for student batches, study circles, project teams, and clubs who need fast, structured, and private resource sharing.
            </p>
          </div>

          <div className="features-cards-grid">
            {/* Feature 1: Clean White Card (Contrast Highlight) */}
            <div className="feature-card card-white">
              <div className="feature-card-top-action">
                <div className="feature-icon-wrapper dark">
                  <Folder size={22} />
                </div>
                <div className="card-corner-arrow dark">
                  <ArrowUpRight size={16} />
                </div>
              </div>
              <h3 className="feature-card-title text-dark">Group-Based Sharing</h3>
              <p className="feature-card-text text-dark-muted">
                Create dedicated groups and keep all lecture notes, assignments, and presentations organized in one collaborative workspace.
              </p>
              <div className="card-bottom-pill dark">
                <span>Centralized Workspace</span>
              </div>
            </div>

            {/* Feature 2: Dark Card with Orange Accent */}
            <div className="feature-card card-dark">
              <div className="feature-card-top-action">
                <div className="feature-icon-wrapper orange">
                  <Key size={22} />
                </div>
                <div className="card-corner-arrow light">
                  <ArrowUpRight size={16} />
                </div>
              </div>
              <h3 className="feature-card-title">Invite Members Easily</h3>
              <p className="feature-card-text">
                Share a unique, immutable group invitation code. Teammates and classmates can join your workspace with a single click.
              </p>
              <div className="card-bottom-pill light">
                <span>Permanent Invite Code</span>
              </div>
            </div>

            {/* Feature 3: Deep Royal Blue Gradient Card */}
            <div className="feature-card card-blue">
              <div className="feature-card-top-action">
                <div className="feature-icon-wrapper cyan">
                  <Shield size={22} />
                </div>
                <div className="card-corner-arrow white">
                  <ArrowUpRight size={16} />
                </div>
              </div>
              <h3 className="feature-card-title text-white">Secure File Management</h3>
              <p className="feature-card-text text-blue-light">
                Keep files strictly accessible only to authorized members of relevant groups. No unauthorized public leaks or open access.
              </p>
              <div className="card-bottom-pill blue-pill">
                <span>Zero Public Leaks</span>
              </div>
            </div>

            {/* Feature 4: Dark Card with Cyan Accent */}
            <div className="feature-card card-dark">
              <div className="feature-card-top-action">
                <div className="feature-icon-wrapper cyan">
                  <Users size={22} />
                </div>
                <div className="card-corner-arrow light">
                  <ArrowUpRight size={16} />
                </div>
              </div>
              <h3 className="feature-card-title">Member-Wise File Access</h3>
              <p className="feature-card-text">
                Explore files uploaded by individual group members. Filter a specific peer's uploads without leaving the group view.
              </p>
              <div className="card-bottom-pill light">
                <span>Member Upload Filter</span>
              </div>
            </div>

            {/* Feature 5: Clean White Card (Contrast Highlight) */}
            <div className="feature-card card-white">
              <div className="feature-card-top-action">
                <div className="feature-icon-wrapper orange">
                  <UploadCloud size={22} />
                </div>
                <div className="card-corner-arrow dark">
                  <ArrowUpRight size={16} />
                </div>
              </div>
              <h3 className="feature-card-title text-dark">Easy Upload & Download</h3>
              <p className="feature-card-text text-dark-muted">
                Drag-and-drop notes, archives, and slides effortlessly. Download full-resolution original files anytime with secure signed URLs.
              </p>
              <div className="card-bottom-pill dark">
                <span>Instant High-Speed R2</span>
              </div>
            </div>

            {/* Feature 6: Dark Card with Yellow Accent */}
            <div className="feature-card card-dark">
              <div className="feature-card-top-action">
                <div className="feature-icon-wrapper yellow">
                  <Search size={22} />
                </div>
                <div className="card-corner-arrow light">
                  <ArrowUpRight size={16} />
                </div>
              </div>
              <h3 className="feature-card-title">Organised File Workspace</h3>
              <p className="feature-card-text">
                Search in real-time, filter by category (PDF, DOC, PPT, ZIP, Code), sort by date or size, and toggle between grid and table views.
              </p>
              <div className="card-bottom-pill light">
                <span>Instant Filters & Views</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==============================================================
          D. HOW IT WORKS SECTION (Compact, High-Contrast Workflow)
          ============================================================== */}
      <section id="how-it-works" className="landing-section how-it-works-section">
        <div className="section-container">
          <div className="section-header-block">
            <span className="section-sub-badge">Workflow</span>
            <h2 className="section-main-heading">Get Started in 3 Simple Steps</h2>
            <p className="section-description">
              No complicated onboarding or messy configuration. Start collaborating with your group in under two minutes.
            </p>
          </div>

          <div className="steps-container-grid">
            {/* Step 1: Dark Card with Orange Accent */}
            <div className="step-card card-dark">
              <div className="step-top-row">
                <div className="step-icon-badge orange">
                  <Users size={20} />
                </div>
                <span className="step-number-tag orange">01</span>
              </div>
              <h3 className="step-title">Create Your Account</h3>
              <p className="step-description">
                Register using your email address and password. Verify your account with a secure 6-digit confirmation code.
              </p>
            </div>

            {/* Step 2: Clean White Card (Contrast Focal Point) */}
            <div className="step-card card-white">
              <div className="step-top-row">
                <div className="step-icon-badge dark">
                  <Key size={20} />
                </div>
                <span className="step-number-tag dark">02</span>
              </div>
              <h3 className="step-title text-dark">Create or Join a Group</h3>
              <p className="step-description text-dark-muted">
                Create a new workspace for your batch or study group, or enter an invitation code shared by a peer.
              </p>
            </div>

            {/* Step 3: Dark Card with Cyan Accent */}
            <div className="step-card card-dark">
              <div className="step-top-row">
                <div className="step-icon-badge cyan">
                  <Share2 size={20} />
                </div>
                <span className="step-number-tag cyan">03</span>
              </div>
              <h3 className="step-title">Share & Manage Files</h3>
              <p className="step-description">
                Upload notes, view in-browser previews, download study material, and manage shared group resources securely.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==============================================================
          E. SECURITY SECTION (Clean Dark Cards, Vibrant Icons)
          ============================================================== */}
      <section id="security" className="landing-section security-section">
        <div className="section-container">
          <div className="section-header-block">
            <span className="section-sub-badge">Data Privacy & Control</span>
            <h2 className="section-main-heading">
              Your Files Stay With the Right People
            </h2>
            <p className="section-description">
              FileShare enforces strict group membership controls and authenticated token policies on every single request.
            </p>
          </div>

          <div className="security-features-grid">
            <div className="security-spec-card">
              <div className="spec-icon-box cyan">
                <Lock size={19} />
              </div>
              <h4>Authenticated Access</h4>
              <p>JWT-based cryptographic tokens ensure only signed-in verified users can access workspace APIs.</p>
            </div>

            <div className="security-spec-card">
              <div className="spec-icon-box orange">
                <Users size={19} />
              </div>
              <h4>Group Membership Permissions</h4>
              <p>Users can only view, download, or search files from groups they are explicitly approved members of.</p>
            </div>

            <div className="security-spec-card">
              <div className="spec-icon-box blue">
                <HardDrive size={19} />
              </div>
              <h4>Private Cloud Storage</h4>
              <p>Files are stored in dedicated cloud buckets with secure presigned URLs that expire automatically.</p>
            </div>

            <div className="security-spec-card">
              <div className="spec-icon-box yellow">
                <Download size={19} />
              </div>
              <h4>Controlled Downloads</h4>
              <p>Direct public bucket browsing is blocked. Every download verifies real-time user group membership.</p>
            </div>

            <div className="security-spec-card">
              <div className="spec-icon-box cyan">
                <Shield size={19} />
              </div>
              <h4>Admin & Member Roles</h4>
              <p>Group creators have administrative control over memberships and file moderation inside their group.</p>
            </div>

            <div className="security-spec-card">
              <div className="spec-icon-box orange">
                <Zap size={19} />
              </div>
              <h4>Protected Rate-Limited Endpoints</h4>
              <p>Brute-force protection, input sanitization, and security headers safeguard against automated attacks.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ==============================================================
          F. FINAL CALL TO ACTION (CTA)
          ============================================================== */}
      <section className="landing-cta-section">
        <div className="section-container">
          <div className="cta-banner-card">
            <div className="cta-glow-backdrop" />
            <div className="cta-content-wrapper">
              <h2 className="cta-heading">Ready to Organise Your Files?</h2>
              <p className="cta-subheading">
                Create your workspace, invite your team and start sharing files effortlessly today.
              </p>
              <div className="cta-buttons-row">
                <button
                  type="button"
                  className="btn-cta-main"
                  onClick={() => onNavigate(isAuthenticated ? "/app" : "/register")}
                >
                  <span>{isAuthenticated ? "Open FileShare Workspace" : "Get Started for Free"}</span>
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==============================================================
          G. FOOTER
          ============================================================== */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-top-row">
            <div className="footer-brand-column">
              <div className="landing-nav-brand">
                <div className="nav-brand-icon">
                  <Folder size={19} className="text-white" />
                </div>
                <span className="nav-brand-title">FileShare</span>
              </div>
              <p className="footer-brand-text">
                Modern group-based collaborative file sharing for study batches, college divisions, and team projects.
              </p>
            </div>

            <div className="footer-links-group">
              <div className="footer-column">
                <span className="footer-heading">Navigation</span>
                <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Home</button>
                <button type="button" onClick={() => scrollToSection("features")}>Features</button>
                <button type="button" onClick={() => scrollToSection("how-it-works")}>How It Works</button>
                <button type="button" onClick={() => scrollToSection("security")}>Security</button>
              </div>

              <div className="footer-column">
                <span className="footer-heading">Account</span>
                <button type="button" onClick={() => onNavigate("/login")}>Sign In</button>
                <button type="button" onClick={() => onNavigate("/register")}>Create Account</button>
                <button type="button" onClick={() => onNavigate("/app")}>Dashboard</button>
              </div>
            </div>
          </div>

          <div className="footer-bottom-row">
            <p>© {new Date().getFullYear()} FileShare. All rights reserved.</p>
            <span className="footer-privacy-text">Private & Collaborative File Sharing Platform</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
