import type { AsyncTask } from "@/api/tasks";
import { createSandboxCodeRun, type SandboxCodeRun } from "@/api/instances";
import {
  Alert,
  Button,
  Descriptions,
  Empty,
  Form,
  Input,
  InputNumber,
  Message,
  Select,
  Space,
  Tag,
  Typography,
} from "@arco-design/web-react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { formatDateTime } from "@/lib/format";
import { showSandboxError } from "../utils";

type Language = "python" | "javascript";

const SAMPLES: Record<Language, string> = {
  python: 'print("Hello from ANI Sandbox")',
  javascript: 'console.log("Hello from ANI Sandbox")',
};

export function SandboxCodeRunner({
  instanceId,
  running,
  onChanged,
}: {
  instanceId: string;
  running: boolean;
  onChanged: () => void;
}) {
  const [language, setLanguage] = useState<Language>("python");
  const [code, setCode] = useState(SAMPLES.python);
  const [stdin, setStdin] = useState("");
  const [timeoutSeconds, setTimeoutSeconds] = useState(60);
  const [lastTask, setLastTask] = useState<AsyncTask>();
  const [runs, setRuns] = useState<SandboxCodeRun[]>([]);

  const execute = useMutation({
    mutationFn: async () => {
      const submitData = {
        language,
        code: code.trim(),
        timeout_seconds: timeoutSeconds,
        stdin: stdin || undefined,
      };
      return createSandboxCodeRun(instanceId, submitData);
    },
    onSuccess: (task) => {
      setLastTask(task);
      const result = (task.result as unknown as { code_run?: SandboxCodeRun } | undefined)
        ?.code_run;
      if (result) {
        setRuns((current) => [result, ...current].slice(0, 10));
        Message.success(result.status === "succeeded" ? "代码执行完成" : "代码执行已返回");
      } else {
        Message.success("代码执行任务已提交");
      }
      onChanged();
    },
    onError: (error) => showSandboxError(error, "代码执行失败"),
  });

  const lastRun = runs[0];

  return (
    <Space direction="vertical" size={24} className="w-full">
      <Alert
        type="info"
        content="代码在隔离的 Sandbox 运行环境中执行，单次最长 300 秒。提交代码会同时刷新空闲计时。"
      />
      {!running ? <Alert type="warning" content="仅运行中的 Sandbox 可以执行代码。" /> : null}

      <section>
        <Typography.Title heading={6}>代码</Typography.Title>
        <Form layout="vertical">
          <div className="grid gap-4 lg:grid-cols-[180px_180px_minmax(0,1fr)]">
            <Form.Item label="语言" required>
              <Select
                value={language}
                onChange={(next: Language) => setLanguage(next)}
                options={[
                  { label: "Python", value: "python" },
                  { label: "JavaScript", value: "javascript" },
                ]}
              />
            </Form.Item>
            <Form.Item label="超时（秒）" required>
              <InputNumber
                value={timeoutSeconds}
                min={1}
                max={300}
                precision={0}
                onChange={(value) => setTimeoutSeconds(Number(value) || 1)}
              />
            </Form.Item>
            <Form.Item label="标准输入（可选）">
              <Input value={stdin} onChange={setStdin} placeholder="传给程序的 stdin" />
            </Form.Item>
          </div>
          <Form.Item label="代码内容" required>
            <Input.TextArea
              value={code}
              onChange={setCode}
              autoSize={{ minRows: 9, maxRows: 18 }}
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
              }}
            />
          </Form.Item>
          <Space>
            <Button
              type="primary"
              disabled={!running || !code.trim()}
              loading={execute.isPending}
              onClick={() => execute.mutate()}
            >
              运行
            </Button>
            <Button onClick={() => setCode(SAMPLES[language])}>载入示例</Button>
          </Space>
        </Form>
      </section>

      <section>
        <Typography.Title heading={6}>最近结果</Typography.Title>
        {lastRun ? (
          <div className="space-y-4">
            <Descriptions
              column={{ xs: 1, md: 3 }}
              data={[
                {
                  label: "状态",
                  value: (
                    <Tag color={lastRun.status === "succeeded" ? "green" : "orange"}>
                      {lastRun.status}
                    </Tag>
                  ),
                },
                {
                  label: "退出码",
                  value: lastRun.exit_code == null ? "-" : lastRun.exit_code,
                },
                {
                  label: "完成时间",
                  value: formatDateTime(lastRun.completed_at ?? lastRun.created_at),
                },
              ]}
            />
            <OutputBlock title="stdout" value={lastRun.stdout} />
            {lastRun.stderr ? <OutputBlock title="stderr" value={lastRun.stderr} error /> : null}
            {lastRun.truncated ? (
              <Alert type="warning" content="输出超过服务端限制，结果已截断。" />
            ) : null}
          </div>
        ) : lastTask ? (
          <Alert type="info" content={`任务 ${lastTask.id} 已提交，当前状态：${lastTask.status}`} />
        ) : (
          <Empty description="尚无代码执行结果" />
        )}
      </section>

      {runs.length > 1 ? (
        <section>
          <Typography.Title heading={6}>本页运行历史</Typography.Title>
          <div className="space-y-2">
            {runs.map((run) => (
              <div
                key={run.id}
                className="flex items-center justify-between gap-4 rounded-md bg-(--color-fill-1) px-3 py-2"
              >
                <span>
                  {run.language} · exit {run.exit_code ?? "-"}
                </span>
                <span className="text-(--color-text-3)">
                  {formatDateTime(run.completed_at ?? run.created_at)}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </Space>
  );
}

function OutputBlock({
  title,
  value,
  error = false,
}: {
  title: string;
  value?: string | null;
  error?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium">{title}</div>
      <pre
        className="max-h-80 overflow-auto rounded-md p-4 text-xs leading-6 whitespace-pre-wrap break-words"
        style={{
          background: "var(--color-fill-2)",
          color: error ? "rgb(var(--danger-6))" : "var(--color-text-1)",
        }}
      >
        {value || "-"}
      </pre>
    </div>
  );
}
