// Base API URL configuration with VITE_API_URL environment variable support
const RAW_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const CLEAN_API_URL = RAW_API_URL.replace(/\/+$/, '');
const API_URL = CLEAN_API_URL.endsWith('/api') ? CLEAN_API_URL : `${CLEAN_API_URL}/api`;

export interface User {
  id: string;
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  isVerified?: boolean;
  createdAt?: string;
}

export interface Group {
  id: string;
  _id: string;
  name: string;
  description?: string;
  inviteCode: string;
  createdBy?: any;
  createdAt?: string;
  role?: 'admin' | 'member';
  memberCount?: number;
  fileCount?: number;
}

export interface GroupMemberItem {
  _id: string;
  memberId: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'member';
  joinedAt: string;
}

export interface FileItem {
  id: string;
  _id: string;
  originalName: string;
  fileSize: number;
  size: string;
  mimeType: string;
  uploadedBy: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  groupId: {
    _id: string;
    name: string;
    inviteCode: string;
  };
  storageKey?: string;
  createdAt: string;
  canDelete?: boolean;
}

export interface ActivityItem {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  groupId: {
    _id: string;
    name: string;
    inviteCode?: string;
  };
  fileId?: {
    _id: string;
    originalName: string;
    mimeType: string;
    fileSize: number;
  } | null;
  action: 'created_group' | 'joined_group' | 'uploaded_file' | 'deleted_file' | 'removed_member';
  details?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalGroups: number;
  totalMembers: number;
  totalFiles: number;
  recentActivity: ActivityItem[];
}

export interface AdminMetrics {
  overview: {
    totalUsers: number;
    activeUsersCount: number;
    deactivatedUsersCount: number;
    verifiedUsersCount: number;
    adminUsersCount: number;
    totalGroups: number;
    totalFiles: number;
    totalStorageBytes: number;
    formattedTotalStorage: string;
    avgFileSizeBytes: number;
    formattedAvgFileSize: string;
  };
  engagement: {
    dau: number;
    wau: number;
    mau: number;
    engagementRatio: number;
  };
  storageBreakdown: {
    category: string;
    count: number;
    bytes: number;
    formattedSize: string;
    percentage: number;
  }[];
  activityTrend: {
    date: string;
    uploadsCount: number;
    uploadBytes: number;
    formattedUploadBytes: string;
    activityCount: number;
    activeUsers: number;
  }[];
  recentActivities: {
    _id: string;
    action: string;
    details: string;
    createdAt: string;
    userId?: {
      _id: string;
      name: string;
      email: string;
      avatar?: string;
      role: string;
    };
    groupId?: {
      _id: string;
      name: string;
      inviteCode: string;
    };
    fileId?: {
      _id: string;
      originalName: string;
      fileSize: number;
    };
  }[];
}

export interface AdminUserItem {
  id: string;
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  avatar?: string;
  isActive: boolean;
  isVerified: boolean;
  lastLogin?: string;
  createdAt: string;
  groupsCount: number;
  filesCount: number;
  storageBytes: number;
  formattedStorage: string;
}

export interface AdminGroupItem {
  id: string;
  _id: string;
  name: string;
  description: string;
  inviteCode: string;
  createdAt: string;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  memberCount: number;
  fileCount: number;
  totalBytes: number;
  formattedStorage: string;
}

export interface AdminFileItem {
  id: string;
  _id: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  formattedSize: string;
  storageKey: string;
  fileUrl?: string;
  createdAt: string;
  category: string;
  uploadedBy?: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  group?: {
    _id: string;
    name: string;
    inviteCode: string;
  };
}

export interface AdminStorageTelemetry {
  totalBytes: number;
  formattedTotalStorage: string;
  totalFiles: number;
  categoryBreakdown: {
    category: string;
    count: number;
    bytes: number;
    formattedSize: string;
    percentage: number;
  }[];
  largestFiles: {
    id: string;
    name: string;
    category: string;
    fileSize: number;
    formattedSize: string;
    groupName: string;
    uploaderName: string;
    createdAt: string;
  }[];
  topGroups: {
    id: string;
    name: string;
    inviteCode: string;
    bytes: number;
    fileCount: number;
    formattedSize: string;
    percentage: number;
  }[];
  topUsers: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    bytes: number;
    fileCount: number;
    formattedSize: string;
    percentage: number;
  }[];
}

export const getAuthToken = () => localStorage.getItem('token');
export const setAuthToken = (token: string) => localStorage.setItem('token', token);
export const removeAuthToken = () => localStorage.removeItem('token');
export const getUserInfo = (): User | null => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};
export const setUserInfo = (user: any) => localStorage.setItem('user', JSON.stringify(user));

const authHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function getError(res: Response): Promise<string> {
  if (res.status === 401) {
    removeAuthToken();
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth:unauthorized'));
  }
  try {
    const data = await res.json();
    return data.message || JSON.stringify(data);
  } catch {
    return await res.text();
  }
}

const getHeaders = () => ({ ...authHeaders(), 'Content-Type': 'application/json' });

export const api = {
  // Authentication
  login: async (credentials: { email: string; password: string }): Promise<{ token: string; user: User; requiresVerification?: boolean; email?: string; devOtp?: string; message?: string }> => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!res.ok) {
      const errorText = await getError(res);
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.requiresVerification) {
          return parsed;
        }
      } catch {}
      throw new Error(errorText);
    }
    return res.json();
  },

  register: async (userData: { name: string; email: string; password: string; avatar?: string }): Promise<{ message: string; email: string; requiresVerification: boolean; devOtp?: string; token?: string; user?: User }> => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },

  verifyRegistration: async (data: { email: string; otp: string }): Promise<{ token: string; user: User; message: string }> => {
    const res = await fetch(`${API_URL}/auth/verify-registration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },

  resendOtp: async (data: { email: string; purpose?: string }): Promise<{ message: string; devOtp?: string }> => {
    const res = await fetch(`${API_URL}/auth/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },

  forgotPassword: async (data: { email: string }): Promise<{ message: string; email: string; devOtp?: string }> => {
    const res = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },

  resetPassword: async (data: { email: string; otp: string; newPassword: string }): Promise<{ message: string }> => {
    const res = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },

  getMe: async (): Promise<User> => {
    const res = await fetch(`${API_URL}/auth/me`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },

  updateProfile: async (data: { name?: string; avatar?: string; password?: string }): Promise<{ token: string; user: User }> => {
    const res = await fetch(`${API_URL}/auth/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },

  // Groups
  getGroups: async (): Promise<Group[]> => {
    const res = await fetch(`${API_URL}/groups`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },

  getGroup: async (groupId: string): Promise<Group> => {
    const res = await fetch(`${API_URL}/groups/${groupId}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },

  createGroup: async (data: { name: string; description?: string }): Promise<{ group: Group }> => {
    const res = await fetch(`${API_URL}/groups`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },

  joinGroup: async (inviteCode: string): Promise<{ message: string; group: Group }> => {
    const res = await fetch(`${API_URL}/groups/join`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ inviteCode }),
    });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },

  getGroupMembers: async (groupId: string): Promise<GroupMemberItem[]> => {
    const res = await fetch(`${API_URL}/groups/${groupId}/members`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },

  removeGroupMember: async (groupId: string, userId: string): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_URL}/groups/${groupId}/members/${userId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },

  updateGroup: async (groupId: string, data: { name?: string; description?: string }): Promise<{ group: Group }> => {
    const res = await fetch(`${API_URL}/groups/${groupId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },

  deleteGroup: async (groupId: string): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_URL}/groups/${groupId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },

  getGroupActivity: async (groupId: string): Promise<ActivityItem[]> => {
    const res = await fetch(`${API_URL}/groups/${groupId}/activity`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },

  // Files
  uploadFile: async (groupId: string, file: File): Promise<{ message: string; file: FileItem }> => {
    const formData = new FormData();
    formData.append('groupId', groupId);
    formData.append('file', file);

    const res = await fetch(`${API_URL}/files/upload`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },

  getGroupFiles: async (groupId: string, params?: { q?: string; type?: string; sort?: string; uploaderId?: string }): Promise<FileItem[]> => {
    const query = new URLSearchParams();
    if (params?.q) query.append('q', params.q);
    if (params?.type && params.type !== 'all') query.append('type', params.type);
    if (params?.sort) query.append('sort', params.sort);
    if (params?.uploaderId) query.append('uploaderId', params.uploaderId);

    const res = await fetch(`${API_URL}/files/group/${groupId}?${query.toString()}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },

  getAllFiles: async (params?: { q?: string; type?: string; sort?: string; groupId?: string }): Promise<FileItem[]> => {
    const query = new URLSearchParams();
    if (params?.q) query.append('q', params.q);
    if (params?.type && params.type !== 'all') query.append('type', params.type);
    if (params?.sort) query.append('sort', params.sort);
    if (params?.groupId && params.groupId !== 'all') query.append('groupId', params.groupId);

    const res = await fetch(`${API_URL}/files?${query.toString()}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },

  getMyUploads: async (params?: { q?: string; type?: string; sort?: string; groupId?: string }): Promise<FileItem[]> => {
    const query = new URLSearchParams();
    if (params?.q) query.append('q', params.q);
    if (params?.type && params.type !== 'all') query.append('type', params.type);
    if (params?.sort) query.append('sort', params.sort);
    if (params?.groupId && params.groupId !== 'all') query.append('groupId', params.groupId);

    const res = await fetch(`${API_URL}/files/my-uploads?${query.toString()}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },

  getSharedWithMe: async (params?: { q?: string; type?: string; sort?: string; groupId?: string }): Promise<FileItem[]> => {
    const query = new URLSearchParams();
    if (params?.q) query.append('q', params.q);
    if (params?.type && params.type !== 'all') query.append('type', params.type);
    if (params?.sort) query.append('sort', params.sort);
    if (params?.groupId && params.groupId !== 'all') query.append('groupId', params.groupId);

    const res = await fetch(`${API_URL}/files/shared-with-me?${query.toString()}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },

  deleteFile: async (fileId: string): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_URL}/files/${fileId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },

  getDownloadUrl: (fileId: string): string => {
    return `${API_URL}/files/${fileId}/download?token=${getAuthToken()}&redirect=true`;
  },

  getPreview: async (fileId: string): Promise<{ previewUrl: string; file: FileItem }> => {
    const res = await fetch(`${API_URL}/files/${fileId}/preview`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },

  // Dashboard Overview
  getDashboard: async (): Promise<DashboardStats> => {
    const res = await fetch(`${API_URL}/dashboard`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },

  // User Profile
  getUserProfile: async (userId: string): Promise<{ user: User; commonGroups: Group[]; files: FileItem[]; isSelf: boolean }> => {
    const res = await fetch(`${API_URL}/users/${userId}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },

  // ==============================================================
  // WEBSITE PLATFORM ADMINISTRATOR ENDPOINTS
  // ==============================================================
  getAdminMetrics: async (): Promise<AdminMetrics> => {
    const res = await fetch(`${API_URL}/admin/metrics`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },

  getAdminUsers: async (params?: { search?: string; status?: string; role?: string }): Promise<AdminUserItem[]> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status && params.status !== 'all') query.append('status', params.status);
    if (params?.role && params.role !== 'all') query.append('role', params.role);

    const res = await fetch(`${API_URL}/admin/users?${query.toString()}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },

  updateAdminUserStatus: async (userId: string, isActive: boolean): Promise<{ message: string; user: any }> => {
    const res = await fetch(`${API_URL}/admin/users/${userId}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ isActive }),
    });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },

  updateAdminUserRole: async (userId: string, role: 'user' | 'admin'): Promise<{ message: string; user: any }> => {
    const res = await fetch(`${API_URL}/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ role }),
    });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },

  deleteAdminUser: async (userId: string): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_URL}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },

  getAdminGroups: async (params?: { search?: string }): Promise<AdminGroupItem[]> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);

    const res = await fetch(`${API_URL}/admin/groups?${query.toString()}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },

  deleteAdminGroup: async (groupId: string): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_URL}/admin/groups/${groupId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },

  getAdminFiles: async (params?: { search?: string; type?: string; sort?: string }): Promise<AdminFileItem[]> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.type && params.type !== 'all') query.append('type', params.type);
    if (params?.sort) query.append('sort', params.sort);

    const res = await fetch(`${API_URL}/admin/files?${query.toString()}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },

  deleteAdminFile: async (fileId: string): Promise<{ success: boolean; message: string }> => {
    const res = await fetch(`${API_URL}/admin/files/${fileId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },

  getAdminStorage: async (): Promise<AdminStorageTelemetry> => {
    const res = await fetch(`${API_URL}/admin/storage`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },
};
