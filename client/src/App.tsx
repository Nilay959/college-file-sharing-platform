import React, { useState, useEffect, useMemo } from "react";
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getAuthToken, getUserInfo, removeAuthToken, setUserInfo, User, Group, FileItem } from "./services/api";

// Components
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

// Auth Page
import { AuthPage } from "./pages/AuthPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function FileShareApp() {
  const queryClient = useQueryClient();

  // Authentication State
  const [user, setUser] = useState<User | null>(() => getUserInfo());

  // Navigation & Selection State
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(() => {
    const match = window.location.pathname.match(/^\/groups\/([a-zA-Z0-9_-]+)$/);
    return match ? match[1] : null;
  });

  // Mobile navigation view: 'sidebar' or 'workspace'
  const [mobileView, setMobileView] = useState<"sidebar" | "workspace">(
    selectedGroupId ? "workspace" : "sidebar"
  );

  // Group Info Drawer: CLOSED by default
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);

  // Active member filter (shows only uploads by this member in the current group)
  const [activeMemberFilter, setActiveMemberFilter] = useState<{ id: string; name: string } | null>(null);

  // Modals state
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [joinGroupOpen, setJoinGroupOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Active file for Preview
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  // File to Delete modal
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);
  const [isDeletingFile, setIsDeletingFile] = useState(false);

  // Group to Delete modal
  const [isDeleteGroupModalOpen, setIsDeleteGroupModalOpen] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);

  // Sync route with browser history
  const navigateToGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    setActiveMemberFilter(null); // Reset member filter when switching groups
    setIsGroupInfoOpen(false); // Closed by default per spec
    setMobileView("workspace");
    window.history.pushState({}, "", `/groups/${groupId}`);
  };

  useEffect(() => {
    const handlePopState = () => {
      const match = window.location.pathname.match(/^\/groups\/([a-zA-Z0-9_-]+)$/);
      if (match) {
        setSelectedGroupId(match[1]);
        setMobileView("workspace");
      } else {
        setMobileView("sidebar");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Listen to 401 unauthorized
  useEffect(() => {
    const handleUnauthorized = () => {
      removeAuthToken();
      localStorage.removeItem("user");
      setUser(null);
    };
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

  // Logout handler
  const handleLogout = () => {
    removeAuthToken();
    localStorage.removeItem("user");
    setUser(null);
    queryClient.clear();
    window.history.pushState({}, "", "/login");
  };

  // 1. Fetch User Groups
  const { data: groups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: ["groups"],
    queryFn: api.getGroups,
    enabled: !!user && !!getAuthToken(),
  });

  // Auto-select first group if none selected and groups loaded
  useEffect(() => {
    if (!selectedGroupId && groups.length > 0) {
      const firstId = groups[0].id || groups[0]._id;
      setSelectedGroupId(firstId);
      window.history.replaceState({}, "", `/groups/${firstId}`);
    }
  }, [groups, selectedGroupId]);

  // Find currently selected group object
  const currentGroup = useMemo(() => {
    if (!selectedGroupId) return null;
    return groups.find((g) => (g.id || g._id) === selectedGroupId) || null;
  }, [groups, selectedGroupId]);

  // 2. Fetch Files for Selected Group
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
    enabled: !!selectedGroupId && !!user && !!getAuthToken(),
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
      // Select remaining group or null
      const remaining = groups.filter((g) => (g.id || g._id) !== selectedGroupId);
      if (remaining.length > 0) {
        navigateToGroup(remaining[0].id || remaining[0]._id);
      } else {
        setSelectedGroupId(null);
        window.history.pushState({}, "", "/");
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete group");
    } finally {
      setIsDeletingGroup(false);
    }
  };

  // If user is not authenticated, render AuthPage
  if (!user || !getAuthToken()) {
    return (
      <AuthPage
        onAuthSuccess={(authUser) => {
          setUser(authUser);
          setUserInfo(authUser);
          window.history.pushState({}, "", "/");
        }}
      />
    );
  }

  return (
    <div className="fileshare-app-root">
      <div className="fileshare-three-panel-layout">
        {/* ==============================================================
            PANEL 1: LEFT SIDEBAR (Width: 340px)
            ============================================================== */}
        <div className={`layout-panel-left ${mobileView === "workspace" ? "mobile-hidden" : ""}`}>
          <LeftSidebar
            groups={groups}
            selectedGroupId={selectedGroupId}
            onSelectGroup={navigateToGroup}
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

        {/* ==============================================================
            PANEL 2: CENTER WORKSPACE (Flexible Remaining Width)
            ============================================================== */}
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
            onClearMemberFilter={() => setActiveMemberFilter(null)}
          />
        </div>

        {/* ==============================================================
            PANEL 3: RIGHT SIDEBAR / GROUP INFO DRAWER (Width: 340-380px)
            ============================================================== */}
        {isGroupInfoOpen && (
          <div className="layout-panel-right">
            <GroupInfoDrawer
              isOpen={isGroupInfoOpen}
              onClose={() => setIsGroupInfoOpen(false)}
              group={currentGroup}
              files={files}
              currentUser={user}
              onSelectMemberFilter={(member) => setActiveMemberFilter(member)}
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

      {/* ==============================================================
          GLOBAL MODALS & DIALOGS
          ============================================================== */}
      {/* 1. Create Group Modal */}
      <CreateGroupModal
        isOpen={createGroupOpen}
        onClose={() => setCreateGroupOpen(false)}
        onCreate={async (name, desc) => {
          await createGroupMutation.mutateAsync({ name, description: desc });
        }}
      />

      {/* 2. Join Group Modal */}
      <JoinGroupModal
        isOpen={joinGroupOpen}
        onClose={() => setJoinGroupOpen(false)}
        onJoin={async (code) => {
          await joinGroupMutation.mutateAsync(code);
        }}
      />

      {/* 3. Upload File Modal */}
      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        groups={groups}
        defaultGroupId={selectedGroupId || undefined}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["group-files", selectedGroupId] });
          queryClient.invalidateQueries({ queryKey: ["groups"] });
        }}
      />

      {/* 4. Preview Modal */}
      <PreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />

      {/* 5. Delete File Confirmation Modal */}
      <DeleteModal
        isOpen={!!fileToDelete}
        title="Delete File"
        message={`Are you sure you want to permanently delete "${fileToDelete?.originalName}"? This action cannot be undone.`}
        confirmLabel="Delete File"
        onConfirm={handleDeleteFileConfirm}
        onClose={() => setFileToDelete(null)}
        loading={isDeletingFile}
      />

      {/* 6. Delete Group Confirmation Modal (Admin only, Danger Zone) */}
      <DeleteModal
        isOpen={isDeleteGroupModalOpen}
        title="Delete Group Permanently"
        message={`Are you sure you want to delete "${currentGroup?.name}"? All shared files, memberships, and records in this group will be permanently erased. This action CANNOT be reversed.`}
        confirmLabel="Delete Group"
        onConfirm={handleDeleteGroupConfirm}
        onClose={() => setIsDeleteGroupModalOpen(false)}
        loading={isDeletingGroup}
      />

      {/* 7. Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        user={user}
        onUpdateUser={(updated) => {
          setUser(updated);
          setUserInfo(updated);
        }}
      />

      {/* 8. Notifications Modal */}
      <NotificationsModal
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FileShareApp />
    </QueryClientProvider>
  );
}
