import { Button, Message, Upload } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { servicesApi } from "@/api/services-client";
import { showApiError } from "@/api/helpers";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";

const allowedTypes = ["pdf", "docx", "xlsx", "pptx", "md", "txt"] as const;

async function sha256(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function KnowledgeDocumentUploadButton({ kbId }: { kbId: string }) {
  const qc = useQueryClient();
  const reservationScope = useIdempotencyScope("knowledge-document-reserve", ["POST", kbId]);
  const notifyScope = useIdempotencyScope("knowledge-document-notify-uploaded", ["POST", kbId]);
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const fileType = file.name.split(".").pop()?.toLowerCase();
      if (!allowedTypes.includes(fileType as (typeof allowedTypes)[number]))
        throw new Error("仅支持 PDF、DOCX、XLSX、PPTX、Markdown 和 TXT 文件");
      if (file.size > 100 * 1024 * 1024) throw new Error("文件不能超过 100 MB");
      const checksum = await sha256(file);
      const reservationDependencies = [file.name, file.size, file.type, file.lastModified] as const;
      const reservationData = {
        file_name: file.name,
        file_type: fileType as (typeof allowedTypes)[number],
        file_size_bytes: file.size,
        checksum_sha256: checksum,
      };
      const { data: reservation, error } = await servicesApi.POST(
        "/knowledge-bases/{kb_id}/documents",
        {
          params: { path: { kb_id: kbId } },
          body: reservationScope.withKey(reservationData, reservationDependencies),
        },
      );
      if (error || !reservation) throw error ?? new Error("未获取到上传地址");
      const put = await fetch(reservation.upload_url, {
        method: "PUT",
        body: file,
        headers: file.type ? { "Content-Type": file.type } : undefined,
      });
      if (!put.ok) throw new Error(`文件上传失败（HTTP ${put.status}）`);
      const notifyDependencies = [reservation.doc_id] as const;
      const notifyData = {
        doc_id: reservation.doc_id,
        storage_path: reservation.storage_path,
      };
      const { error: notifyError } = await servicesApi.POST(
        "/knowledge-bases/{kb_id}/documents/{doc_id}/notify-uploaded",
        {
          params: { path: { kb_id: kbId, doc_id: reservation.doc_id } },
          body: notifyScope.withKey(notifyData, notifyDependencies),
        },
      );
      if (notifyError) throw notifyError;
      return { reservationDependencies, notifyDependencies };
    },
    onSuccess: ({ reservationDependencies, notifyDependencies }) => {
      reservationScope.reset(reservationDependencies);
      notifyScope.reset(notifyDependencies);
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
