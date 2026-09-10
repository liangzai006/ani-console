import {
  createSandboxToken,
  type InstanceRecord,
  type SandboxTokenResponse,
} from "@/api/instances";
import {
  Alert,
  Button,
  Checkbox,
  Descriptions,
  Form,
  Input,
  Message,
  Modal,
  Select,
  Space,
} from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { formatDateTime } from "@/lib/format";
import { copySandboxText, showSandboxError } from "../../utils";

type SandboxInstance = InstanceRecord;
type SandboxToken = SandboxTokenResponse;
type TokenScope = SandboxToken["scopes"][number];

const TOKEN_SCOPE_OPTIONS = [
  { label: "连接", value: "connect" },
  { label: "终端", value: "exec" },
  { label: "文件", value: "files" },
  { label: "端口", value: "ports" },
];

export function SandboxTokenIssueModal({
  instance,
  visible,
  onCancel,
}: {
  instance: SandboxInstance;
  visible: boolean;
  onCancel: () => void;
}) {
  const [token, setToken] = useState<SandboxToken>();
  const [tokenExpiresIn, setTokenExpiresIn] = useState("15m");
  const [tokenScopes, setTokenScopes] = useState<TokenScope[]>(["connect"]);

  const issueToken = useMutation({
    mutationFn: async () => {
      const submitData = {
        expires_in: tokenExpiresIn,
        scopes: tokenScopes,
      };
      return createSandboxToken(instance.id, submitData);
    },
    onSuccess: (data) => {
      setToken(data);
      Message.success("短期连接令牌已签发，请复制后关闭弹窗");
    },
    onError: (error) => showSandboxError(error, "连接令牌签发失败"),
  });

  const closeModal = () => {
    if (issueToken.isPending) return;
    setToken(undefined);
    onCancel();
  };

  return (
    <Modal
      title="签发短期连接令牌"
      visible={visible}
      onCancel={closeModal}
      footer={
        token ? (
          <Space>
            <Button onClick={() => copySandboxText(token.token, "令牌已复制")}>复制令牌</Button>
            <Button type="primary" onClick={closeModal}>
              我已复制，关闭
            </Button>
          </Space>
        ) : (
          <Space>
            <Button disabled={issueToken.isPending} onClick={closeModal}>
              取消
            </Button>
            <Button
              type="primary"
              loading={issueToken.isPending}
              disabled={tokenScopes.length === 0}
              onClick={() => issueToken.mutate()}
            >
              签发令牌
            </Button>
          </Space>
        )
      }
      unmountOnExit
    >
      {token ? (
        <Space direction="vertical" size={16} className="w-full">
          <Alert
            type="warning"
            content="令牌仅显示一次。请先复制并安全保存，然后点击“我已复制，关闭”完成操作。"
          />
          <Input.TextArea
            aria-label="短期连接令牌"
            value={token.token}
            readOnly
            autoSize={{ minRows: 2, maxRows: 4 }}
          />
          <Descriptions
            column={{ xs: 1, md: 2 }}
            data={[
              {
                label: "过期时间",
                value: formatDateTime(token.expires_at),
              },
              { label: "授权范围", value: token.scopes.join("、") },
            ]}
          />
        </Space>
      ) : (
        <Form layout="vertical" disabled={issueToken.isPending}>
          <Form.Item label="有效期">
            <Select
              value={tokenExpiresIn}
              onChange={setTokenExpiresIn}
              options={[
                { label: "15 分钟", value: "15m" },
                { label: "30 分钟", value: "30m" },
                { label: "1 小时", value: "1h" },
              ]}
            />
          </Form.Item>
          <Form.Item label="授权范围">
            <Checkbox.Group
              options={TOKEN_SCOPE_OPTIONS}
              value={tokenScopes}
              onChange={(value) => setTokenScopes(value as TokenScope[])}
            />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}
