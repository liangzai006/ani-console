import { useNavigate } from "@tanstack/react-router";
import {
  navigateToResourceDetail,
  type KnowledgeBaseDetailSearch,
  type ResourceDetailTypeWithoutSearch,
  type VectorStoreDetailSearch,
} from "@/lib/resources";
import { ResourceId } from "../ResourceId";
import styles from "./index.module.css";

type ResourceNameIdBaseProps = {
  name: string;
  id?: string | null;
  openable?: boolean;
};

export type ResourceNameIdProps = ResourceNameIdBaseProps &
  (
    | { type?: ResourceDetailTypeWithoutSearch; search?: never }
    | { type: "knowledge-base"; search: KnowledgeBaseDetailSearch }
    | { type: "vector-store"; search: VectorStoreDetailSearch }
  );

export function ResourceNameId(props: ResourceNameIdProps) {
  const { name, id, openable = true } = props;
  const navigate = useNavigate();
  const canOpen = openable && Boolean(props.type && id && id !== "-");

  const handleOpen = () => {
    if (!openable || !props.type || !id || id === "-") return;
    if (props.type === "knowledge-base") {
      navigateToResourceDetail(navigate, { type: props.type, id, search: props.search });
      return;
    }
    if (props.type === "vector-store") {
      navigateToResourceDetail(navigate, { type: props.type, id, search: props.search });
      return;
    }
    navigateToResourceDetail(navigate, { type: props.type, id });
  };

  return (
    <div className={styles.nameCell}>
      <span className={styles.name}>
        {canOpen ? (
          <button type="button" className={styles.nameButton} onClick={handleOpen}>
            {name}
          </button>
        ) : (
          name
        )}
      </span>
      <span className={styles.nameId}>{id && id !== "-" ? <ResourceId value={id} /> : "-"}</span>
    </div>
  );
}
