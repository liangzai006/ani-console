import { Button, Message, Upload } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showApiError } from "@/lib/api-error";
import {
  notifyKnowledgeDocumentUploaded,
  reserveKnowledgeDocumentUpload,
  uploadKnowledgeDocumentFile,
} from "@/api/knowledge";

const allowedTypes = ["pdf", "docx", "xlsx", "pptx", "md", "txt"] as const;

async function sha256(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function KnowledgeDocumentUploadButton({ kbId }: { kbId: string }) {
  const qc = useQueryClient();
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const fileType = file.name.split(".").pop()?.toLowerCase();
      if (!allowedTypes.includes(fileType as (typeof allowedTypes)[number]))
        throw new Error("仅支持 PDF、DOCX、XLSX、PPTX、Markdown 和 TXT 文件");
      if (file.size > 100 * 1024 * 1024) throw new Error("文件不能超过 100 MB");
      const checksum = await sha256(file);
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
      Message.success("文档已上传，正在解析");
      void qc.invalidateQueries({ queryKey: ["knowledge-base-documents", kbId] });
      void qc.invalidateQueries({ queryKey: ["knowledge-base", kbId] });
    },
    onError: (error) => showApiError(error, "文档上传失败"),
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
