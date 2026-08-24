import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { useEffect, useMemo, useState } from "react";
import { coreApi } from "@/api/client";
import { showApiError } from "@/api/helpers";
import type { components } from "@/api/core-schema";
import {
  DataTable,
  ListPageFrame,
  ListPageHeader,
  ListRowActionButton,
  ListRowActions,
  ListToolbar,
  ToolbarIconButton,
  ToolbarSearch,
  type ListColumn,
} from "@/components/pagebase";
import { getErrorMessage } from "@/lib/errors";
import { formatBytes, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/registry/")({
  component: RegistryPage,
});

type RegistryProject = components["schemas"]["RegistryProject"];
type RegistryScanResult = components["schemas"]["RegistryScanResult"];
type RegistryPurpose = "container" | "gpu" | "sandbox" | "system";
type RegistryImage = {
  project: string;
  repository: string;
  tag: string;
  image: string;
  purpose?: RegistryPurpose;
  digest: string;
  size_bytes: number;
  pull_command?: string;
  pushed_at: string;
  scan_status: RegistryScanResult;
};
type RegistryImageListResponse = {
  items: RegistryImage[];
  total: number;
  next_cursor?: string | null;
};
type RegistryPushInstructions = {
  project: string;
  registry: string;
  repository_example: string;
  commands: Array<{ label: string; command: string }>;
};
type RegistryApiResponse<T> = Promise<{ data?: T; error?: unknown }>;

const PURPOSE_LABELS: Record<RegistryPurpose, string> = {
  container: "容器镜像",
  gpu: "GPU 镜像",
  sandbox: "沙箱镜像",
  system: "系统镜像",
};

function copyText(value: string, success: string) {
  void navigator.clipboard
    .writeText(value)
    .then(() => Message.success(success));
}

function scanSummary(scan: RegistryScanResult) {
  if (scan.status === "not_scanned") return "未扫描";
  if (scan.status === "pending" || scan.status === "running") return "扫描中";
  if (scan.status === "failed") return "扫描失败";
  if (scan.critical || scan.high)
    return `严重 ${scan.critical} · 高危 ${scan.high}`;
  return "未发现高危漏洞";
}

function RegistryPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [purpose, setPurpose] = useState<"all" | RegistryPurpose>("all");
  const [project, setProject] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [guideVisible, setGuideVisible] = useState(false);
  const [guideProject, setGuideProject] = useState("");
  const [guideRepository, setGuideRepository] = useState("demo/app");

  const projects = useQuery({
    queryKey: ["registry-projects"],
    queryFn: async () => {
      const { data, error } = await coreApi.GET("/registry/projects", {
        params: { query: { limit: 100 } },
      });
      if (error) throw error;
      return (data?.items ?? []) as RegistryProject[];
    },
  });
  const images = useQuery({
    queryKey: ["registry-images"],
    queryFn: async () => {
      const request = coreApi.GET as unknown as (
        path: string,
        options: { params: { query: { limit: number; cursor?: string } } },
      ) => RegistryApiResponse<RegistryImageListResponse>;
      const items: RegistryImage[] = [];
      let cursor: string | undefined;
      do {
        const { data, error } = await request("/registry/images", {
          params: { query: { limit: 100, cursor } },
        });
        if (error) throw error;
        items.push(...(data?.items ?? []));
        cursor = data?.next_cursor ?? undefined;
      } while (cursor);
      return items;
    },
  });
  const guide = useQuery({
    queryKey: ["registry-push-instructions", guideProject, guideRepository],
    queryFn: async () => {
      const request = coreApi.GET as unknown as (
        path: string,
        options: {
          params: { path: { project: string }; query: { repository: string } };
        },
      ) => RegistryApiResponse<RegistryPushInstructions>;
      const { data, error } = await request(
        "/registry/projects/{project}/push-instructions",
        {
          params: {
            path: { project: guideProject },
            query: { repository: guideRepository.trim() || "demo/app" },
          },
        },
      );
      if (error) throw error;
      return data;
    },
    enabled: guideVisible && !!guideProject,
  });

  useEffect(() => {
    if (!guideProject && projects.data?.[0])
      setGuideProject(projects.data[0].name);
  }, [guideProject, projects.data]);
  useEffect(() => setPage(1), [keyword, project, purpose]);

  const deleteTag = useMutation({
    mutationFn: async (item: RegistryImage) => {
      const request = coreApi.DELETE as unknown as (
        path: string,
        options: {
          params: {
            path: { project: string; repository: string; tag: string };
          };
        },
      ) => RegistryApiResponse<unknown>;
      const { error } = await request(
        "/registry/projects/{project}/repositories/{repository}/tags/{tag}",
        {
          params: {
            path: {
              project: item.project,
              repository: item.repository,
              tag: item.tag,
            },
          },
        },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["registry-images"] });
      Message.success("镜像 Tag 已删除");
    },
    onError: (error) => showApiError(error),
  });

  const filteredItems = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    return (images.data ?? []).filter(
      (item) =>
        (purpose === "all" || item.purpose === purpose) &&
        (project === "all" || item.project === project) &&
        (!query ||
          `${item.image} ${item.repository} ${item.tag} ${item.project}`
            .toLowerCase()
            .includes(query)),
    );
  }, [images.data, keyword, project, purpose]);
  const columns: Array<ListColumn<RegistryImage>> = [
    {
      key: "image",
      title: "镜像名",
      minWidth: 240,
      render: (item) => (
        <div>
          <Typography.Text className="block font-medium">
            {item.repository}
          </Typography.Text>
          <Typography.Text type="secondary" className="text-xs">
            {item.digest}
          </Typography.Text>
        </div>
      ),
    },
    {
      key: "purpose",
      title: "用途",
      width: 110,
      render: (item) => (item.purpose ? PURPOSE_LABELS[item.purpose] : "—"),
    },
    {
      key: "project",
      title: "项目",
      minWidth: 130,
      render: (item) => item.project,
    },
    { key: "tag", title: "Tag", minWidth: 120, render: (item) => item.tag },
    {
      key: "size",
      title: "大小",
      width: 100,
      render: (item) => formatBytes(item.size_bytes),
    },
    {
      key: "pushedAt",
      title: "推送时间",
      minWidth: 170,
      render: (item) => formatDateTime(item.pushed_at),
    },
    {
      key: "scan",
      title: "漏洞摘要",
      minWidth: 170,
      render: (item) => scanSummary(item.scan_status),
    },
  ];
  const goCreate = (item: RegistryImage) => {
    const target =
      item.purpose === "gpu"
        ? "/instances/gpu/create"
        : item.purpose === "sandbox"
          ? "/instances/sandbox/create"
          : item.purpose === "system"
            ? "/instances"
            : "/instances/container/create";
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
                onClick={() => void images.refetch()}
              />
            }
          />
        }
      >
        <DataTable
          rows={filteredItems.slice((page - 1) * pageSize, page * pageSize)}
          rowKey={(item) => `${item.project}/${item.repository}:${item.tag}`}
          columns={columns}
          selectable={false}
          loading={images.isLoading}
          error={
            images.error
              ? getErrorMessage(images.error, "镜像列表加载失败")
              : null
          }
          onRetry={() => void images.refetch()}
          preserveTableOnEmpty
          emptyIconClassName="icon-moxing"
          emptyText={
            keyword || purpose !== "all" || project !== "all"
              ? "没有符合条件的镜像"
              : "还没有镜像：按推送说明 docker push 入库后，再去创建实例"
          }
          tableLabel="镜像仓库列表"
          renderRowActions={(item) => (
            <ListRowActions>
              <ListRowActionButton
                onClick={() =>
                  copyText(
                    item.pull_command || `docker pull ${item.image}`,
                    "拉取命令已复制",
                  )
                }
              >
                拉取命令
              </ListRowActionButton>
              <ListRowActionButton onClick={() => goCreate(item)}>
                去创建
              </ListRowActionButton>
              <ListRowActionButton
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
              </ListRowActionButton>
            </ListRowActions>
          )}
          pagination={{
            page,
            pageSize,
            total: filteredItems.length,
            onPageChange: setPage,
            onPageSizeChange: (next) => {
              setPageSize(next);
              setPage(1);
            },
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
          镜像通过 docker push
          入库，不支持网页上传。项目由平台按当前租户自动创建，Console
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
              <div
                key={item.label}
                className="rounded border border-[var(--color-border-2)] p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <Typography.Text className="font-medium">
                    {item.label}
                  </Typography.Text>
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
          <Typography.Text type="secondary">
            当前租户项目暂不可用，请刷新后重试。
          </Typography.Text>
        )}
      </Modal>
    </>
  );
}
