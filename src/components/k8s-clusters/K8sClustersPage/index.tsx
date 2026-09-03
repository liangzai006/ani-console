import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Dropdown,
  Empty,
  Form,
  Grid,
  Input,
  Menu,
  Modal,
  Spin,
} from "@arco-design/web-react";
import { useEffect, useMemo, useState } from "react";
import { coreApi } from "@/api/client";
import {
  DetailPageFrame,
  AliIcon,
  StatusTag,
  DataTable,
  DetailPagePlaceholder,
  AsyncTaskPoller,
  ListDataTable,
  DataTableNameCell,
  ListPageFrame,
  ListPageHeader,
  DataTableRowActionButton,
  DataTableRowActions,
  ListToolbar,
  StatusTabs,
  ToolbarButton,
  ToolbarIconButton,
  ToolbarSearch,
  type ListColumn,
} from "@/components/common";
import { useIdempotencyScope } from "@/hooks/useIdempotencyScope";
import { showApiError } from "@/api/helpers";
import { asUncontractedQuery } from "@/api/uncontracted-query";
import { listOrThrow } from "@/lib/api-list";
import { formatDateTime } from "@/lib/format";
import { useCursorPaginatedQuery } from "@/hooks/useCursorPaginatedQuery";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";
import {
  getMockCluster,
  getMockNodePools,
  getMockWorkloads,
  K8S_MOCK_ENABLED,
  mockClusters,
} from "./mock-data";
import type { components } from "@/api/core-schema";

type Cluster = components["schemas"]["K8sCluster"];
type NodePool = components["schemas"]["K8sClusterNodePool"];
type ClusterStatusFilter = "all" | NonNullable<Cluster["state"]>;
type ClusterSearchField = "name" | "id";

export function K8sClustersPage() {
  return <ClusterList />;
}

function ClusterList() {
  const qc = useQueryClient();
  const createScope = useIdempotencyScope("k8s-cluster-create", ["POST"]);
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState("");
  const [version, setVersion] = useState("1.36.0");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<ClusterStatusFilter>("all");
  const [searchField, setSearchField] = useState<ClusterSearchField>("name");
  const [searchText, setSearchText] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const {
    query: clusters,
    page,
    pageSize,
    setPage,
    setPageSize,
    resetPagination,
    refresh,
  } = useCursorPaginatedQuery<Cluster>({
    queryKey: ["k8s-clusters", { status, searchField, searchText }],
    cursorScope: `${status}:${searchField}:${searchText.trim()}`,
    fetchPage: async ({ cursor, limit }) => {
      if (K8S_MOCK_ENABLED) {
        const offset = Number(cursor ?? 0);
        const items = mockClusters.slice(offset, offset + limit);
        const nextOffset = offset + items.length;
        return {
          items,
          total: mockClusters.length,
          next_cursor:
            nextOffset < mockClusters.length ? String(nextOffset) : null,
        };
      }
      const keyword = searchText.trim();
      const { data, error } = await coreApi.GET("/k8s-clusters", {
        params: { query: asUncontractedQuery({
          limit,
          cursor,
          status: status === "all" ? undefined : status,
          search_field: keyword ? searchField : undefined,
          keyword: keyword || undefined,
        }) },
      });
      if (error || !data) throw error ?? new Error("K8s 集群列表未返回结果");
      return {
        items: data.items ?? [],
        total: data.total ?? 0,
        next_cursor: data.next_cursor,
      };
    },
  });
  const { data, isFetching, error } = clusters;
  useListErrorNotification({
    id: "k8s-clusters-list",
    title: "K8s 集群列表加载失败",
    error,
  });

  const createCluster = useMutation({
    mutationFn: async () => {
      const submitData = { name, version: version || undefined };
      const { response, error } = await coreApi.POST("/k8s-clusters", {
        body: createScope.withKey(submitData),
      });
      if (error) throw error;
      const loc = response.headers.get("Location");
      const tid = loc?.match(/tasks\/([^/]+)/)?.[1];
      if (tid) setTaskId(tid);
    },
    onSuccess: () => {
      createScope.reset();
      setVisible(false);
      setName("");
      setVersion("1.36.0");
      resetPagination();
      qc.invalidateQueries({ queryKey: ["k8s-clusters"] });
    },
    onError: (e) => showApiError(e),
  });

  const downloadKubeconfig = useMutation({
    mutationFn: async (cluster: Cluster) => {
      const clusterId = cluster.id;
      if (!clusterId) throw new Error("缺少集群 ID");
      let content = `apiVersion: v1\nkind: Config\nclusters:\n- name: ${cluster.name ?? clusterId}\n`;
      if (!K8S_MOCK_ENABLED) {
        const { data, error } = await coreApi.GET(
          "/k8s-clusters/{cluster_id}/kubeconfig",
          {
            params: { path: { cluster_id: clusterId } },
          },
        );
        if (error) throw error;
        content =
          (data as { kubeconfig?: string })?.kubeconfig ??
          JSON.stringify(data, null, 2);
      }
      const url = URL.createObjectURL(
        new Blob([content], { type: "text/yaml" }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `kubeconfig-${clusterId}.yaml`;
      anchor.click();
      URL.revokeObjectURL(url);
    },
    onError: (e) => showApiError(e),
  });

  const deleteCluster = useMutation({
    mutationFn: async (cluster: Cluster) => {
      if (K8S_MOCK_ENABLED) return;
      if (!cluster.id) throw new Error("缺少集群 ID");
      const { error } = await coreApi.DELETE("/k8s-clusters/{cluster_id}", {
        params: { path: { cluster_id: cluster.id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      resetPagination();
      qc.invalidateQueries({ queryKey: ["k8s-clusters"] });
    },
    onError: (e) => showApiError(e),
  });

  const items = useMemo(() => (data?.items ?? []) as Cluster[], [data?.items]);
  const statusCounts = useMemo(
    () => ({
      all: items.length,
      provisioning: items.filter((item) => item.state === "provisioning")
        .length,
      running: items.filter((item) => item.state === "running").length,
      deleting: items.filter((item) => item.state === "deleting").length,
    }),
    [items],
  );
  const paginationTotal = data?.total ?? items.length;

  useEffect(() => {
    setPage(1);
    setSelectedKeys([]);
  }, [searchField, searchText, setPage, status]);

  const columns: Array<ListColumn<Cluster>> = [
    {
      key: "name",
      title: "名称 / ID",
      render: (_, cluster) => (
        <DataTableNameCell
          name={
            <Link
              to="/k8s-clusters/$clusterId"
              params={{ clusterId: cluster.id ?? "" }}
            >
              {cluster.name ?? cluster.id ?? "-"}
            </Link>
          }
          id={cluster.id ?? "-"}
        />
      ),
    },
    {
      key: "status",
      title: "状态",
      width: 120,
      render: (_, cluster) => <StatusTag status={cluster.state} />,
    },
    {
      key: "version",
      title: "Kubernetes 版本",
      render: (_, cluster) => cluster.version ?? "-",
    },
    {
      key: "createdAt",
      title: "创建时间",
      render: (_, cluster) => formatDateTime(cluster.created_at),
    },
    {
      key: "updatedAt",
      title: "更新时间",
      render: (_, cluster) => formatDateTime(cluster.updated_at),
    },
  ];

  return (
    <>
      <ListPageFrame
        header={
          <ListPageHeader
            iconClassName="icon-jiqun"
            title="K8s 集群"
            subtitle="创建和管理托管 Kubernetes 集群，统一维护版本、节点池与工作负载"
            extra={
              <ToolbarButton
                variant="primary"
                iconClassName="icon-add-1"
                onClick={() => setVisible(true)}
              >
                创建集群
              </ToolbarButton>
            }
          />
        }
        tabs={
          <StatusTabs
            value={status}
            onChange={setStatus}
            items={[
              { value: "all", label: "全部", count: statusCounts.all },
              {
                value: "running",
                label: "运行中",
                count: statusCounts.running,
              },
              {
                value: "provisioning",
                label: "创建中",
                count: statusCounts.provisioning,
              },
              {
                value: "deleting",
                label: "删除中",
                count: statusCounts.deleting,
              },
            ]}
          />
        }
        toolbar={
          <ListToolbar
            filters={
              <ToolbarSearch
                fields={[
                  { value: "name", label: "名称" },
                  { value: "id", label: "ID" },
                ]}
                field={searchField}
                value={searchText}
                onFieldChange={setSearchField}
                onChange={setSearchText}
              />
            }
            tools={
              <ToolbarIconButton
                iconClassName="icon-refresh-1"
                label="刷新"
                spinning={isFetching}
                onClick={refresh}
              />
            }
          />
        }
      >
        {taskId ? (
          <AsyncTaskPoller taskId={taskId} onComplete={() => setTaskId(null)} />
        ) : null}
        <ListDataTable
          data={items}
          rowKey={(cluster) => cluster.id ?? cluster.name ?? ""}
          columns={[
            ...columns,
            {
              key: "__actions",
              title: "操作",
              fixed: "right",
              render: (_value, cluster) => (
                <DataTableRowActions>
                  <DataTableRowActionButton
                    loading={downloadKubeconfig.isPending}
                    onClick={() => downloadKubeconfig.mutate(cluster)}
                  >
                    kubeconfig
                  </DataTableRowActionButton>
                  <Dropdown
                    trigger="click"
                    position="br"
                    droplist={
                      <Menu
                        onClickMenuItem={(key) => {
                          if (key !== "delete") return;
                          Modal.confirm({
                            title: "删除集群",
                            content: `确定删除「${cluster.name ?? cluster.id}」？此操作不可恢复。`,
                            onOk: () => deleteCluster.mutateAsync(cluster),
                          });
                        }}
                      >
                        <Menu.Item key="delete">删除</Menu.Item>
                      </Menu>
                    }
                  >
                    <DataTableRowActionButton>
                      更多
                      <i
                        className="iconfont icon-down-chevron-small"
                        aria-hidden="true"
                      />
                    </DataTableRowActionButton>
                  </Dropdown>
                </DataTableRowActions>
              ),
            },
          ]}
          rowSelection={{
            selectedRowKeys: selectedKeys,
            onChange: (keys) => setSelectedKeys(keys.map(String)),
          }}
          loading={isFetching}
          emptyIconClassName="icon-jiqun"
          emptyText={
            searchText || status !== "all"
              ? "没有符合条件的 K8s 集群"
              : "还没有 K8s 集群，点击「创建集群」开始"
          }
          tableLabel="K8s 集群列表"
          preserveTableOnEmpty
          pagination={{
            page,
            pageSize,
            total: paginationTotal,
            onPageChange: (nextPage) => {
              setPage(nextPage);
              setSelectedKeys([]);
            },
            onPageSizeChange: (nextPageSize) => {
              setPageSize(nextPageSize);
              setSelectedKeys([]);
            },
          }}
        />
      </ListPageFrame>
      <Modal
        visible={visible}
        title="创建集群"
        onCancel={() => {
          createScope.reset();
          setVisible(false);
        }}
        onOk={() => createCluster.mutateAsync()}
        confirmLoading={createCluster.isPending}
      >
        <Form layout="vertical">
          <Form.Item label="名称" required>
            <Input value={name} onChange={setName} placeholder="集群名称" />
          </Form.Item>
          <Form.Item label="版本">
            <Input value={version} onChange={setVersion} placeholder="1.36.0" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

export function ClusterDetail({
  clusterId,
  onBack,
}: {
  clusterId: string;
  onBack: () => void;
}) {
  const qc = useQueryClient();

  const detail = useQuery({
    queryKey: ["k8s-cluster", clusterId],
    queryFn: async () => {
      if (K8S_MOCK_ENABLED) return getMockCluster(clusterId);
      const { data, error } = await coreApi.GET("/k8s-clusters/{cluster_id}", {
        params: { path: { cluster_id: clusterId } },
      });
      if (error) throw error;
      return data;
    },
  });

  const nodePools = useQuery({
    queryKey: ["k8s-node-pools", clusterId],
    queryFn: () =>
      K8S_MOCK_ENABLED
        ? Promise.resolve({
            items: getMockNodePools(clusterId),
            total: getMockNodePools(clusterId).length,
            next_cursor: null,
          })
        : listOrThrow(() =>
            coreApi.GET("/k8s-clusters/{cluster_id}/node-pools", {
              params: { path: { cluster_id: clusterId } },
            }),
          ),
  });

  const workloads = useQuery({
    queryKey: ["k8s-workloads", clusterId],
    queryFn: () =>
      K8S_MOCK_ENABLED
        ? Promise.resolve({
            items: getMockWorkloads(),
            total: getMockWorkloads().length,
            next_cursor: null,
          })
        : listOrThrow(() =>
            coreApi.GET("/k8s-clusters/{cluster_id}/workloads", {
              params: { path: { cluster_id: clusterId } },
            }),
          ),
  });
  useListErrorNotification({
    id: `k8s-cluster-detail:${clusterId}`,
    title: "K8s 集群加载失败",
    error: detail.error,
  });
  useListErrorNotification({
    id: `k8s-node-pools:${clusterId}`,
    title: "节点池加载失败",
    error: nodePools.error,
  });
  useListErrorNotification({
    id: `k8s-workloads:${clusterId}`,
    title: "工作负载加载失败",
    error: workloads.error,
  });

  const downloadKubeconfig = useMutation({
    mutationFn: async () => {
      const { data, error } = await coreApi.GET(
        "/k8s-clusters/{cluster_id}/kubeconfig",
        {
          params: { path: { cluster_id: clusterId } },
        },
      );
      if (error) throw error;
      const blob = new Blob(
        [(data as { kubeconfig?: string })?.kubeconfig ?? ""],
        { type: "text/yaml" },
      );
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `kubeconfig-${clusterId}.yaml`;
      a.click();
    },
    onError: (e) => showApiError(e),
  });

  const deleteCluster = useMutation({
    mutationFn: async () => {
      const { error } = await coreApi.DELETE("/k8s-clusters/{cluster_id}", {
        params: { path: { cluster_id: clusterId } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      onBack();
      qc.invalidateQueries({ queryKey: ["k8s-clusters"] });
    },
    onError: (e) => showApiError(e),
  });

  if (detail.isLoading && !detail.data) {
    return (
      <div
        className="flex min-h-[480px] items-center justify-center"
        role="status"
        aria-label="正在加载 K8s 集群详情"
      >
        <Spin tip="正在加载集群详情…" />
      </div>
    );
  }

  if (!detail.data)
    return (
      <DetailPagePlaceholder
        breadcrumbs={[{ label: "算力" }, { label: "K8s 集群" }, { label: clusterId }]}
        title={clusterId}
        idLabel="集群 ID"
        idValue={clusterId}
      />
    );

  const c = detail.data;
  const poolItems = (nodePools.data?.items ?? []) as NodePool[];
  const workloadItems = (workloads.data?.items ?? []) as Record<
    string,
    unknown
  >[];

  const confirmDeleteCluster = () => {
    Modal.confirm({
      title: "删除集群",
      content: `确定删除「${c?.name ?? clusterId}」？此操作不可恢复。`,
      onOk: () => deleteCluster.mutateAsync(),
    });
  };

  const nodePoolTab = (
    <div>
      <DataTable<NodePool>
        columns={[
          { title: "名称", dataIndex: "name" },
          { title: "规格", dataIndex: "instance_type" },
          { title: "状态", width: 120, render: (_, r) => <StatusTag status={r.state} /> },
        ]}
        data={poolItems}
        loading={nodePools.isLoading}
        pagination={false}
        noDataElement={<Empty description="暂无节点池，点击上方创建" />}
      />
    </div>
  );

  const workloadTab = (
    <DataTable<Record<string, unknown>>
      columns={[
        { title: "名称", dataIndex: "name" },
        { title: "类型", dataIndex: "kind" },
        { title: "命名空间", dataIndex: "namespace" },
        { title: "副本", dataIndex: "replicas" },
        { title: "就绪副本", dataIndex: "ready_replicas" },
        {
          title: "状态",
          width: 120,
          render: (_, r) => <StatusTag status={String(r.status ?? "")} />,
        },
      ]}
      data={workloadItems}
      loading={workloads.isLoading}
      rowKey={(row) =>
        `${String(row.namespace ?? "")}/${String(row.kind ?? "")}/${String(row.name ?? "")}`
      }
      pagination={false}
      noDataElement={<Empty description="暂无工作负载" />}
    />
  );

  const deploymentCount = workloadItems.filter(
    (item) => item.kind === "Deployment",
  ).length;
  const podCount = workloadItems.reduce(
    (total, item) => total + Number(item.ready_replicas ?? 0),
    0,
  );
  const serviceCount = 0;

  const nodeCount = poolItems.reduce(
    (total, pool) => total + Number(pool.node_count ?? 0),
    0,
  );

  return (
    <>
      <DetailPageFrame
        breadcrumbs={[
          { label: "K8s 集群", to: "/k8s-clusters" },
          { label: c?.name ?? clusterId },
        ]}
        icon={<AliIcon name="jiqun" size={28} />}
        title={c?.name ?? clusterId}
        status={<StatusTag status={c?.state} />}
        headerItems={[
          { label: "规格", value: "-" },
          { label: "K8s 版本", value: c?.version ?? "-" },
          { label: "节点数", value: nodeCount },
        ]}
        actions={
          <Button type="outline" status="danger" onClick={confirmDeleteCluster}>
            删除
          </Button>
        }
        cards={[
          {
            key: "basic",
            title: "基本信息",
            fields: [
              { label: "ID", value: c?.id ?? clusterId },
              { label: "状态", value: <StatusTag status={c?.state} /> },
              { label: "规格", value: "-" },
              { label: "K8s 版本", value: c?.version ?? "-" },
              { label: "节点数", value: nodeCount },
              { label: "创建时间", value: formatDateTime(c?.created_at) },
              { label: "关联对象", value: "1 个" },
            ],
          },
          {
            key: "related",
            title: "关联摘要",
            fields: [{ label: "关联对象", value: "1 个" }],
            defaultCollapsed: true,
          },
        ]}
        tabs={[
          { key: "nodes", label: "节点", content: nodePoolTab },
          {
            key: "workloads",
            label: "工作负载",
            content: (
              <div>
                <Grid.Row gutter={16} className="mb-4">
                  <Grid.Col span={8}>
                    <Card title="Deployments">{deploymentCount}</Card>
                  </Grid.Col>
                  <Grid.Col span={8}>
                    <Card title="Pods">{podCount}</Card>
                  </Grid.Col>
                  <Grid.Col span={8}>
                    <Card title="Services">{serviceCount}</Card>
                  </Grid.Col>
                </Grid.Row>
                {workloadTab}
              </div>
            ),
          },
          {
            key: "kubeconfig",
            label: "kubeconfig",
            content: (
              <Button
                type="primary"
                loading={downloadKubeconfig.isPending}
                onClick={() => downloadKubeconfig.mutateAsync()}
              >
                下载 Kubeconfig
              </Button>
            ),
          },
          {
            key: "events",
            label: "事件",
            content: <Empty description="暂无集群事件" />,
          },
        ]}
        onBack={onBack}
      />
    </>
  );
}
