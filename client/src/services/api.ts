const API_URL = 'http://localhost:5000/api';

export const getAuthToken = () => localStorage.getItem('token');
export const setAuthToken = (token: string) => localStorage.setItem('token', token);
export const removeAuthToken = () => localStorage.removeItem('token');
export const getUserInfo = () => JSON.parse(localStorage.getItem('user') || 'null');
export const setUserInfo = (user: any) => localStorage.setItem('user', JSON.stringify(user));

const authHeaders = (): any => {
  const token = getAuthToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};


async function getError(res: Response) {
  try {
    const data = await res.json();
    return data.message || JSON.stringify(data);
  } catch (e) {
    return await res.text();
  }
}

const getHeaders = () => ({ ...authHeaders(), "Content-Type": "application/json" });
export const api = {
  // Admin Endpoints
  getAdminStats: async () => {
    const res = await fetch(`${API_URL}/admin/dashboard`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  getSubjectsAdmin: async () => {
    const res = await fetch(`${API_URL}/admin/subjects`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  createSubject: async (data: any) => {
    const res = await fetch(`${API_URL}/admin/subjects`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  updateSubject: async (id: string, data: any) => {
    const res = await fetch(`${API_URL}/admin/subjects/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  deleteSubject: async (id: string) => {
    const res = await fetch(`${API_URL}/admin/subjects/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  deleteHierarchy: async (id: string) => {
    const res = await fetch(`${API_URL}/admin/hierarchy/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  createHierarchy: async (data: any) => {
    const res = await fetch(`${API_URL}/admin/hierarchy`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  updateHierarchy: async (id: string, data: any) => {
    const res = await fetch(`${API_URL}/admin/hierarchy/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  getUsers: async () => {
    const res = await fetch(`${API_URL}/admin/users`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  deleteUser: async (id: string) => {
    const res = await fetch(`${API_URL}/admin/users/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },
  updateUserStatus: async (id: string, isActive: boolean) => {
    const res = await fetch(`${API_URL}/admin/users/${id}/status`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify({ isActive }) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  getAdminFiles: async () => {
    const res = await fetch(`${API_URL}/admin/files`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  deleteFileAdmin: async (id: string) => {
    const res = await fetch(`${API_URL}/admin/files/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  getDomains: async () => {
    const res = await fetch(`${API_URL}/admin/domains`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  createDomain: async (data: any) => {
    const res = await fetch(`${API_URL}/admin/domains`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  deleteDomain: async (id: string) => {
    const res = await fetch(`${API_URL}/admin/domains/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  getPublicSubjects: async () => {
    const res = await fetch(`${API_URL}/subjects`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  getMe: async () => {
    const res = await fetch(`${API_URL}/auth/me`, { headers: getHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getHierarchy: async () => {
    const res = await fetch(`${API_URL}/hierarchy`);
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },


  login: async (credentials: any) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },
  sendOtp: async (email: string) => {
    const res = await fetch(`${API_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) throw new Error((await res.json()).message);
    return res.json();
  },
  register: async (userData: any) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },
  getFiles: async (spaceId: string, subjectId: string, search: string) => {
    const query = new URLSearchParams();
    if (subjectId) query.append('subjectId', subjectId);
    if (search) query.append('search', search);
    
    const res = await fetch(`${API_URL}/files/${spaceId}?${query.toString()}`, {
      headers: { ...authHeaders() }
    });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },
  uploadFile: async (spaceId: string, subjectId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const res = await fetch(`${API_URL}/files/${spaceId}/${subjectId}`, {
      method: 'POST',
      headers: { ...authHeaders() },
      body: formData
    });
    if (!res.ok) throw new Error(await getError(res));
    return res.json();
  },
  getDownloadUrl: (fileId: string) => {
    return `${API_URL}/files/${fileId}/download?token=${getAuthToken()}`;
  }
};
