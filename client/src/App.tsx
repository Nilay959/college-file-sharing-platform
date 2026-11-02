import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getAuthToken, getUserInfo, removeAuthToken, setUserInfo, User, Group } from "./services/api";
import { useTheme } from "./utils/theme";

// Components & Layout
import { Sidebar } from "./components/Sidebar";
import { Navbar } from "./components/Navbar";
import { CreateGroupModal, JoinGroupModal, UploadModal } from "./components/Modals";

// Pages
import { AuthPage } from "./pages/AuthPage";
import { DashboardPage } from "./pages/DashboardPage";
import { GroupsPage } from "./pages/GroupsPage";
import { GroupWorkspacePage } from "./pages/GroupWorkspacePage";
import { AllFilesPage } from "./pages/AllFilesPage";
import { MyUploadsView } from "./pages/MyUploadsView";
import { SharedWithMePage } from "./pages/SharedWithMePage";
import { UserProfilePage } from "./pages/UserProfilePage";
import { SettingsPage } from "./pages/SettingsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function MainAppShell() {
  const queryClient = useQueryClient();
  const { theme, setTheme, isDark } = useTheme();

  // Authentication State
  const [user, setUser] = useState<User | null>(() => getUserInfo());

  // Routing State
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || "/dashboard";
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");

  // Global Modals State
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [joinGroupOpen, setJoinGroupOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  // Sync route with browser history
  const navigate = (path: string) => {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || "/dashboard");
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
      navigate("/auth");
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
    navigate("/auth");
  };

  // Groups Query
  const { data: groups = [] } = useQuery({
    queryKey: ["groups"],
    queryFn: api.getGroups,
    enabled: !!user && !!getAuthToken(),
  });

  // Create Group Mutation
  const createGroupMutation = useMutation({
    mutationFn: (data: { name: string; description: string }) => api.createGroup(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      navigate(`/groups/${res.group.id || res.group._id}`);
    },
  });

  // Join Group Mutation
  const joinGroupMutation = useMutation({
    mutationFn: (inviteCode: string) => api.joinGroup(inviteCode),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      navigate(`/groups/${res.group.id || res.group._id}`);
    },
  });

  // If user is not authenticated, show AuthPage
  if (!user || !getAuthToken()) {
    return (
      <AuthPage
        onAuthSuccess={(authUser) => {
          setUser(authUser);
          navigate("/dashboard");
        }}
      />
    );
  }

  // Parse path for dynamic routes: e.g. /groups/:id or /users/:id
  const matchGroup = currentPath.match(/^\/groups\/([a-zA-Z0-9_-]+)$/);
  const matchUser = currentPath.match(/^\/users\/([a-zA-Z0-9_-]+)$/);

  return (
    <div className={`app-shell ${isDark ? "dark" : ""}`}>
      {/* Fixed Left Sidebar */}
      <Sidebar
        currentPath={currentPath}
        onNavigate={navigate}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Layout Area */}
      <div className="fileshare-main-wrapper">
        {/* Top Navbar */}
        <Navbar
          user={user}
          searchQuery={globalSearch}
          onSearchChange={setGlobalSearch}
          onNavigate={navigate}
          onLogout={handleLogout}
          isDark={isDark}
          onToggleTheme={() => setTheme(isDark ? "light" : "dark")}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          onOpenUpload={() => setUploadOpen(true)}
        />

        {/* Dynamic Route View */}
        <main className="fileshare-view-content">
          {matchGroup ? (
            <GroupWorkspacePage
              groupId={matchGroup[1]}
              onBack={() => navigate("/groups")}
              onNavigateUser={(userId) => navigate(`/users/${userId}`)}
            />
          ) : matchUser ? (
            <UserProfilePage
              userId={matchUser[1]}
              onBack={() => navigate("/groups")}
              onSelectGroup={(groupId) => navigate(`/groups/${groupId}`)}
            />
          ) : currentPath === "/groups" ? (
            <GroupsPage
              onSelectGroup={(groupId) => navigate(`/groups/${groupId}`)}
              onOpenCreateGroup={() => setCreateGroupOpen(true)}
              onOpenJoinGroup={() => setJoinGroupOpen(true)}
            />
          ) : currentPath === "/files" ? (
            <AllFilesPage
              groups={groups}
              onOpenUpload={() => setUploadOpen(true)}
              onNavigateUser={(userId) => navigate(`/users/${userId}`)}
            />
          ) : currentPath === "/my-uploads" ? (
            <MyUploadsView
              groups={groups}
              onOpenUpload={() => setUploadOpen(true)}
              onNavigateUser={(userId) => navigate(`/users/${userId}`)}
            />
          ) : currentPath === "/shared-with-me" ? (
            <SharedWithMePage
              groups={groups}
              onNavigateUser={(userId) => navigate(`/users/${userId}`)}
            />
          ) : currentPath === "/profile" || currentPath === "/settings" ? (
            <SettingsPage
              user={user}
              onUpdateUser={(updated) => {
                setUser(updated);
                setUserInfo(updated);
              }}
              theme={theme}
              onSetTheme={(t) => setTheme(t)}
            />
          ) : (
            <DashboardPage
              user={user}
              onNavigate={navigate}
              onOpenCreateGroup={() => setCreateGroupOpen(true)}
              onOpenJoinGroup={() => setJoinGroupOpen(true)}
              onOpenUpload={() => setUploadOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Global Modals */}
      <CreateGroupModal
        isOpen={createGroupOpen}
        onClose={() => setCreateGroupOpen(false)}
        onCreate={(name, description) => createGroupMutation.mutateAsync({ name, description })}
      />

      <JoinGroupModal
        isOpen={joinGroupOpen}
        onClose={() => setJoinGroupOpen(false)}
        onJoin={(code) => joinGroupMutation.mutateAsync(code)}
      />

      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        groups={groups}
        defaultGroupId={matchGroup ? matchGroup[1] : groups[0]?.id}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
          queryClient.invalidateQueries({ queryKey: ["all-files"] });
          queryClient.invalidateQueries({ queryKey: ["my-uploads"] });
          queryClient.invalidateQueries({ queryKey: ["shared-with-me"] });
          if (matchGroup) {
            queryClient.invalidateQueries({ queryKey: ["group-files", matchGroup[1]] });
            queryClient.invalidateQueries({ queryKey: ["group", matchGroup[1]] });
          }
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainAppShell />
    </QueryClientProvider>
  );
}
