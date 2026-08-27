import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Tooltip } from "@arco-design/web-react";
import { useMemo, useState } from "react";
import { coreApi } from "@/api/client";
import type { components } from "@/api/core-schema";
import { CreateBucketModal } from "@/components/storage/CreateBucketModal";
import {
  ListDataTable,
  ListNameCell,
  ListPageFrame,
  ListPageHeader,
  ListRowActionButton,
  ListRowActions,
  ListToolbar,
  ToolbarButton,
  ToolbarIconButton,
  ToolbarSearch,
  type ListColumn,
} from "@/components/common";
import { useCursorPaginatedQuery } from "@/hooks/useCursorPaginatedQuery";
import { useListErrorNotification } from "@/hooks/useListErrorNotification";
import { formatBytes, formatDateTime } from "@/lib/format";

type Bucket = components["schemas"]["StorageBucketRecord"];
type SearchField = "name" | "id";

export const Route = createFileRoute("/_authenticated/objects/")({
  component: ObjectsPage,
});

function ObjectsPage() {
  const navigate = useNavigate();
  const [createVisible, setCreateVisible] = useState(false);
  const [searchField, setSearchField] = useState<SearchField>("name");
  const [searchText, setSearchText] = useState("");
  const {
    query: buckets,
    page,
    pageSize,
    setPage,
    setPageSize,
    refresh,
  } = useCursorPaginatedQuery<Bucket>({
    queryKey: ["buckets"],
    cursorScope: `${searchField}:${searchText.trim()}`,
    fetchPage: async ({ cursor, limit }) => {
      const { data, error } = await coreApi.GET("/buckets", {
        params: { query: { limit, cursor } },
      });
      if (error || !data) throw error ?? new Error("对象存储桶列表未返回结果");
      return data;
    },
  });
  const items = (buckets.data?.items ?? []) as Bucket[];
  const filteredItems = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    return items.filter(
      (item) =>
        !keyword || String(item[searchField]).toLowerCase().includes(keyword),
    );
  }, [items, searchField, searchText]);
  const paginationTotal = buckets.data?.total ?? filteredItems.length;
  useListErrorNotification({
    id: "buckets-list",
    title: "对象存储桶列表加载失败",
    error: buckets.error,
    onRetry: refresh,
  });

  const columns: Array<ListColumn<Bucket>> = [
    {
      key: "name",
      title: "名称 / ID",
      render: (_, item) => (
        <ListNameCell
          name={
            <Link to="/objects/$bucketId" params={{ bucketId: item.id }}>
              {item.name}
            </Link>
          }
          id={item.id}
        />
      ),
    },
    {
      key: "acl",
      title: "权限",
      render: (_, item) => (item.acl === "tenant_read" ? "租户内读" : "私有"),
    },
    {
      key: "storageClass",
      title: "存储类型",
      render: (_, item) =>
        item.storage_class === "infrequent_access" ? "低频" : "标准",
    },
    {
      key: "region",
      title: "Region",
      render: (_, item) => item.region ?? "—",
    },
    {
      key: "objectCount",
      title: "对象数",
      render: (_, item) => item.object_count ?? 0,
    },
    {
      key: "sizeBytes",
      title: "总大小",
      render: (_, item) => formatBytes(item.size_bytes),
    },
    {
      key: "createdAt",
      title: "创建时间",
      render: (_, item) => formatDateTime(item.created_at),
    },
  ];

  return (
    <>
      <ListPageFrame
        header={
          <ListPageHeader
            iconClassName="icon-duixiangcunchu1"
            title="对象存储"
            subtitle="S3 兼容存储桶，用于保存非结构化对象数据"
            extra={
              <ToolbarButton
                variant="primary"
                iconClassName="icon-add-1"
                onClick={() => setCreateVisible(true)}
              >
                创建存储桶
              </ToolbarButton>
            }
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
                spinning={buckets.isFetching}
                onClick={refresh}
              />
            }
          />
        }
      >
        <ListDataTable
          data={filteredItems}
          columns={[
            ...columns,
            {
              key: "__actions",
              title: "操作",
              fixed: "right",
              render: (_value, item) => (
                <ListRowActions>
                  <ListRowActionButton
                    onClick={() =>
                      navigate({
                        to: "/objects/$bucketId",
                        params: { bucketId: item.id },
                        search: { tab: "objects" },
                      })
                    }
                  >
                    浏览器
                  </ListRowActionButton>
                  <ListRowActionButton
                    onClick={() =>
                      navigate({
                        to: "/objects/$bucketId",
                        params: { bucketId: item.id },
                        search: { tab: "objects", action: "upload" },
                      })
                    }
                  >
                    上传
                  </ListRowActionButton>
                  <ListRowActionButton
                    onClick={() =>
                      navigate({
                        to: "/objects/$bucketId",
                        params: { bucketId: item.id },
                        search: { tab: "permissions" },
                      })
                    }
                  >
                    改权限
                  </ListRowActionButton>
                  <Tooltip content="ANI 当前未提供删除存储桶接口">
                    <span>
                      <ListRowActionButton status="danger" disabled>
                        删除
                      </ListRowActionButton>
                    </span>
                  </Tooltip>
                </ListRowActions>
              ),
            },
          ]}
          loading={buckets.isLoading}
          emptyIconClassName="icon-duixiangcunchu1"
          emptyText={
            searchText
              ? "没有符合条件的存储桶"
              : "还没有存储桶，点击「创建存储桶」开始"
          }
          tableLabel="对象存储桶列表"
          preserveTableOnEmpty
          pagination={{
            page,
            pageSize,
            total: paginationTotal,
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
          }}
        />
      </ListPageFrame>
      <CreateBucketModal
        visible={createVisible}
        onCancel={() => setCreateVisible(false)}
      />
    </>
  );
}
