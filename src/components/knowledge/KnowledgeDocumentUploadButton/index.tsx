import { Button, Upload } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  notifyKnowledgeDocumentUploaded,
  reserveKnowledgeDocumentUpload,
  uploadKnowledgeDocumentFile,
} from "@/api/knowledge";
import { sha256File } from "@/lib/hash";

const allowedTypes = ["pdf", "docx", "xlsx", "pptx", "md", "txt"] as const;

export function KnowledgeDocumentUploadButton({ kbId }: { kbId: string }) {
  const qc = useQueryClient();
  const upload = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "文档上传",
        successText: "文档已上传，正在解析",
        errorFallback: "文档上传失败",
      },
    },
    mutationFn: async (file: File) => {
      const fileType = file.name.split(".").pop()?.toLowerCase();
      if (!allowedTypes.includes(fileType as (typeof allowedTypes)[number]))
        throw new Error("仅支持 PDF、DOCX、XLSX、PPTX、Markdown 和 TXT 文件");
      if (file.size > 100 * 1024 * 1024) throw new Error("文件不能超过 100 MB");
      const checksum = await sha256File(file);
      const reservationData = {
        file_name: file.name,
        file_type: fileType as (typeof allowedTypes)[number],
        file_size_bytes: file.size,
        checksum_sha256: checksum,
      };
      const reservation = await reserveKnowledgeDocumentUpload(kbId, reservationData);
      await uploadKnowledgeDocumentFile(reservation.upload_url, file);
      const notifyData = {
        doc_id: reservation.doc_id,
        storage_path: reservation.storage_path,
      };
      await notifyKnowledgeDocumentUploaded(kbId, reservation.doc_id, notifyData);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["knowledge-base-documents", kbId] });
      void qc.invalidateQueries({ queryKey: ["knowledge-base", kbId] });
    },
  });

  return (
    <Upload
      accept=".pdf,.docx,.xlsx,.pptx,.md,.txt"
      showUploadList={false}
      customRequest={({ file }) => upload.mutate(file as File)}
    >
      <Button type="primary" loading={upload.isPending}>
        上传文档
      </Button>
    </Upload>
  );
}
