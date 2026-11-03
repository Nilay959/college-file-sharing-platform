import React, { useState, useEffect } from "react";
import {
  Folder,
  Share2,
  Shield,
  Users,
  UploadCloud,
  Download,
  ArrowRight,
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

  const handleCopyDemoCode = (e: React.MouseEvent) => {
    e.stopPropagation();
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
      {/* Background ambient gradient glow spheres (TransferPro inspired) */}
      <div className="ambient-glow glow-top-left" />
      <div className="ambient-glow glow-top-right" />
      <div className="ambient-glow glow-mid-center" />
      <div className="ambient-glow glow-bottom-right" />

      {/* ==============================================================
          A. NAVIGATION BAR
          ============================================================== */}
      <header className={`landing-navbar ${scrolled ? "scrolled" : ""}`}>
        <div className="landing-nav-container">
          {/* Logo & Brand */}
          <div className="landing-nav-brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div className="nav-brand-icon">
              <Folder size={22} className="text-white" />
            </div>
            <span className="nav-brand-title">FileShare</span>
          </div>

          {/* Desktop Nav Links */}
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
                <ArrowRight size={16} />
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
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
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
          B. HERO SECTION (TransferPro Inspired Visual Design)
          ============================================================== */}
      <section className="landing-hero-section">
        <div className="hero-grid-container">
          {/* Left Column: Headline & Value Proposition */}
          <div className="hero-text-column">
            {/* Small Badge */}
            <div className="hero-pill-badge">
              <Sparkles size={14} className="text-indigo-400" />
              <span>Simple. Secure. Collaborative.</span>
            </div>

            {/* Main Headline */}
            <h1 className="hero-main-heading">
              Your Files. <br />
              Your Groups. <br />
              <span className="hero-gradient-text">Everything Connected.</span>
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
                onClick={() => onNavigate("/register")}
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
                <Shield size={16} className="benefit-icon" />
                <span>Secure File Sharing</span>
              </div>
              <div className="benefit-divider" />
              <div className="benefit-item">
                <Users size={16} className="benefit-icon" />
                <span>Group Collaboration</span>
              </div>
              <div className="benefit-divider" />
              <div className="benefit-item">
                <HardDrive size={16} className="benefit-icon" />
                <span>Easy File Management</span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Product Mockup / Floating Cards */}
          <div className="hero-mockup-column">
            <div className="mockup-perspective-wrap">
              {/* Main Workspace Preview Card */}
              <div className="mockup-main-card">
                {/* Mockup Window Top Header */}
                <div className="mockup-header-bar">
                  <div className="mockup-window-controls">
                    <span className="window-dot red" />
                    <span className="window-dot yellow" />
                    <span className="window-dot green" />
                  </div>
                  <div className="mockup-group-title-pill">
                    <Folder size={14} className="text-indigo-400" />
                    <span>Computer Science – E Division</span>
                  </div>
                  <div className="mockup-members-badge">
                    <Users size={13} />
                    <span>32 members</span>
                  </div>
                </div>

                {/* Mockup Toolbar Simulation */}
                <div className="mockup-toolbar-row">
                  <div className="mockup-search-input">
                    <Search size={14} className="text-slate-400" />
                    <span>Search files in this group...</span>
                  </div>
                  <div className="mockup-filter-pill">All Types ▼</div>
                  <div className="mockup-upload-btn-pill">
                    <UploadCloud size={14} />
                    <span>Upload</span>
                  </div>
                </div>

                {/* Mockup Sample File Grid */}
                <div className="mockup-files-grid">
                  {/* File 1: PDF */}
                  <div className="mockup-file-card">
                    <div className="mockup-badge-box red">PDF</div>
                    <div className="mockup-file-meta">
                      <strong>DBMS_Notes.pdf</strong>
                      <small>2.4 MB · 10 min ago</small>
                    </div>
                  </div>

                  {/* File 2: DOCX */}
                  <div className="mockup-file-card">
                    <div className="mockup-badge-box blue">DOC</div>
                    <div className="mockup-file-meta">
                      <strong>Assignment_2.docx</strong>
                      <small>1.8 MB · 2 hrs ago</small>
                    </div>
                  </div>

                  {/* File 3: ZIP */}
                  <div className="mockup-file-card">
                    <div className="mockup-badge-box amber">ZIP</div>
                    <div className="mockup-file-meta">
                      <strong>Project_Source.zip</strong>
                      <small>14.5 MB · Yesterday</small>
                    </div>
                  </div>

                  {/* File 4: IMG */}
                  <div className="mockup-file-card">
                    <div className="mockup-badge-box purple">IMG</div>
                    <div className="mockup-file-meta">
                      <strong>System_Diagram.png</strong>
                      <small>3.1 MB · 2 days ago</small>
                    </div>
                  </div>
                </div>

                {/* Floating Widget A: Colorful Speed / Storage Gauge (TransferPro inspired) */}
                <div className="mockup-bottom-status-strip">
                  <div className="storage-status-info">
                    <div className="status-label-row">
                      <span className="status-label">Storage Usage</span>
                      <strong className="status-metric">14.2 GB / 50 GB</strong>
                    </div>
                    {/* Vibrant Gradient Progress Bar */}
                    <div className="status-gradient-bar">
                      <div className="gradient-fill" style={{ width: "38%" }} />
                    </div>
                  </div>
                  <div className="speed-pill">
                    <Zap size={14} className="text-amber-400" />
                    <span>Instant R2 Delivery</span>
                  </div>
                </div>
              </div>

              {/* Floating Widget B: Permanent Invitation Code Card */}
              <div className="mockup-floating-invite-card" onClick={handleCopyDemoCode}>
                <div className="invite-card-left">
                  <div className="invite-key-icon">
                    <Key size={15} />
                  </div>
                  <div>
                    <span className="invite-card-sub">Permanent Invite Code</span>
                    <strong className="invite-card-code">CS-E2-2026</strong>
                  </div>
                </div>
                <button type="button" className="invite-copy-btn">
                  {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedCode ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==============================================================
          C. FEATURES SECTION
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
            {/* Feature 1 */}
            <div className="feature-card">
              <div className="feature-icon-wrapper indigo">
                <Folder size={24} />
              </div>
              <h3 className="feature-card-title">Group-Based Sharing</h3>
              <p className="feature-card-text">
                Create dedicated groups and keep all lecture notes, assignments, and presentations organized in one collaborative workspace.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="feature-card">
              <div className="feature-icon-wrapper sky">
                <Key size={24} />
              </div>
              <h3 className="feature-card-title">Invite Members Easily</h3>
              <p className="feature-card-text">
                Share a unique, immutable group invitation code. Teammates and classmates can join your workspace with a single click.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="feature-card">
              <div className="feature-icon-wrapper emerald">
                <Shield size={24} />
              </div>
              <h3 className="feature-card-title">Secure File Management</h3>
              <p className="feature-card-text">
                Keep files strictly accessible only to authorized members of relevant groups. No unauthorized public leaks or open access.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="feature-card">
              <div className="feature-icon-wrapper purple">
                <Users size={24} />
              </div>
              <h3 className="feature-card-title">Member-Wise File Access</h3>
              <p className="feature-card-text">
                Explore files uploaded by individual group members. Filter a specific peer's uploads without leaving the group view.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="feature-card">
              <div className="feature-icon-wrapper amber">
                <UploadCloud size={24} />
              </div>
              <h3 className="feature-card-title">Easy Upload & Download</h3>
              <p className="feature-card-text">
                Drag-and-drop notes, archives, and slides effortlessly. Download full-resolution original files anytime with secure signed URLs.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="feature-card">
              <div className="feature-icon-wrapper rose">
                <Search size={24} />
              </div>
              <h3 className="feature-card-title">Organised File Workspace</h3>
              <p className="feature-card-text">
                Search in real-time, filter by category (PDF, DOC, PPT, ZIP, Code), sort by date or size, and toggle between grid and table views.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==============================================================
          D. HOW IT WORKS SECTION
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
            {/* Step 1 */}
            <div className="step-card">
              <div className="step-number-pill">01</div>
              <div className="step-icon-badge">
                <Users size={22} />
              </div>
              <h3 className="step-title">Create Your Account</h3>
              <p className="step-description">
                Register using your email address and password. Verify your account with a secure 6-digit confirmation code.
              </p>
            </div>

            {/* Step 2 */}
            <div className="step-card">
              <div className="step-number-pill">02</div>
              <div className="step-icon-badge">
                <Key size={22} />
              </div>
              <h3 className="step-title">Create or Join a Group</h3>
              <p className="step-description">
                Create a new workspace for your batch or study group, or enter an invitation code shared by a peer.
              </p>
            </div>

            {/* Step 3 */}
            <div className="step-card">
              <div className="step-number-pill">03</div>
              <div className="step-icon-badge">
                <Share2 size={22} />
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
          E. SECURITY SECTION
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
              <div className="spec-icon-box">
                <Lock size={20} />
              </div>
              <h4>Authenticated Access</h4>
              <p>JWT-based cryptographic tokens ensure only signed-in verified users can access workspace APIs.</p>
            </div>

            <div className="security-spec-card">
              <div className="spec-icon-box">
                <Users size={20} />
              </div>
              <h4>Group Membership Permissions</h4>
              <p>Users can only view, download, or search files from groups they are explicitly approved members of.</p>
            </div>

            <div className="security-spec-card">
              <div className="spec-icon-box">
                <HardDrive size={20} />
              </div>
              <h4>Private Cloud Storage</h4>
              <p>Files are stored in dedicated cloud buckets with secure presigned URLs that expire automatically.</p>
            </div>

            <div className="security-spec-card">
              <div className="spec-icon-box">
                <Download size={20} />
              </div>
              <h4>Controlled Downloads</h4>
              <p>Direct public bucket browsing is blocked. Every download verifies real-time user group membership.</p>
            </div>

            <div className="security-spec-card">
              <div className="spec-icon-box">
                <Shield size={20} />
              </div>
              <h4>Admin & Member Roles</h4>
              <p>Group creators have administrative control over memberships and file moderation inside their group.</p>
            </div>

            <div className="security-spec-card">
              <div className="spec-icon-box">
                <Zap size={20} />
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
                  <Folder size={20} className="text-white" />
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
