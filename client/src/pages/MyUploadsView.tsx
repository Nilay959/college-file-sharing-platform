import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Icon } from "../components/Icons";
import { api, Group, FileItem } from "../services/api";
import { FileTable } from "../components/FileTable";
import { PreviewModal, DeleteModal, UploadModal } from "../components/Modals";

interface MyUploadsViewProps {
  groups: Group[];
  onOpenUpload: () => void;
  onNavigateUser?: (userId: string) => void;
}

export function MyUploadsView({ groups, onOpenUpload, onNavigateUser }: MyUploadsViewProps) {
  const queryClient = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [deleteFileItem, setDeleteFileItem] = useState<FileItem | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data: myFiles = [], isLoading } = useQuery({
    queryKey: ["my-uploads", selectedGroup],
    queryFn: () => api.getMyUploads({ groupId: selectedGroup !== "all" ? selectedGroup : undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (fileId: string) => api.deleteFile(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-uploads"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setDeleteFileItem(null);
    },
  });

  // Calculate storage stats
  const totalStorage = useMemo(() => {
    const bytes = myFiles.reduce((acc, f) => acc + (f.fileSize || 0), 0);
    if (bytes === 0) return "0 MB";
    const mb = bytes / (1024 * 1024);
    if (mb < 1000) return `${mb.toFixed(2)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  }, [myFiles]);

  const uniqueGroupsCount = useMemo(() => {
    const set = new Set<string>();
    myFiles.forEach((f) => {
      if (f.groupId?._id) set.add(f.groupId._id);
    });
    return set.size;
  }, [myFiles]);

  return (
    <div className="my-uploads-page-container">
      <div className="page-header">
        <div>
          <h2>My Uploads</h2>
          <p>Manage, preview, and track all materials uploaded by you across your groups</p>
        </div>
        <div className="page-header-actions">
          {groups.length > 0 && (
            <select
              className="group-filter-dropdown"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
            >
              <option value="all">All Groups ({groups.length})</option>
              {groups.map((g) => (
                <option key={g.id || g._id} value={g.id || g._id}>
                  {g.name}
                </option>
              ))}
            </select>
          )}

          <button className="btn-primary" onClick={() => setUploadOpen(true)}>
            <Icon name="upload" size={15} />
            <span>Upload New File</span>
          </button>
        </div>
      </div>

      {/* Mini Stats Grid */}
      <div className="dashboard-stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card blue">
          <div className="stat-card-icon blue">
            <Icon name="fileText" size={20} />
          </div>
          <div className="stat-card-text">
            <span className="stat-label">Uploaded Files</span>
            <strong className="stat-value">{myFiles.length}</strong>
          </div>
        </div>

        <div className="stat-card green">
          <div className="stat-card-icon green">
            <Icon name="download" size={20} />
          </div>
          <div className="stat-card-text">
            <span className="stat-label">Storage in R2</span>
            <strong className="stat-value">{totalStorage}</strong>
          </div>
        </div>

        <div className="stat-card orange">
          <div className="stat-card-icon orange">
            <Icon name="folder" size={20} />
          </div>
          <div className="stat-card-text">
            <span className="stat-label">Groups Shared To</span>
            <strong className="stat-value">{uniqueGroupsCount}</strong>
          </div>
        </div>
      </div>

      <FileTable
        files={myFiles}
        isLoading={isLoading}
        showGroupBadge={true}
        onPreview={(f) => setPreviewFile(f)}
        onDelete={(f) => setDeleteFileItem(f)}
        onUploadClick={() => setUploadOpen(true)}
        onNavigateUser={onNavigateUser}
        emptyTitle="You haven't uploaded any files yet"
        emptyMessage="Upload lecture slides, notes, assignments, or code archives to share with your group members."
      />

      <PreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />

      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        groups={groups}
        defaultGroupId={selectedGroup !== "all" ? selectedGroup : groups[0]?.id}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["my-uploads"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
        }}
      />

      <DeleteModal
        isOpen={!!deleteFileItem}
        title="Delete Uploaded File"
        message={`Are you sure you want to permanently delete "${deleteFileItem?.originalName}" from Cloudflare R2? Members in ${deleteFileItem?.groupId?.name || "your group"} will no longer have access.`}
        confirmLabel="Delete Permanently"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteFileItem && deleteMutation.mutate(deleteFileItem.id || deleteFileItem._id)}
        onClose={() => setDeleteFileItem(null)}
      />
    </div>
  );
}
