import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, Group, FileItem } from "../services/api";
import { FileTable } from "../components/FileTable";
import { PreviewModal, DeleteModal, UploadModal } from "../components/Modals";

interface AllFilesPageProps {
  groups: Group[];
  onOpenUpload: () => void;
  onNavigateUser?: (userId: string) => void;
}

export function AllFilesPage({ groups, onOpenUpload, onNavigateUser }: AllFilesPageProps) {
  const queryClient = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [deleteFileItem, setDeleteFileItem] = useState<FileItem | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["all-files", selectedGroup],
    queryFn: () => api.getAllFiles({ groupId: selectedGroup !== "all" ? selectedGroup : undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (fileId: string) => api.deleteFile(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-files"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setDeleteFileItem(null);
    },
  });

  return (
    <div className="all-files-page-container">
      <div className="page-header">
        <div>
          <h2>All Files</h2>
          <p>Access, preview, and download all materials shared across your groups</p>
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
            <span>Upload New File</span>
          </button>
        </div>
      </div>

      <FileTable
        files={files}
        isLoading={isLoading}
        showGroupBadge={true}
        onPreview={(f) => setPreviewFile(f)}
        onDelete={(f) => setDeleteFileItem(f)}
        onUploadClick={() => setUploadOpen(true)}
        onNavigateUser={onNavigateUser}
        emptyTitle="No files available"
        emptyMessage="Files uploaded to any of your groups will appear here."
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
          queryClient.invalidateQueries({ queryKey: ["all-files"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
        }}
      />

      <DeleteModal
        isOpen={!!deleteFileItem}
        title="Delete File"
        message={`Are you sure you want to permanently delete "${deleteFileItem?.originalName}"? This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteFileItem && deleteMutation.mutate(deleteFileItem.id || deleteFileItem._id)}
        onClose={() => setDeleteFileItem(null)}
      />
    </div>
  );
}
