import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Message, Modal, Select, Space, Typography } from "@arco-design/web-react";
import { useState } from "react";
import { showApiError } from "@/lib/api-error";
import {
  deleteRegistryTag,
  listRegistryImages,
  listRegistryProjects,
  type RegistryImage,
  type RegistryPurpose,
  type RegistryScanResult,
} from "@/api/registry";
import { RegistryPushInstructionsModal } from "../RegistryPushInstructionsModal";
import {
  ListPageFrame,
  DataTableRowActionButton,
  DataTableRowActions,
  type ListColumn,
  ListDataTable,
} from "@/components/common";
import { formatBytes, formatDateTime } from "@/lib/format";
import { getImageDisplayName } from "@/lib/render";
import { useCursorPaginatedQuery } from "@/hooks/useCursorPaginatedQuery";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";

const PURPOSE_LABELS: Record<RegistryPurpose, string> = {
  container: "容器镜像",
  gpu: "GPU 镜像",
  sandbox: "沙箱镜像",
  system: "系统镜像",
};

function copyText(value: string, success: string) {
  void navigator.clipboard.writeText(value).then(() => Message.success(success));
}

function scanSummary(scan: RegistryScanResult) {
  if (scan.status === "not_scanned") return "未扫描";
  if (scan.status === "pending" || scan.status === "running") return "扫描中";
  if (scan.status === "failed") return "扫描失败";
  if (scan.critical || scan.high) return `严重 ${scan.critical} · 高危 ${scan.high}`;
  return "未发现高危漏洞";
}

export function RegistryPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [purpose, setPurpose] = useState<"all" | RegistryPurpose>("all");
  const [project, setProject] = useState("all");
  const [guideVisible, setGuideVisible] = useState(false);

  const projects = useQuery({
    queryKey: ["registry-projects"],
    queryFn: () => listRegistryProjects({ limit: 100 }).then((data) => data.items),
  });
  const {
    query: images,
    page,
    pageSize,
    setPage,
    setPageSize,
    resetPagination,
    refresh,
  } = useCursorPaginatedQuery<RegistryImage>({
    queryKey: ["registry-images", { keyword, project, purpose }],
    cursorScope: `${keyword.trim()}:${project}:${purpose}`,
    fetchPage: async ({ cursor, limit }) => {
      return listRegistryImages({
        limit,
        cursor,
        keyword: keyword.trim() || undefined,
        project: project === "all" ? undefined : project,
        purpose: purpose === "all" ? undefined : purpose,
      });
    },
  });
  const deleteTag = useMutation({
    mutationFn: (item: RegistryImage) => deleteRegistryTag(item.project, item.repository, item.tag),
    onSuccess: () => {
      resetPagination();
      void qc.invalidateQueries({ queryKey: ["registry-images"] });
      Message.success("镜像 Tag 已删除");
    },
    onError: (error) => showApiError(error),
  });

  const items = images.data?.items ?? [];
  const paginationTotal = images.data?.total ?? items.length;
  useListErrorNotification({
    id: "registry-images-list",
    title: "镜像列表加载失败",
    error: images.error,
  });
  const columns: Array<ListColumn<RegistryImage>> = [
    {
      key: "image",
      title: "镜像名",
      ellipsis: true,
      render: (_, item) => (
        <div>
          <span className="block font-medium">{getImageDisplayName(item)}</span>
          <Typography.Text type="secondary" className="text-xs">
            {item.repository}
          </Typography.Text>
        </div>
      ),
    },
    {
      key: "purpose",
      title: "用途",
      render: (_, item) => (item.purpose ? PURPOSE_LABELS[item.purpose] : "-"),
    },
    {
      key: "project",
      title: "项目",
      dataIndex: "project",
    },
    { key: "tag", title: "Tag", dataIndex: "tag" },
    {
      key: "size",
      title: "大小",
      render: (_, item) => formatBytes(item.size_bytes),
    },
    {
      key: "pushedAt",
      title: "推送时间",
      render: (_, item) => formatDateTime(item.pushed_at),
    },
    {
      key: "scan",
      title: "漏洞摘要",
      render: (_, item) => scanSummary(item.scan_status),
    },
  ];
  const goCreate = (item: RegistryImage) => {
    const target =
      item.purpose === "gpu"
        ? "/gpu-instances"
        : item.purpose === "sandbox"
          ? "/sandbox-instances"
          : item.purpose === "system"
            ? "/vm-instances"
            : "/container-instances";
    void navigate({ to: target });
  };

  return (
    <>
      <ListPageFrame
        header={{
          iconClassName: "icon-moxing",
          title: "镜像仓库",
          subtitle: "推送入库 · 扫描摘要 · 四类实例共用选 Tag",
          extra: (
            <Button type="primary" onClick={() => setGuideVisible(true)}>
              推送镜像说明
            </Button>
          ),
        }}
        toolbar={{
          search: {
            fields: [
              {
                value: "keyword",
                label: "关键词",
              },
            ],
            field: "keyword",
            value: keyword,
            onFieldChange: () => undefined,
            onChange: setKeyword,
            placeholder: "搜索镜像名 / Tag / 项目",
          },
          filters: (
            <Space wrap>
              <Select
                value={purpose}
                onChange={setPurpose}
                className="w-35"
                options={[
                  {
                    value: "all",
                    label: "全部用途",
                  },
                  ...Object.entries(PURPOSE_LABELS).map(([value, label]) => ({
                    value,
                    label,
                  })),
                ]}
              />
              <Select
                value={project}
                onChange={setProject}
                className="w-40"
                options={[
                  {
                    value: "all",
                    label: "全部项目",
                  },
                  ...(projects.data ?? []).map((item) => ({
                    value: item.name,
                    label: item.name,
                  })),
                ]}
              />
            </Space>
          ),
          refresh: {
            label: "刷新",
            spinning: images.isFetching,
            onClick: refresh,
          },
        }}
      >
        <ListDataTable
          data={items}
          rowKey={(item) => `${item.project}/${item.repository}:${item.tag}`}
          columns={[
            ...columns,
            {
              key: "__actions",
              title: "操作",
              fixed: "right",
              width: 200,
              render: (_value, item) => (
                <DataTableRowActions>
                  <DataTableRowActionButton
                    onClick={() =>
                      copyText(item.pull_command || `docker pull ${item.image}`, "拉取命令已复制")
                    }
                  >
                    拉取命令
                  </DataTableRowActionButton>
                  <DataTableRowActionButton onClick={() => goCreate(item)}>
                    去创建
                  </DataTableRowActionButton>
                  <DataTableRowActionButton
                    status="danger"
                    onClick={() =>
                      Modal.confirm({
                        title: "删除镜像 Tag",
                        content: `确定删除 ${item.repository}:${item.tag}？被实例引用时平台会拒绝删除。`,
                        onOk: () => deleteTag.mutateAsync(item),
                      })
                    }
                  >
                    删除
                  </DataTableRowActionButton>
                </DataTableRowActions>
              ),
            },
          ]}
          loading={images.isFetching}
          preserveTableOnEmpty
          emptyIconClassName="icon-moxing"
          emptyText={
            keyword || purpose !== "all" || project !== "all"
              ? "没有符合条件的镜像"
              : "还没有镜像：按推送说明 docker push 入库后，再去创建实例"
          }
          tableLabel="镜像仓库列表"
          pagination={{
            page,
            pageSize,
            total: paginationTotal,
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
          }}
        />
      </ListPageFrame>
      <RegistryPushInstructionsModal
        visible={guideVisible}
        projects={projects.data}
        onCancel={() => setGuideVisible(false)}
      />
    </>
  );
}
