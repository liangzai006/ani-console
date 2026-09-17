import { useNavigate } from "@tanstack/react-router";
import { Empty, Input } from "@arco-design/web-react";
import { IconApps, IconClose, IconRight, IconSearch } from "@arco-design/web-react/icon";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import {
  isGroupItem,
  productGroupSections,
  sidebarItemsForTopNavKey,
  visibleMenuItems,
  type MenuItem,
} from "../navigation";

interface ProductServicesPanelProps {
  visible: boolean;
  onClose: () => void;
}

type ProductGroup = MenuItem & { children: MenuItem[] };

const productGroups = visibleMenuItems(sidebarItemsForTopNavKey("products") ?? []).filter(
  isGroupItem,
);

function includesKeyword(item: MenuItem, keyword: string): boolean {
  return (
    item.label.toLocaleLowerCase().includes(keyword) ||
    Boolean(item.children?.some((entry) => includesKeyword(entry, keyword)))
  );
}

function filterGroup(group: ProductGroup, keyword: string): ProductGroup | null {
  if (!keyword || group.label.toLocaleLowerCase().includes(keyword)) return group;
  const children = group.children.filter((item) => includesKeyword(item, keyword));
  return children.length ? { ...group, children } : null;
}

export function ProductServicesPanel({ visible, onClose }: ProductServicesPanelProps) {
  const navigate = useNavigate();
  const [activeGroupId, setActiveGroupId] = useState("all");
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    if (!visible) return;
    setActiveGroupId("all");
    setKeyword("");
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, visible]);

  const visibleGroups = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase();
    const matches: ProductGroup[] = [];
    for (const group of productGroups) {
      if (activeGroupId !== "all" && group.key !== activeGroupId) continue;
      const filteredGroup = filterGroup(group, normalizedKeyword);
      if (filteredGroup) matches.push(filteredGroup);
    }
    return matches;
  }, [activeGroupId, keyword]);

  const openProduct = (path?: string) => {
    if (!path) return;
    onClose();
    navigate({ to: path });
  };

  if (!visible) return null;

  return (
    <div
      id="product-services-panel"
      className="product-services-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="products-title"
    >
      <button
        type="button"
        className="product-services-mask"
        aria-label="关闭产品与服务面板"
        onClick={onClose}
      />
      <div className="product-services-body">
        <nav className="product-services-tabs" aria-label="产品模块快速筛选">
          <button
            type="button"
            className={clsx("product-services-tab", activeGroupId === "all" && "is-active")}
            aria-pressed={activeGroupId === "all"}
            onClick={() => setActiveGroupId("all")}
          >
            <IconApps />
            <span>全部总览</span>
          </button>
          {productGroupSections.map((section) => (
            <div key={section.label} className="product-services-domain">
              <div className="product-services-domain-title">{section.label}</div>
              {productGroups
                .filter((group) => section.groupKeys.some((key) => key === group.key))
                .map((group) => (
                  <button
                    key={group.key}
                    type="button"
                    className={clsx(
                      "product-services-tab",
                      activeGroupId === group.key && "is-active",
                    )}
                    aria-pressed={activeGroupId === group.key}
                    onClick={() => setActiveGroupId(group.key)}
                  >
                    {group.icon}
                    <span>{group.label}</span>
                  </button>
                ))}
            </div>
          ))}
        </nav>

        <section className="product-services-content">
          <header className="product-services-header">
            <div className="product-services-title-row">
              <h2 id="products-title">产品与服务</h2>
              <button
                type="button"
                className="product-services-close"
                aria-label="关闭"
                onClick={onClose}
              >
                <IconClose />
              </button>
            </div>
            <Input
              className="product-services-search"
              prefix={<IconSearch />}
              value={keyword}
              allowClear
              placeholder="请输入关键词"
              aria-label="搜索产品与服务"
              onChange={setKeyword}
            />
          </header>

          <div className="product-services-cards">
            {visibleGroups.length ? (
              visibleGroups.map((group) => (
                <article key={group.key} className="product-services-card">
                  <h3 className="product-services-card-title">
                    <span className="product-services-card-icon">{group.icon}</span>
                    <span>{group.label}</span>
                  </h3>
                  <div className="product-services-card-grid">
                    {group.children.map((item) => (
                      <div key={item.key} className="product-services-card-column">
                        {isGroupItem(item) ? (
                          <>
                            <div className="product-services-parent-label">{item.label}</div>
                            <div className="product-services-sub-links">
                              {item.children.map((entry) => (
                                <button
                                  key={entry.key}
                                  type="button"
                                  className="product-services-link"
                                  onClick={() => openProduct(entry.key)}
                                >
                                  <span>{entry.label}</span>
                                  <IconRight />
                                </button>
                              ))}
                            </div>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="product-services-link"
                            onClick={() => openProduct(item.key)}
                          >
                            <span>{item.label}</span>
                            <IconRight />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </article>
              ))
            ) : (
              <div className="product-services-empty">
                <Empty description="暂无匹配的产品或服务" />
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
