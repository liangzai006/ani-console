import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Modal, Select, Space, Typography } from "@arco-design/web-react";
import { useState } from "react";

import {
  deleteRegistryTag,
  listRegistryImages,
  listRegistryProjects,
  type RegistryImage,
  type RegistryPurpose,
  type RegistryScanResult,
} from "@/api/registry";
import { RegistryPushInstructionsModal } from "../RegistryPushInstructionsModal";
import { ListPageFrame, type ListColumn, ListDataTable } from "@/components/common";
import { copyToClipboard } from "@/lib/clipboard";
import { formatBytes, formatDateTime } from "@/lib/format";
import { getImageDisplayName } from "@/lib/render";
import { useCursorPaginatedQuery } from "@/hooks/useCursorPaginatedQuery";

const PURPOSE_LABELS: Record<RegistryPurpose, string> = {
  container: "容器镜像",
  gpu: "GPU 镜像",
  sandbox: "沙箱镜像",
  system: "云主机镜像",
};

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
    meta: {
      errorNotification: {
        id: "registry-projects",
        action: "数据加载",
        fallback: "请求失败，请稍后重试",
      },
    },
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
    errorNotification: {
      id: "registry-images",
      action: "镜像列表加载",
      fallback: "请求失败，请稍后重试",
    },
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
    meta: {
      feedback: {
        channel: "notification",
        id: "registry-tag-delete",
        action: "删除",
        successText: "镜像 Tag 已删除",
        errorFallback: "请求失败",
      },
    },
    mutationFn: (item: RegistryImage) => deleteRegistryTag(item.project, item.repository, item.tag),
    onSuccess: () => {
      resetPagination();
      void qc.invalidateQueries({ queryKey: ["registry-images"] });
    },
  });

  const items = images.data?.items ?? [];
  const paginationTotal = images.data?.total ?? items.length;
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
            <Space>
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
          columns={columns}
          rowActions={[
            {
              key: "copy-pull-command",
              label: "拉取命令",
              onClick: (item) =>
                void copyToClipboard(item.pull_command || `docker pull ${item.image}`, "拉取命令"),
            },
            {
              key: "create",
              label: "去创建",
              onClick: goCreate,
            },
            {
              key: "delete",
              label: "删除",
              intent: "danger",
              loading: (item) =>
                deleteTag.isPending &&
                deleteTag.variables?.project === item.project &&
                deleteTag.variables.repository === item.repository &&
                deleteTag.variables.tag === item.tag,
              onClick: (item) =>
                void Modal.confirm({
                  title: "删除镜像 Tag",
                  content: `确定删除 ${item.repository}:${item.tag}？被实例引用时平台会拒绝删除。`,
                  okButtonProps: { status: "danger" },
                  onOk: () => deleteTag.mutateAsync(item),
                }),
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
