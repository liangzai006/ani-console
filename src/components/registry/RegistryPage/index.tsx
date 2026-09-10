import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Form,
  Input,
  Message,
  Modal,
  Select,
  Space,
  Typography,
} from "@arco-design/web-react";
import { useEffect, useState } from "react";
import { showApiError } from "@/lib/api-error";
import {
  deleteRegistryTag,
  getRegistryPushInstructions,
  listRegistryImages,
  listRegistryProjects,
  type RegistryImage,
  type RegistryPurpose,
  type RegistryScanResult,
} from "@/api/registry";
import {
  ListDataTable,
  ListPageFrame,
  ListPageHeader,
  DataTableRowActionButton,
  DataTableRowActions,
  ListToolbar,
  ToolbarIconButton,
  ToolbarSearch,
  type ListColumn,
} from "@/components/common";
import { getErrorMessage } from "@/lib/errors";
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
  const [guideProject, setGuideProject] = useState("");
  const [guideRepository, setGuideRepository] = useState("demo/app");

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
  const guide = useQuery({
    queryKey: ["registry-push-instructions", guideProject, guideRepository],
    queryFn: () => getRegistryPushInstructions(guideProject, guideRepository.trim() || "demo/app"),
    enabled: guideVisible && !!guideProject,
  });

  useEffect(() => {
    if (!guideProject && projects.data?.[0]) setGuideProject(projects.data[0].name);
  }, [guideProject, projects.data]);

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
        header={
          <ListPageHeader
            iconClassName="icon-moxing"
            title="镜像仓库"
            subtitle="推送入库 · 扫描摘要 · 四类实例共用选 Tag"
            extra={
              <Button type="primary" onClick={() => setGuideVisible(true)}>
                推送镜像说明
              </Button>
            }
          />
        }
        toolbar={
          <ListToolbar
            filters={
              <Space wrap>
                <ToolbarSearch
                  fields={[{ value: "keyword", label: "关键词" }]}
                  field="keyword"
                  value={keyword}
                  onFieldChange={() => undefined}
                  onChange={setKeyword}
                  placeholder="搜索镜像名 / Tag / 项目"
                />
                <Select
                  value={purpose}
                  onChange={setPurpose}
                  className="w-[140px]"
                  options={[
                    { value: "all", label: "全部用途" },
                    ...Object.entries(PURPOSE_LABELS).map(([value, label]) => ({
                      value,
                      label,
                    })),
                  ]}
                />
                <Select
                  value={project}
                  onChange={setProject}
                  className="w-[160px]"
                  options={[
                    { value: "all", label: "全部项目" },
                    ...(projects.data ?? []).map((item) => ({
                      value: item.name,
                      label: item.name,
                    })),
                  ]}
                />
              </Space>
            }
            tools={
              <ToolbarIconButton
                iconClassName="icon-refresh-1"
                label="刷新"
                spinning={images.isFetching}
                onClick={refresh}
              />
            }
          />
        }
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
      <Modal
        visible={guideVisible}
        title="推送镜像说明"
        footer={null}
        onCancel={() => setGuideVisible(false)}
        style={{ width: 720 }}
      >
        <Typography.Paragraph type="secondary">
          镜像通过 docker push 入库，不支持网页上传。项目由平台按当前租户自动创建，Console
          不展示或下发凭据明文。
        </Typography.Paragraph>
        <Form layout="vertical">
          <Form.Item label="项目" required>
            <Select
              value={guideProject}
              onChange={setGuideProject}
              options={(projects.data ?? []).map((item) => ({
                value: item.name,
                label: item.name,
              }))}
            />
          </Form.Item>
          <Form.Item label="仓库路径">
            <Input
              value={guideRepository}
              onChange={setGuideRepository}
              placeholder="例如 demo/app"
            />
          </Form.Item>
        </Form>
        {guide.isLoading ? (
          <Typography.Text type="secondary">正在获取推送说明…</Typography.Text>
        ) : guide.isError ? (
          <Typography.Text type="error">
            {getErrorMessage(guide.error, "推送说明加载失败")}
          </Typography.Text>
        ) : guide.data ? (
          <Space direction="vertical" className="w-full">
            {guide.data.commands.map((item) => (
              <div key={item.label} className="rounded border border-[var(--color-border-2)] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <Typography.Text className="font-medium">{item.label}</Typography.Text>
                  <Button
                    size="mini"
                    type="text"
                    onClick={() => copyText(item.command, "命令已复制")}
                  >
                    复制
                  </Button>
                </div>
                <Typography.Text code className="break-all">
                  {item.command}
                </Typography.Text>
              </div>
            ))}
          </Space>
        ) : (
          <Typography.Text type="secondary">当前租户项目暂不可用，请刷新后重试。</Typography.Text>
        )}
      </Modal>
    </>
  );
}
