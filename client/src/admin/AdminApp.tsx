import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getUserInfo, removeAuthToken } from "../services/api";

export default function AdminApp({ onLogout }: any) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const user = getUserInfo();

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-gray-900">
      <aside className="w-64 bg-indigo-900 text-white flex flex-col shrink-0">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-wider">ADMIN PANEL</h1>
          <p className="text-indigo-300 text-sm mt-1">{user?.name}</p>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          <NavButton active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")}>Dashboard</NavButton>
          <NavButton active={activeTab === "academic"} onClick={() => setActiveTab("academic")}>Academic Mgmt</NavButton>
          <NavButton active={activeTab === "subjects"} onClick={() => setActiveTab("subjects")}>Subjects</NavButton>
          <NavButton active={activeTab === "users"} onClick={() => setActiveTab("users")}>Users</NavButton>
          <NavButton active={activeTab === "files"} onClick={() => setActiveTab("files")}>Files</NavButton>
          <NavButton active={activeTab === "settings"} onClick={() => setActiveTab("settings")}>Settings</NavButton>
        </nav>
        <div className="p-4">
          <button onClick={onLogout} className="w-full text-left px-4 py-2 text-sm font-medium text-red-300 hover:bg-indigo-800 rounded-md transition">Logout</button>
        </div>
      </aside>
      
      <main className="flex-1 overflow-y-auto p-8">
        {activeTab === "dashboard" && <DashboardView />}
        {activeTab === "academic" && <AcademicView />}
        {activeTab === "subjects" && <SubjectView />}
        {activeTab === "users" && <UsersView />}
        {activeTab === "files" && <FilesView />}
        {activeTab === "settings" && <SettingsView />}
      </main>
    </div>
  );
}

function NavButton({ active, onClick, children }: any) {
  return (
    <button onClick={onClick} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition ${active ? 'bg-indigo-800 text-white' : 'text-indigo-200 hover:bg-indigo-800/50 hover:text-white'}`}>
      {children}
    </button>
  );
}

function DashboardView() {
  const { data, isLoading } = useQuery({ queryKey: ["adminStats"], queryFn: api.getAdminStats });
  if (isLoading) return <div>Loading...</div>;
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>
      <div className="grid grid-cols-4 gap-6">
        <StatCard title="Total Students" value={data?.students || 0} />
        <StatCard title="Files" value={data?.files || 0} />
        <StatCard title="Departments" value={data?.departments || 0} />
        <StatCard title="Subjects" value={data?.subjects || 0} />
      </div>
      <h3 className="text-xl font-bold mt-8 border-b pb-2">Recent Uploads</h3>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {data?.recentUploads?.map((f: any) => (
          <div key={f._id} className="p-4 border-b last:border-0 flex justify-between items-center">
            <div>
              <p className="font-semibold text-sm">{f.originalName}</p>
              <p className="text-xs text-gray-500">Uploaded by: {f.uploaderId?.name} · {f.size}</p>
            </div>
          </div>
        ))}
        {data?.recentUploads?.length === 0 && <div className="p-4 text-sm text-gray-500">No recent uploads</div>}
      </div>
    </div>
  );
}

function StatCard({ title, value }: any) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
    </div>
  );
}


function AcademicView() {
  const queryClient = useQueryClient();
  const { data: hierarchy = [] } = useQuery({ queryKey: ["hierarchy"], queryFn: api.getHierarchy });
  
  const delMut = useMutation({
    mutationFn: api.deleteHierarchy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
    }
  });

  const [deptName, setDeptName] = useState("");
  const [deptValue, setDeptValue] = useState("");
  
  const [semName, setSemName] = useState("");
  const [semValue, setSemValue] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");

  const [divName, setDivName] = useState("");
  const [divValue, setDivValue] = useState("");
  const [selectedSemId, setSelectedSemId] = useState("");

  const [batchName, setBatchName] = useState("");
  const [batchValue, setBatchValue] = useState("");
  const [selectedDivId, setSelectedDivId] = useState("");

  const addMut = useMutation({
    mutationFn: api.createHierarchy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      setDeptName(""); setDeptValue("");
      setSemName(""); setSemValue("");
      setDivName(""); setDivValue("");
      setBatchName(""); setBatchValue("");
      alert("Added successfully!");
    }
  });

  const depts = hierarchy.filter((h: any) => h.type === "department");
  const sems = hierarchy.filter((h: any) => h.type === "semester" && h.parentId === selectedDeptId);
  const divs = hierarchy.filter((h: any) => h.type === "division" && h.parentId === selectedSemId);
  const batches = hierarchy.filter((h: any) => h.type === "batch" && h.parentId === selectedDivId);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Academic Management</h2>
        <p className="text-sm text-gray-600 mt-1">Manage the platform's academic hierarchy.</p>
      </div>

      {/* DEPARTMENTS */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="font-bold text-lg mb-4 text-indigo-900 border-b pb-2">Departments</h3>
        <div className="flex gap-4 mb-6">
          <input type="text" placeholder="Department Name (e.g. Information Technology)" value={deptName} onChange={e => setDeptName(e.target.value)} className="border p-2 rounded text-sm flex-1" />
          <input type="text" placeholder="Value (e.g. it)" value={deptValue} onChange={e => setDeptValue(e.target.value)} className="border p-2 rounded text-sm w-48" />
          <button onClick={() => addMut.mutate({ type: 'department', name: deptName, value: deptValue })} disabled={!deptName || !deptValue} className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700 disabled:opacity-50">Add Dept</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {depts.map((d: any) => (
            <span key={d._id} className="text-xs bg-gray-100 border text-gray-800 px-3 py-1.5 rounded-full font-medium flex items-center gap-2">{d.name}<button onClick={() => { if(window.confirm('Delete Department?')) delMut.mutate(d._id); }} className="text-red-500 hover:text-red-700 font-bold">&times;</button></span>
          ))}
          {depts.length === 0 && <p className="text-sm text-gray-500">No departments</p>}
        </div>
      </div>

      {/* SEMESTERS */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="font-bold text-lg mb-4 text-indigo-900 border-b pb-2">Semesters</h3>
        <div className="flex gap-4 mb-6">
          <select value={selectedDeptId} onChange={e => setSelectedDeptId(e.target.value)} className="border p-2 rounded text-sm w-48">
            <option value="">Select Department</option>
            {depts.map((d: any) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          <input type="text" placeholder="Semester Name (e.g. Semester 1)" value={semName} onChange={e => setSemName(e.target.value)} className="border p-2 rounded text-sm flex-1" disabled={!selectedDeptId} />
          <input type="text" placeholder="Value (e.g. sem1)" value={semValue} onChange={e => setSemValue(e.target.value)} className="border p-2 rounded text-sm w-32" disabled={!selectedDeptId} />
          <button onClick={() => addMut.mutate({ type: 'semester', name: semName, value: semValue, parentId: selectedDeptId })} disabled={!semName || !semValue || !selectedDeptId} className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700 disabled:opacity-50">Add Sem</button>
        </div>
        {selectedDeptId && (
          <div className="flex flex-wrap gap-2 mt-4">
            {sems.map((s: any) => (
              <span key={s._id} className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-800 px-3 py-1.5 rounded-full font-medium flex items-center gap-2">{s.name}<button onClick={() => { if(window.confirm('Delete Semester?')) delMut.mutate(s._id); }} className="text-red-500 hover:text-red-700 font-bold">&times;</button></span>
            ))}
            {sems.length === 0 && <p className="text-sm text-gray-500">No semesters in this department</p>}
          </div>
        )}
      </div>

      {/* DIVISIONS */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="font-bold text-lg mb-4 text-indigo-900 border-b pb-2">Divisions</h3>
        <div className="flex gap-4 mb-6">
          <select value={selectedSemId} onChange={e => setSelectedSemId(e.target.value)} className="border p-2 rounded text-sm w-48">
            <option value="">Select Semester</option>
            {hierarchy.filter((h: any) => h.type === 'semester').map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <input type="text" placeholder="Division Name (e.g. A Division)" value={divName} onChange={e => setDivName(e.target.value)} className="border p-2 rounded text-sm flex-1" disabled={!selectedSemId} />
          <input type="text" placeholder="Value (e.g. adivision)" value={divValue} onChange={e => setDivValue(e.target.value)} className="border p-2 rounded text-sm w-32" disabled={!selectedSemId} />
          <button onClick={() => addMut.mutate({ type: 'division', name: divName, value: divValue, parentId: selectedSemId })} disabled={!divName || !divValue || !selectedSemId} className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700 disabled:opacity-50">Add Div</button>
        </div>
        {selectedSemId && (
          <div className="flex flex-wrap gap-2 mt-4">
            {divs.map((d: any) => (
              <span key={d._id} className="text-xs bg-amber-50 border border-amber-100 text-amber-800 px-3 py-1.5 rounded-full font-medium flex items-center gap-2">{d.name}<button onClick={() => { if(window.confirm('Delete Division?')) delMut.mutate(d._id); }} className="text-red-500 hover:text-red-700 font-bold">&times;</button></span>
            ))}
          </div>
        )}
      </div>

      {/* BATCHES */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="font-bold text-lg mb-4 text-indigo-900 border-b pb-2">Batches / Groups</h3>
        <div className="flex gap-4 mb-6">
          <select value={selectedDivId} onChange={e => setSelectedDivId(e.target.value)} className="border p-2 rounded text-sm w-48">
            <option value="">Select Division</option>
            {hierarchy.filter((h: any) => h.type === 'division').map((d: any) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          <input type="text" placeholder="Batch Name (e.g. A1)" value={batchName} onChange={e => setBatchName(e.target.value)} className="border p-2 rounded text-sm flex-1" disabled={!selectedDivId} />
          <input type="text" placeholder="Value (e.g. a1)" value={batchValue} onChange={e => setBatchValue(e.target.value)} className="border p-2 rounded text-sm w-32" disabled={!selectedDivId} />
          <button onClick={() => addMut.mutate({ type: 'batch', name: batchName, value: batchValue, parentId: selectedDivId })} disabled={!batchName || !batchValue || !selectedDivId} className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700 disabled:opacity-50">Add Batch</button>
        </div>
        {selectedDivId && (
          <div className="flex flex-wrap gap-2 mt-4">
            {batches.map((b: any) => (
              <span key={b._id} className="text-xs bg-blue-50 border border-blue-100 text-blue-800 px-3 py-1.5 rounded-full font-medium flex items-center gap-2">{b.name}<button onClick={() => { if(window.confirm('Delete Batch?')) delMut.mutate(b._id); }} className="text-red-500 hover:text-red-700 font-bold">&times;</button></span>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
function SubjectView() {
  const queryClient = useQueryClient();
  const { data: hierarchy = [] } = useQuery({ queryKey: ["hierarchy"], queryFn: api.getHierarchy });
  const { data: subjects = [] } = useQuery({ queryKey: ["adminSubjects"], queryFn: api.getSubjectsAdmin });
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [shortName, setShortName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [error, setError] = useState("");

  const depts = hierarchy.filter((h: any) => h.type === "department");
  const sems = hierarchy.filter((h: any) => h.type === "semester" && h.parentId === departmentId);

  const delMut = useMutation({
    mutationFn: api.deleteSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminSubjects"] }); queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
    }
  });

  const mutation = useMutation({
    mutationFn: api.createSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminSubjects"] }); queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      setName(""); setCode(""); setShortName(""); setDepartmentId(""); setSemesterId("");
      alert("Subject added successfully");
    },
    onError: (e: any) => setError(e.message)
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Subjects</h2>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
        <h3 className="font-bold text-lg">Add New Subject</h3>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <div className="grid grid-cols-2 gap-4">
          <input type="text" placeholder="Name (e.g. Database Management System)" value={name} onChange={e => setName(e.target.value)} className="border p-2 rounded text-sm w-full" />
          <input type="text" placeholder="Short Name (e.g. DBMS)" value={shortName} onChange={e => setShortName(e.target.value)} className="border p-2 rounded text-sm w-full" />
          <input type="text" placeholder="Code (e.g. CE301)" value={code} onChange={e => setCode(e.target.value)} className="border p-2 rounded text-sm w-full" />
          <select value={departmentId} onChange={e => {setDepartmentId(e.target.value); setSemesterId("");}} className="border p-2 rounded text-sm w-full">
            <option value="">Select Department</option>
            {depts.map((d: any) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          <select value={semesterId} onChange={e => setSemesterId(e.target.value)} className="border p-2 rounded text-sm w-full" disabled={!departmentId}>
            <option value="">Select Semester</option>
            {sems.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
        <button onClick={() => mutation.mutate({ name, shortName, code, departmentId, semesterId })} disabled={!name || !code || !semesterId} className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700 disabled:opacity-50">Add Subject</button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="font-bold text-lg mb-4">Existing Subjects</h3>
        <div className="divide-y">
          {subjects.map((s: any) => (
            <div key={s._id} className="py-3 flex justify-between items-center">
              <div>
                <p className="font-semibold text-sm">{s.name} ({s.code})</p>
                <p className="text-xs text-gray-500">Short: {s.shortName}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded ${s.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {s.isActive ? 'Active' : 'Disabled'}
                </span>
                <button onClick={() => { if(window.confirm('Delete Subject?')) delMut.mutate(s._id); }} className="text-red-600 text-xs font-medium hover:underline">Delete</button>
              </div>
            </div>
          ))}
          {subjects.length === 0 && <p className="text-sm text-gray-500">No subjects found</p>}
        </div>
      </div>
    </div>
  );
}

function UsersView() {
  const queryClient = useQueryClient();
  const { data: users = [] } = useQuery({ queryKey: ["adminUsers"], queryFn: api.getUsers });

  const delMut = useMutation({
    mutationFn: api.deleteSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminSubjects"] }); queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
    }
  });

  const mutation = useMutation({
    mutationFn: ({ id, isActive }: any) => api.updateUserStatus(id, isActive),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["adminUsers"] }); queryClient.invalidateQueries({ queryKey: ["adminStats"] }); }
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Students</h2>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="p-4 font-semibold">Name</th>
              <th className="p-4 font-semibold">Email</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u: any) => (
              <tr key={u._id} className="hover:bg-gray-50">
                <td className="p-4 font-medium">{u.name}</td>
                <td className="p-4 text-gray-600">{u.email}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{u.isActive ? 'Active' : 'Disabled'}</span>
                </td>
                <td className="p-4">
                  <button onClick={() => mutation.mutate({ id: u._id, isActive: !u.isActive })} className="text-indigo-600 hover:underline font-medium text-xs">
                    {u.isActive ? 'Disable' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-500">No students found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilesView() {
  const queryClient = useQueryClient();
  const { data: files = [] } = useQuery({ queryKey: ["adminFiles"], queryFn: api.getAdminFiles });
  const [deleteId, setDeleteId] = useState("");

  const delMut = useMutation({
    mutationFn: api.deleteSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminSubjects"] }); queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
    }
  });

  const mutation = useMutation({
    mutationFn: api.deleteFileAdmin,
    onSuccess: (_, deletedId) => {
      // Instantly update cache without page reload or refetch
      queryClient.setQueryData(["adminFiles"], (old: any) => old ? old.filter((f: any) => f._id !== deletedId) : []);
      // Invalidate student caches in the background
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      setDeleteId("");
    }
  });

  return (
    <div className="space-y-6 relative">
      <h2 className="text-2xl font-bold">File Moderation</h2>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="p-4 font-semibold">File Name</th>
              <th className="p-4 font-semibold">Uploader</th>
              <th className="p-4 font-semibold">Space / Subject</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {files.map((f: any) => (
              <tr key={f._id} className="hover:bg-gray-50">
                <td className="p-4 font-medium">{f.originalName}</td>
                <td className="p-4 text-gray-600">{f.uploaderId?.name}</td>
                <td className="p-4 text-gray-600">{f.spaceId} / {f.subjectId}</td>
                <td className="p-4 text-right space-x-3">
                  <button onClick={() => window.open(api.getDownloadUrl(f._id), "_blank")} className="text-indigo-600 hover:underline font-medium text-xs">Download</button>
                  <button onClick={() => setDeleteId(f._id)} className="text-red-600 hover:underline font-medium text-xs">Delete</button>
                </td>
              </tr>
            ))}
            {files.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-500">No files found</td></tr>}
          </tbody>
        </table>
      </div>

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">Delete File?</h3>
            <p className="text-sm text-gray-500 mt-2">Are you sure you want to delete this file? This action cannot be undone.</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setDeleteId("")} className="flex-1 py-2 border rounded font-medium text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={() => mutation.mutate(deleteId)} className="flex-1 py-2 bg-red-600 text-white rounded font-medium text-sm hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsView() {
  const queryClient = useQueryClient();
  const { data: domains = [] } = useQuery({ queryKey: ["adminDomains"], queryFn: api.getDomains });
  const [domain, setDomain] = useState("");

  const addMut = useMutation({
    mutationFn: api.createDomain,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["adminDomains"] }); setDomain(""); }
  });
  const delMut = useMutation({
    mutationFn: api.deleteDomain,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminDomains"] })
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Allowed College Email Domains</h2>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex gap-4 mb-6">
          <input type="text" placeholder="e.g. college.edu" value={domain} onChange={e => setDomain(e.target.value)} className="border p-2 rounded text-sm flex-1" />
          <button onClick={() => addMut.mutate({ domain })} disabled={!domain} className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700 disabled:opacity-50">Add Domain</button>
        </div>

        <div className="divide-y">
          {domains.map((d: any) => (
            <div key={d._id} className="py-3 flex justify-between items-center">
              <span className="font-medium text-sm">{d.domain}</span>
              <button onClick={() => delMut.mutate(d._id)} className="text-red-600 text-xs font-medium hover:underline">Remove</button>
            </div>
          ))}
          {domains.length === 0 && <p className="text-sm text-gray-500">No domains configured. Registration is blocked.</p>}
        </div>
      </div>
    </div>
  );
}
