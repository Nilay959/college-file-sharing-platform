import AdminApp from "./admin/AdminApp";
import { useState, useMemo, useRef, useEffect } from "react";
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getAuthToken, getUserInfo, setAuthToken, setUserInfo, removeAuthToken } from "./services/api";

const queryClient = new QueryClient();

function useDebounce(value: any, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}







function IconFile() { return <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /></svg>; }
function IconUpload() { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17,8 12,3 7,8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>; }
function IconDownload() { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7,10 12,15 17,10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>; }
function IconX() { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>; }
function IconSearch() { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>; }
function IconEye() { return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>; }

function LoginPage({ onLogin, onRegister }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.login({ email, password });
      setAuthToken(data.token);
      setUserInfo(data.user);
      onLogin();
    } catch (e: any) {
      setError("Login failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50 font-sans">
      <div className="hidden lg:flex lg:w-[420px] bg-indigo-600 flex-col justify-between p-10 shrink-0">
        <div><span className="text-white font-bold text-lg tracking-tight">COLLEGE FILES</span></div>
        <div className="space-y-6">
          <h1 className="text-white text-3xl font-semibold leading-tight">Access your academic resources in seconds.</h1>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-6 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Sign in</h2>
          
          {error && <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-md text-sm font-medium">{error}</div>}
          
          <div className="space-y-4">
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500 transition shadow-sm" />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500 transition shadow-sm" />
            <button onClick={handleLogin} disabled={loading || !email || !password} className="w-full py-2.5 text-sm font-semibold text-white rounded-lg bg-indigo-600 disabled:opacity-50 hover:bg-indigo-700 transition shadow-sm mt-2">{loading ? 'Signing in...' : 'Sign in'}</button>
          </div>
          <p className="text-sm text-center text-gray-500 pt-2">New student? <button onClick={onRegister} className="text-indigo-600 font-semibold hover:underline">Create account</button></p>
        </div>
      </div>
    </div>
  );
}

function RegisterPage({ onBack, onDone }: any) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState("");
  const [division, setDivision] = useState("");
  const [batch, setBatch] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { data: hierarchy = [] } = useQuery({ queryKey: ['hierarchy'], queryFn: api.getHierarchy });

  const departments = hierarchy.filter((h: any) => h.type === "department");
  const deptObj = departments.find((d: any) => d.value === department);
  const semesters = deptObj ? hierarchy.filter((h: any) => h.type === "semester" && h.parentId === deptObj._id) : [];
  const semObj = semesters.find((s: any) => s.value === semester);
  const divisions = semObj ? hierarchy.filter((h: any) => h.type === "division" && h.parentId === semObj._id) : [];
  const divObj = divisions.find((d: any) => d.value === division);
  const batches = divObj ? hierarchy.filter((h: any) => h.type === "batch" && h.parentId === divObj._id) : [];

  const handleRegister = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await api.register({ name, email, password, rollNo, department, semester, division, batch });
      setAuthToken(data.token);
      setUserInfo(data.user);
      onDone();
    } catch (e: any) { setError("Registration failed: " + e.message); }
    finally { setLoading(false); }
  };

  const isFormValid = name && email && password && rollNo && department && semester && division && batch;

  return (
    <div className="min-h-screen flex bg-gray-50 font-sans py-12 px-6 overflow-y-auto">
      <div className="w-full max-w-xl mx-auto space-y-6 bg-white p-8 rounded-xl shadow-sm border border-gray-100 relative">
        
        <button type="button" onClick={onBack} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 font-medium transition">← Back to Login</button>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Create your account</h2>
          <p className="text-sm text-gray-500 mt-1.5">Please fill out all the information below.</p>
        </div>
        
        {error && <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-md text-sm font-medium">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-700 border-b pb-2">Basic Information</h3>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Full Name</label>
              <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition shadow-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">College Email</label>
              <input type="email" placeholder="student@college.edu" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition shadow-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Password</label>
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition shadow-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Roll Number</label>
              <input type="text" placeholder="Roll No" value={rollNo} onChange={e => setRollNo(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition shadow-sm" />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-700 border-b pb-2">Academic Information</h3>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Department</label>
              <select value={department} onChange={e => { setDepartment(e.target.value); setSemester(""); setDivision(""); setBatch(""); }} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-sm outline-none focus:border-indigo-500 transition shadow-sm">
                <option value="">Select Department</option>
                {departments.map((d: any) => <option key={d._id} value={d.value}>{d.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Semester</label>
              <select value={semester} onChange={e => { setSemester(e.target.value); setDivision(""); setBatch(""); }} disabled={!department} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-sm outline-none focus:border-indigo-500 transition shadow-sm disabled:opacity-50 disabled:bg-gray-50">
                <option value="">Select Semester</option>
                {semesters.map((s: any) => <option key={s._id} value={s.value}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Division</label>
              <select value={division} onChange={e => { setDivision(e.target.value); setBatch(""); }} disabled={!semester} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-sm outline-none focus:border-indigo-500 transition shadow-sm disabled:opacity-50 disabled:bg-gray-50">
                <option value="">Select Division</option>
                {divisions.map((d: any) => <option key={d._id} value={d.value}>{d.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Batch</label>
              <select value={batch} onChange={e => setBatch(e.target.value)} disabled={!division} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white text-sm outline-none focus:border-indigo-500 transition shadow-sm disabled:opacity-50 disabled:bg-gray-50">
                <option value="">Select Batch</option>
                {batches.map((b: any) => <option key={b._id} value={b.value}>{b.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="pt-4 mt-6 border-t">
          <button type="button" onClick={handleRegister} disabled={!isFormValid || loading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 transition text-white rounded-lg font-medium disabled:opacity-50 mt-2 shadow-sm text-sm">
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </div>

      </div>
    </div>
  );
}
function UploadModal({ space, subject, SUBJECTS, onClose }: any) {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [selectedSubject, setSelectedSubject] = useState(subject === "all" ? "" : subject);
  const [progress, setProgress] = useState<any>(null);
  const [error, setError] = useState("");
  
  const mutation = useMutation({
    mutationFn: (file: File) => api.uploadFile(space, selectedSubject, file),
    onSuccess: () => {
      setProgress(100);
      queryClient.invalidateQueries({ queryKey: ['files', space] });
      setTimeout(onClose, 500);
    },
    onError: (e: any) => { setError("Upload failed: " + e.message); setProgress(null); }
  });

  const uploadFiles = () => {
    if (selectedFile && selectedSubject) {
      setProgress(0);
      mutation.mutate(selectedFile);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl p-6 space-y-4 w-96 shadow-2xl">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-lg text-gray-900">Upload File</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><IconX /></button>
        </div>
        {error && <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded text-sm">{error}</div>}
        
        {subject === "all" && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Select Subject</label>
            <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-indigo-500">
              <option value="">-- Choose Subject --</option>
              {SUBJECTS?.filter((s: any) => s.id !== "all").map((s: any) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
        )}

        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition relative">
          <input type="file" onChange={e => setSelectedFile(e.target.files?.[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          <div className="text-indigo-400 mb-2"><IconUpload /></div>
          {selectedFile ? (
            <p className="text-sm font-semibold text-indigo-700">{selectedFile.name}</p>
          ) : (
            <>
              <p className="text-sm font-semibold text-gray-700">Click to browse or drag file here</p>
              <p className="text-xs text-gray-400 mt-1">PDF, DOCX, PPTX up to 50MB</p>
            </>
          )}
        </div>
        
        {progress !== null && (
          <div className="space-y-2">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-center text-gray-500">{progress}% uploaded</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition">Cancel</button>
          <button onClick={uploadFiles} disabled={!selectedFile || !selectedSubject || mutation.isPending} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50">Upload</button>
        </div>
      </div>
    </div>
  );
}
function PreviewModal({ file, onClose, subjectLabel }: any) {
  const isSupported = file.type === "PDF" || file.type.startsWith("IMAGE");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 border-gray-200">
          <div className="flex items-center gap-3">
            <div className="text-indigo-600"><IconFile /></div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-400">{subjectLabel ? subjectLabel(file.subjectId) : file.subjectId} · {file.size} · {file.type}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.open(api.getDownloadUrl(file.id), "_blank")} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-md transition hover:opacity-90 bg-indigo-600">
              <IconDownload />
              Download
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition ml-1">
              <IconX />
            </button>
          </div>
        </div>
        
        {isSupported ? (
          <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center p-8">
            <div className="w-full max-w-lg bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200 p-8 text-center text-gray-500">
              [Preview Rendering Placeholder]
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center p-8">
            <div className="w-full max-w-sm bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200 p-8 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                <IconFile />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Preview Not Available</h3>
                <p className="text-sm text-gray-500 mt-1">This file type cannot currently be previewed in the browser. You can download the file to view it.</p>
              </div>
              <div className="pt-4 flex justify-center gap-3">
                <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
                <button onClick={() => window.open(api.getDownloadUrl(file.id), "_blank")} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition">Download File</button>
              </div>
            </div>
          </div>
        )}

        <div className="px-6 py-3 border-t shrink-0 flex items-center justify-between border-gray-200">
          <p className="text-xs text-gray-400">Uploaded by <span className="font-medium text-gray-600">{file.uploader}</span></p>
        </div>
      </div>
    </div>
  );
}


function MainApp({ onLogout }: any) {
  const [space, setSpace] = useState("");
  const [subject, setSubject] = useState("all");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 500);
  const [showUpload, setShowUpload] = useState(false);
  const [previewFile, setPreviewFile] = useState<any>(null);

  const { data: userData } = useQuery({ queryKey: ['me'], queryFn: api.getMe });
  const { data: hierarchy = [] } = useQuery({ queryKey: ['hierarchy'], queryFn: api.getHierarchy });
  const { data: publicSubjects = [] } = useQuery({ queryKey: ['publicSubjects'], queryFn: api.getPublicSubjects });

  const user = userData || getUserInfo();
  
  // Build SPACES dynamically
  const SPACES = useMemo(() => {
    if (!user || !user.spaces) return [];
    return user.spaces.map((sValue: string, i: number) => {
      if (sValue === 'college') return { id: 'college', label: 'College', shortLabel: 'College', icon: '🏫' };
      const node = hierarchy.find((h: any) => h.value === sValue);
      const icon = i === 1 ? '💻' : i === 2 ? '📚' : '👥';
      return { id: sValue, label: node?.name || sValue, shortLabel: node?.name || sValue, icon };
    });
  }, [user, hierarchy]);

  // Set default space
  useEffect(() => {
    if (SPACES.length > 0 && !space) setSpace(SPACES[SPACES.length - 1].id);
  }, [SPACES, space]);

  // Build SUBJECTS dynamically
  const SUBJECTS = useMemo(() => {
    if (!user) return [{ id: "all", label: "All" }];
    const filtered = publicSubjects.filter((s: any) => {
       const deptNode = hierarchy.find((h: any) => h.value === user.department);
       const semNode = hierarchy.find((h: any) => h.value === user.semester);
       return s.departmentId === deptNode?._id && s.semesterId === semNode?._id;
    });
    return [{ id: "all", label: "All" }, ...filtered.map((s: any) => ({ id: s._id, label: s.shortName, fullName: s.name }))];
  }, [publicSubjects, user, hierarchy]);

  const subjectLabel = (id: string) => {
    if (id === 'all') return 'All Files';
    const sub = publicSubjects.find((s: any) => s._id === id);
    return sub ? sub.shortName : id;
  };

  const { data: files = [] } = useQuery({
    queryKey: ['files', space, subject, debouncedQuery],
    queryFn: () => api.getFiles(space, subject, debouncedQuery),
    enabled: !!space
  });

  const spaceData = SPACES.find((s: any) => s.id === space) || SPACES[0] || {};

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans">
      <header className="h-14 bg-white border-b flex items-center justify-between px-6 shrink-0 z-10 sticky top-0 border-gray-100">
        <span className="font-bold text-indigo-700 tracking-tight text-sm uppercase">COLLEGE FILES</span>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            {user?.name?.[0]?.toUpperCase() || "S"}
          </div>
          <span className="text-sm text-gray-700 font-medium">{user?.name || "Student"}</span>
          <button onClick={onLogout} className="text-red-500 text-xs hover:underline ml-2">Logout</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[240px] border-r bg-white flex flex-col pt-6 shrink-0 border-gray-100">
          <div className="px-5 pb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">YOUR SPACES</p>
          </div>
          <nav className="px-2 space-y-1">
            {SPACES.map((s: any) => (
              <button
                key={s.id}
                onClick={() => { setSpace(s.id); setSubject("all"); setQuery(""); }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition ${space === s.id ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50"}`}
              >
                <span className="text-base">{s.icon}</span>
                <span className="truncate">{s.label}</span>
                {space === s.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500" />}
              </button>
            ))}
          </nav>

          <div className="mt-8 px-5 pt-6 border-t border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">HIERARCHY</p>
            <div className="space-y-1.5">
              {SPACES.map((s: any, i: number) => (
                <div key={s.id} className="flex items-center gap-2">
                  <span className="text-gray-300" style={{ marginLeft: i * 8 }}>└</span>
                  <span className="text-[11px] text-gray-400 font-medium">{s.shortLabel}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-8 bg-white">
          <div className="max-w-4xl space-y-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <span className="text-4xl">{spaceData.icon}</span> {spaceData.label}
              </h1>
              <p className="text-sm text-gray-400 mt-2 font-medium">{files.length} files in this space</p>
            </div>

            <div className="relative max-w-full">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <IconSearch />
              </div>
              <input 
                type="text" 
                placeholder={`Search files in ${spaceData.label}...`}
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-lg outline-none focus:border-indigo-500 transition shadow-sm text-sm"
              />
            </div>

            {!debouncedQuery && (
              <div className="flex gap-6 border-b border-gray-100 overflow-x-auto">
                {SUBJECTS.map((s: any) => (
                  <button 
                    key={s.id}
                    onClick={() => setSubject(s.id)}
                    title={s.fullName}
                    className={`pb-3 text-sm font-medium border-b-2 -mb-px transition whitespace-nowrap ${subject === s.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-800"}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-800">{subjectLabel(subject)}</h2>
                <button onClick={() => setShowUpload(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition"><IconUpload /> Upload File</button>
              </div>

              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                {files.length === 0 ? (
                  <div className="p-16 text-center text-gray-400 text-sm">No files found.</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {files.map((f: any) => (
                      <div key={f._id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                        <div className="flex items-center gap-4">
                          <div className="text-indigo-400 w-10 h-10 bg-indigo-50/50 border border-indigo-100/50 rounded flex items-center justify-center">
                            <IconFile />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{f.name}</p>
                            <p className="text-xs text-indigo-600 mt-0.5 font-medium">
                              {subjectLabel(f.subject)} <span className="text-gray-400 font-normal">· Uploaded by {f.uploader} · {new Date(f.uploadedAt).toLocaleDateString()} · {f.size}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => setPreviewFile(f)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded text-xs font-semibold hover:bg-indigo-100 transition">
                            <IconEye /> Preview
                          </button>
                          <button onClick={() => window.open(api.getDownloadUrl(f._id), "_blank")} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 rounded text-xs font-semibold hover:bg-gray-50 transition">
                            <IconDownload /> Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
      
      {showUpload && <UploadModal space={space} subject={subject} SUBJECTS={SUBJECTS} onClose={() => setShowUpload(false)} />}
      {previewFile && <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} subjectLabel={subjectLabel} />}
    </div>
  );
}
export default function AppWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

function App() {
  const user = getUserInfo();
  const [view, setView] = useState(getAuthToken() ? (user?.role === 'admin' ? 'admin' : 'app') : 'login');
  
  if (view === "login") return <LoginPage onLogin={() => {
    const u = getUserInfo();
    setView(u?.role === 'admin' ? 'admin' : 'app');
  }} onRegister={() => setView("register")} />;
  
  if (view === "register") return <RegisterPage onBack={() => setView("login")} onDone={() => setView("app")} />;
  
  if (view === "admin") return <AdminApp onLogout={() => { removeAuthToken(); setView("login"); }} />;
  
  return <MainApp onLogout={() => { removeAuthToken(); setView("login"); }} />;
}
