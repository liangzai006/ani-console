import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { memo } from "react";
import "@assistant-ui/react-markdown/styles/dot.css";
import styles from "./KnowledgeMarkdownText.module.css";

function KnowledgeMarkdownTextImpl() {
  return (
    <MarkdownTextPrimitive
      className={styles.markdown}
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, rehypeSanitize]}
      defer
    />
  );
}

export const KnowledgeMarkdownText = memo(KnowledgeMarkdownTextImpl);
