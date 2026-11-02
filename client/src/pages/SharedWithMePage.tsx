import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, Group, FileItem } from "../services/api";
import { FileTable } from "../components/FileTable";
import { PreviewModal, DeleteModal } from "../components/Modals";

interface SharedWithMePageProps {
  groups: Group[];
  onNavigateUser?: (userId: string) => void;
}

export function SharedWithMePage({ groups, onNavigateUser }: SharedWithMePageProps) {
  const queryClient = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [deleteFileItem, setDeleteFileItem] = useState<FileItem | null>(null);

  const { data: sharedFiles = [], isLoading } = useQuery({
    queryKey: ["shared-with-me", selectedGroup],
    queryFn: () => api.getSharedWithMe({ groupId: selectedGroup !== "all" ? selectedGroup : undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (fileId: string) => api.deleteFile(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shared-with-me"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setDeleteFileItem(null);
    },
  });

  return (
    <div className="shared-with-me-page-container">
      <div className="page-header">
        <div>
          <h2>Shared With Me</h2>
          <p>Files and materials contributed by peers and professors across your common groups</p>
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
        </div>
      </div>

      <FileTable
        files={sharedFiles}
        isLoading={isLoading}
        showGroupBadge={true}
        onPreview={(f) => setPreviewFile(f)}
        onDelete={(f) => setDeleteFileItem(f)}
        onNavigateUser={onNavigateUser}
        emptyTitle="No shared files yet"
        emptyMessage="Files uploaded by other members in your groups will appear here."
      />

      <PreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />

      <DeleteModal
        isOpen={!!deleteFileItem}
        title="Delete Shared File"
        message={`As group admin, are you sure you want to remove "${deleteFileItem?.originalName}"? This file will be deleted from R2.`}
        confirmLabel="Delete File"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteFileItem && deleteMutation.mutate(deleteFileItem.id || deleteFileItem._id)}
        onClose={() => setDeleteFileItem(null)}
      />
    </div>
  );
}
