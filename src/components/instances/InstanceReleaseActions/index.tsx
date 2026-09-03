import { Button, Form, Message, Modal, Space } from '@arco-design/web-react'
import { useMutation } from '@tanstack/react-query'
import type { components } from '@/api/core-schema'
import { coreApi } from '@/api/client'
import { newIdempotencyKey } from '@/lib/idempotency'
import { getInstanceActionErrorMessage } from '@/lib/sandbox-instance'
import { InstanceRegistryImageSelect } from '@/components/instances/InstanceRegistryImageSelect'

type Instance = components['schemas']['InstanceRecord']
type LifecycleRequest = components['schemas']['InstanceLifecycleRequest']
type Values = { image_id?: string }

export function InstanceReleaseActions({ instance, onChanged }: { instance: Instance; onChanged: () => void }) {
  const [form] = Form.useForm<Values>()
  const busy = ['pending', 'provisioning', 'starting', 'stopping', 'deleting'].includes(instance.state)
  const updateImage = useMutation({
    mutationFn: async (values: Values) => {
      const { error, response } = await coreApi.POST('/instances/{instance_id}/lifecycle', {
        params: { path: { instance_id: instance.id } },
        body: {
          action: 'update_image',
          idempotency_key: newIdempotencyKey(),
          image_id: values.image_id,
          strategy: 'rolling',
        } as LifecycleRequest,
      })
      if (error) throw { ...(typeof error === 'object' && error ? error : { message: String(error) }), status: response.status }
    },
    onSuccess: () => {
      Message.success('镜像更新已提交')
      onChanged()
    },
    onError: (error) => Message.error(getInstanceActionErrorMessage(error, 'lifecycle')),
  })
  const rollback = useMutation({
    mutationFn: async () => {
      const { error, response } = await coreApi.POST('/instances/{instance_id}/lifecycle', {
        params: { path: { instance_id: instance.id } },
        body: { action: 'rollback', idempotency_key: newIdempotencyKey() },
      })
      if (error) throw { ...(typeof error === 'object' && error ? error : { message: String(error) }), status: response.status }
    },
    onSuccess: () => {
      Message.success('回滚操作已提交')
      onChanged()
    },
    onError: (error) => Message.error(getInstanceActionErrorMessage(error, 'lifecycle')),
  })

  return (
    <Space>
      <Button
        size="small"
        disabled={busy}
        onClick={() => Modal.confirm({
          title: `更新镜像 · ${instance.name}`,
          content: (
            <Form form={form} layout="vertical">
              <InstanceRegistryImageSelect field="image_id" enabled instanceKind={instance.kind === 'gpu_container' ? 'gpu_container' : 'container'} />
            </Form>
          ),
          confirmLoading: updateImage.isPending,
          onOk: async () => updateImage.mutateAsync(await form.validate()),
        })}
      >
        更新镜像
      </Button>
      <Button
        size="small"
        disabled={instance.state !== 'stopped' || rollback.isPending}
        onClick={() => Modal.confirm({
          title: '回滚上一版',
          content: `确定将「${instance.name}」回滚到上一修订版本？`,
          onOk: () => rollback.mutateAsync(),
        })}
      >
        回滚上一版
      </Button>
    </Space>
  )
}
