import React, { useState, useEffect, useMemo, useCallback } from "react";
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getAuthToken, getUserInfo, removeAuthToken, setUserInfo, User, Group, FileItem } from "./services/api";

// Public Pages
import { LandingPage } from "./pages/LandingPage";
import { AuthPage } from "./pages/AuthPage";
import { NotFoundPage } from "./pages/NotFoundPage";

// Authenticated Application Components
import { LeftSidebar } from "./components/LeftSidebar";
import { GroupWorkspace } from "./components/GroupWorkspace";
import { GroupInfoDrawer } from "./components/GroupInfoDrawer";
import {
  CreateGroupModal,
  JoinGroupModal,
  UploadModal,
  PreviewModal,
  DeleteModal,
  SettingsModal,
  NotificationsModal,
} from "./components/Modals";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function AppContent() {
  const queryClient = useQueryClient();

  // Authentication State
  const [user, setUser] = useState<User | null>(() => getUserInfo());
  const isAuthenticated = Boolean(user && getAuthToken());

  // Routing State
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || "/");

  // Navigation helper
  const navigate = useCallback((path: string, replace = false) => {
    if (replace) {
      window.history.replaceState({}, "", path);
    } else {
      window.history.pushState({}, "", path);
    }
    setCurrentPath(path);
  }, []);

  // Listen to browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || "/");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Listen to 401 unauthorized events
  useEffect(() => {
    const handleUnauthorized = () => {
      removeAuthToken();
      localStorage.removeItem("user");
      setUser(null);
      navigate("/login");
    };
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, [navigate]);

  // Logout handler
  const handleLogout = () => {
    removeAuthToken();
    localStorage.removeItem("user");
    setUser(null);
    queryClient.clear();
    navigate("/login");
  };

  // Auth Success Handler
  const handleAuthSuccess = (authUser: User) => {
    setUser(authUser);
    setUserInfo(authUser);

    // Check if user was trying to access a protected URL before being redirected to login
    const savedRedirect = sessionStorage.getItem("redirect_after_login");
    if (savedRedirect && savedRedirect.startsWith("/app")) {
      sessionStorage.removeItem("redirect_after_login");
      navigate(savedRedirect);
    } else {
      navigate("/app");
    }
  };

  // ==============================================================
  // PROTECTED WORKSPACE STATE & LOGIC
  // ==============================================================
  // Parse active group ID from URL: /app/groups/:groupId
  const groupRouteMatch = currentPath.match(/^\/app\/groups\/([a-zA-Z0-9_-]+)(?:\/members\/([a-zA-Z0-9_-]+))?/);
  const urlGroupId = groupRouteMatch ? groupRouteMatch[1] : null;
  const urlMemberId = groupRouteMatch ? groupRouteMatch[2] : null;

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(urlGroupId);
  const [mobileView, setMobileView] = useState<"sidebar" | "workspace">(urlGroupId ? "workspace" : "sidebar");
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [activeMemberFilter, setActiveMemberFilter] = useState<{ id: string; name: string } | null>(null);

  // Modals state
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [joinGroupOpen, setJoinGroupOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Active file preview & delete modals
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const [isDeleteGroupModalOpen, setIsDeleteGroupModalOpen] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);

  // Synchronize URL with selected group when on /app
  const navigateToGroup = (groupId: string, memberId?: string) => {
    setSelectedGroupId(groupId);
    setIsGroupInfoOpen(false);
    setMobileView("workspace");

    if (memberId) {
      navigate(`/app/groups/${groupId}/members/${memberId}`);
    } else {
      setActiveMemberFilter(null);
      navigate(`/app/groups/${groupId}`);
    }
  };

  // Sync selected group from URL
  useEffect(() => {
    if (urlGroupId) {
      if (urlGroupId !== selectedGroupId) {
        setSelectedGroupId(urlGroupId);
        setMobileView("workspace");
      }
    } else {
      setSelectedGroupId(null);
      setMobileView("sidebar");
    }
  }, [urlGroupId]);

  // Fetch User Groups (Only when authenticated)
  const { data: groups = [] } = useQuery({
    queryKey: ["groups"],
    queryFn: api.getGroups,
    enabled: isAuthenticated,
  });

  const currentGroup = useMemo(() => {
    if (!selectedGroupId) return null;
    return groups.find((g) => (g.id || g._id) === selectedGroupId) || null;
  }, [groups, selectedGroupId]);

  // Fetch Files for Selected Group
  const {
    data: files = [],
    isLoading: isLoadingFiles,
    refetch: refetchFiles,
  } = useQuery({
    queryKey: ["group-files", selectedGroupId, activeMemberFilter?.id],
    queryFn: () => {
      if (!selectedGroupId) return Promise.resolve([]);
      return api.getGroupFiles(selectedGroupId, {
        uploaderId: activeMemberFilter?.id,
      });
    },
    enabled: Boolean(isAuthenticated && selectedGroupId),
  });

  // Create Group Mutation
  const createGroupMutation = useMutation({
    mutationFn: (data: { name: string; description: string }) => api.createGroup(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      const newGroupId = res.group.id || res.group._id;
      navigateToGroup(newGroupId);
    },
  });

  // Join Group Mutation
  const joinGroupMutation = useMutation({
    mutationFn: (inviteCode: string) => api.joinGroup(inviteCode),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      const joinedGroupId = res.group.id || res.group._id;
      navigateToGroup(joinedGroupId);
    },
  });

  // Delete File Action
  const handleDeleteFileConfirm = async () => {
    if (!fileToDelete) return;
    setIsDeletingFile(true);
    try {
      await api.deleteFile(fileToDelete.id || fileToDelete._id);
      queryClient.invalidateQueries({ queryKey: ["group-files", selectedGroupId] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setFileToDelete(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete file");
    } finally {
      setIsDeletingFile(false);
    }
  };

  // Delete Group Action
  const handleDeleteGroupConfirm = async () => {
    if (!selectedGroupId) return;
    setIsDeletingGroup(true);
    try {
      await api.deleteGroup(selectedGroupId);
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setIsDeleteGroupModalOpen(false);
      setIsGroupInfoOpen(false);
      const remaining = groups.filter((g) => (g.id || g._id) !== selectedGroupId);
      if (remaining.length > 0) {
        navigateToGroup(remaining[0].id || remaining[0]._id);
      } else {
        setSelectedGroupId(null);
        navigate("/app");
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete group");
    } finally {
      setIsDeletingGroup(false);
    }
  };

  // ==============================================================
  // ROUTE RESOLVER & GUARDS
  // ==============================================================
  const normalizedPath = currentPath.toLowerCase().replace(/\/+$/, "") || "/";

  // 1. PUBLIC ROUTE: Landing Page ('/')
  if (normalizedPath === "/") {
    return (
      <LandingPage
        onNavigate={navigate}
        isAuthenticated={isAuthenticated}
      />
    );
  }

  // 2. PUBLIC AUTH ROUTES: '/login', '/register', '/verify', '/forgot-password', '/reset-password'
  const isAuthRoute =
    normalizedPath === "/login" ||
    normalizedPath === "/register" ||
    normalizedPath === "/verify" ||
    normalizedPath === "/forgot-password" ||
    normalizedPath === "/reset-password";

  if (isAuthRoute) {
    // If user is already authenticated, redirect them to /app
    if (isAuthenticated) {
      navigate("/app", true);
      return null;
    }
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  // 3. PROTECTED ROUTES: Starts with '/app'
  if (normalizedPath.startsWith("/app")) {
    // If not authenticated, save destination and redirect to /login
    if (!isAuthenticated) {
      sessionStorage.setItem("redirect_after_login", currentPath);
      navigate("/login", true);
      return null;
    }

    // Render Authenticated FileShare Application (WhatsApp Web 3-Panel Workspace)
    return (
      <div className="fileshare-app-root">
        <div className="fileshare-three-panel-layout">
          {/* PANEL 1: LEFT SIDEBAR (Width: 340px) */}
          <div className={`layout-panel-left ${mobileView === "workspace" ? "mobile-hidden" : ""}`}>
            <LeftSidebar
              groups={groups}
              selectedGroupId={selectedGroupId}
              onSelectGroup={(groupId) => navigateToGroup(groupId)}
              onOpenCreateGroup={() => setCreateGroupOpen(true)}
              onOpenJoinGroup={() => setJoinGroupOpen(true)}
              onOpenSettings={() => setSettingsOpen(true)}
              onOpenNotifications={() => setNotificationsOpen(true)}
              user={user}
              onLogout={handleLogout}
              onSelectFileFromGlobalSearch={(file) => {
                if (file.groupId?._id) {
                  navigateToGroup(file.groupId._id);
                }
                setPreviewFile(file);
              }}
            />
          </div>

          {/* PANEL 2: CENTER WORKSPACE (Flexible width) */}
          <div className={`layout-panel-center ${mobileView === "sidebar" ? "mobile-hidden" : ""}`}>
            <GroupWorkspace
              group={currentGroup}
              files={files}
              isLoadingFiles={isLoadingFiles}
              onUploadClick={() => setUploadOpen(true)}
              onPreviewFile={(f) => setPreviewFile(f)}
              onDeleteFile={(f) => setFileToDelete(f)}
              onOpenGroupInfo={() => setIsGroupInfoOpen((v) => !v)}
              isGroupInfoOpen={isGroupInfoOpen}
              onBackToSidebar={() => setMobileView("sidebar")}
              activeMemberFilter={activeMemberFilter}
              onClearMemberFilter={() => {
                setActiveMemberFilter(null);
                if (selectedGroupId) navigate(`/app/groups/${selectedGroupId}`);
              }}
            />
          </div>

          {/* PANEL 3: RIGHT SIDEBAR / GROUP INFO DRAWER (Width: 340-380px) */}
          {isGroupInfoOpen && (
            <div className="layout-panel-right">
              <GroupInfoDrawer
                isOpen={isGroupInfoOpen}
                onClose={() => setIsGroupInfoOpen(false)}
                group={currentGroup}
                files={files}
                currentUser={user}
                onSelectMemberFilter={(member) => {
                  setActiveMemberFilter(member);
                  if (selectedGroupId) {
                    navigateToGroup(selectedGroupId, member.id);
                  }
                }}
                onDeleteGroupClick={() => setIsDeleteGroupModalOpen(true)}
                onGroupUpdated={() => {
                  queryClient.invalidateQueries({ queryKey: ["groups"] });
                  refetchFiles();
                }}
                onPreviewFile={(f) => setPreviewFile(f)}
              />
            </div>
          )}
        </div>

        {/* Global Modals for Protected Workspace */}
        <CreateGroupModal
          isOpen={createGroupOpen}
          onClose={() => setCreateGroupOpen(false)}
          onCreate={async (name, desc) => {
            await createGroupMutation.mutateAsync({ name, description: desc });
          }}
        />

        <JoinGroupModal
          isOpen={joinGroupOpen}
          onClose={() => setJoinGroupOpen(false)}
          onJoin={async (code) => {
            await joinGroupMutation.mutateAsync(code);
          }}
        />

        <UploadModal
          isOpen={uploadOpen}
          onClose={() => setUploadOpen(false)}
          groups={groups}
          defaultGroupId={selectedGroupId || undefined}
          targetGroup={currentGroup}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["group-files"] });
            queryClient.invalidateQueries({ queryKey: ["groups"] });
            refetchFiles();
          }}
        />

        <PreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />

        <DeleteModal
          isOpen={Boolean(fileToDelete)}
          title="Delete File"
          message={`Are you sure you want to permanently delete "${fileToDelete?.originalName}"? This action cannot be undone.`}
          confirmLabel="Delete File"
          onConfirm={handleDeleteFileConfirm}
          onClose={() => setFileToDelete(null)}
          loading={isDeletingFile}
        />

        <DeleteModal
          isOpen={isDeleteGroupModalOpen}
          title="Delete Group Permanently"
          message={`Are you sure you want to delete "${currentGroup?.name}"? All shared files, memberships, and records in this group will be permanently erased. This action CANNOT be reversed.`}
          confirmLabel="Delete Group"
          onConfirm={handleDeleteGroupConfirm}
          onClose={() => setIsDeleteGroupModalOpen(false)}
          loading={isDeletingGroup}
        />

        <SettingsModal
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          user={user}
          onUpdateUser={(updated) => {
            setUser(updated);
            setUserInfo(updated);
          }}
        />

        <NotificationsModal
          isOpen={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
        />
      </div>
    );
  }

  // 4. INVALID ROUTE: 404 Page Not Found
  return (
    <NotFoundPage
      onNavigate={navigate}
      isAuthenticated={isAuthenticated}
    />
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
