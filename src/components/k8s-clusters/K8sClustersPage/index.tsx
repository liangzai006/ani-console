import { downloadBlob } from "@/lib/browser";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Form, Input, Modal } from "@arco-design/web-react";
import { useEffect, useMemo, useState } from "react";
import {
  createK8sCluster,
  deleteK8sCluster,
  getK8sClusterKubeconfig,
  listK8sClusters,
  type K8sCluster,
} from "@/api/k8s-clusters";
import {
  StatusTag,
  ResourceNameId,
  ListPageFrame,
  type ListColumn,
  ListDataTable,
} from "@/components/common";

import { formatDateTime } from "@/lib/format";
import { useCursorPaginatedQuery } from "@/hooks/useCursorPaginatedQuery";
type Cluster = K8sCluster;
type ClusterStatusFilter = "all" | NonNullable<Cluster["state"]>;
type ClusterSearchField = "name" | "id";

export function K8sClustersPage() {
  return <ClusterList />;
}

function ClusterList() {
  const qc = useQueryClient();
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState("");
  const [version, setVersion] = useState("1.36.0");
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
    errorNotification: {
      id: "k8s-clusters",
      action: "K8s 集群列表加载",
      fallback: "请求失败，请稍后重试",
    },
    queryKey: ["k8s-clusters", { status, searchField, searchText }],
    cursorScope: `${status}:${searchField}:${searchText.trim()}`,
    fetchPage: async ({ cursor, limit }) => {
      const keyword = searchText.trim();
      const data = await listK8sClusters({
        limit,
        cursor,
        status: status === "all" ? undefined : status,
        search_field: keyword ? searchField : undefined,
        keyword: keyword || undefined,
      });
      return {
        items: data.items ?? [],
        total: data.total ?? 0,
        next_cursor: data.next_cursor,
      };
    },
  });
  const { data, isFetching } = clusters;
  const createCluster = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "k8s-cluster-create",
        action: "创建",
        errorFallback: "请求失败",
      },
    },
    mutationFn: () => createK8sCluster({ name, version: version || undefined }),
    onSuccess: () => {
      setVisible(false);
      setName("");
      setVersion("1.36.0");
      resetPagination();
      qc.invalidateQueries({ queryKey: ["k8s-clusters"] });
    },
  });

  const downloadKubeconfig = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "kubeconfig-download",
        action: "操作",
        errorFallback: "请求失败",
      },
    },
    mutationFn: async (cluster: Cluster) => {
      const clusterId = cluster.id;
      if (!clusterId) throw new Error("缺少集群 ID");
      const data = await getK8sClusterKubeconfig(clusterId);
      const content = data.kubeconfig ?? JSON.stringify(data, null, 2);
      downloadBlob(new Blob([content], { type: "text/yaml" }), `kubeconfig-${clusterId}.yaml`);
    },
  });

  const deleteCluster = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "k8s-cluster-delete",
        action: "删除",
        errorFallback: "请求失败",
      },
    },
    mutationFn: async (cluster: Cluster) => {
      if (!cluster.id) throw new Error("缺少集群 ID");
      await deleteK8sCluster(cluster.id);
    },
    onSuccess: () => {
      resetPagination();
      qc.invalidateQueries({ queryKey: ["k8s-clusters"] });
    },
  });

  const items = useMemo(() => (data?.items ?? []) as Cluster[], [data?.items]);
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
        <ResourceNameId
          name={cluster.name ?? cluster.id ?? "-"}
          id={cluster.id ?? "-"}
          type="k8s-cluster"
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
      dataIndex: "version",
      placeholder: "-",
    },
    {
      key: "createdAt",
      title: "创建时间",
      width: 150,
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
        header={{
          iconClassName: "icon-jiqun",
          title: "K8s 集群",
          subtitle: "创建和管理托管 Kubernetes 集群，统一维护版本、节点池与工作负载",
          actions: [
            {
              key: "header-action-1",
              label: "创建集群",
              iconClassName: "icon-add-1",
              variant: "primary",
              onClick: () => setVisible(true),
            },
          ],
        }}
        tabs={{
          value: status,
          onChange: setStatus,
          items: [
            {
              value: "all",
              label: "全部",
            },
            {
              value: "running",
              label: "运行中",
            },
            {
              value: "provisioning",
              label: "创建中",
            },
            {
              value: "deleting",
              label: "删除中",
            },
          ],
        }}
        toolbar={{
          search: {
            fields: [
              {
                value: "name",
                label: "名称",
              },
              {
                value: "id",
                label: "ID",
              },
            ],
            field: searchField,
            value: searchText,
            onFieldChange: setSearchField,
            onChange: setSearchText,
          },
          refresh: {
            label: "刷新",
            spinning: isFetching,
            onClick: refresh,
          },
        }}
      >
        <ListDataTable
          data={items}
          rowKey={(cluster) => cluster.id ?? cluster.name ?? ""}
          columns={columns}
          rowActions={[
            {
              key: "kubeconfig",
              label: "kubeconfig",
              loading: () => downloadKubeconfig.isPending,
              onClick: (cluster) => downloadKubeconfig.mutate(cluster),
            },
            {
              key: "delete",
              label: "删除",
              intent: "danger",
              onClick: (cluster) =>
                void Modal.confirm({
                  title: "删除集群",
                  content: `确定删除「${cluster.name ?? cluster.id}」？此操作不可恢复。`,
                  okButtonProps: { status: "danger" },
                  onOk: () => deleteCluster.mutateAsync(cluster),
                }),
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
