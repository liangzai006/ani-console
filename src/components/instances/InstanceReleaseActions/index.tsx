import { Button, Form, Message, Modal, Space } from '@arco-design/web-react'
import { useMutation } from '@tanstack/react-query'
import type { components } from '@/api/core-schema'
import { coreApi } from '@/api/client'
import { useIdempotencyScope } from '@/hooks/useIdempotencyScope'
import { getInstanceActionErrorMessage } from '@/lib/sandbox-instance'
import { InstanceRegistryImageSelect } from '@/components/instances/InstanceRegistryImageSelect'

type Instance = components['schemas']['InstanceRecord']
type LifecycleRequest = components['schemas']['InstanceLifecycleRequest']
type Values = { image_id?: string }

export function InstanceReleaseActions({ instance, onChanged }: { instance: Instance; onChanged: () => void }) {
  const [form] = Form.useForm<Values>()
  const updateImageScope = useIdempotencyScope('instance-image-update', ['POST', instance.id])
  const rollbackScope = useIdempotencyScope('instance-release-rollback', ['POST', instance.id])
  const busy = ['pending', 'provisioning', 'starting', 'stopping', 'deleting'].includes(instance.state)
  const updateImage = useMutation({
    mutationFn: async (values: Values) => {
      const submitData = {
        action: 'update_image' as const,
        image_id: values.image_id,
        strategy: 'rolling' as const,
      }
      const { error, response } = await coreApi.POST('/instances/{instance_id}/lifecycle', {
        params: { path: { instance_id: instance.id } },
        body: updateImageScope.withKey(submitData) as LifecycleRequest,
      })
      if (error) throw { ...(typeof error === 'object' && error ? error : { message: String(error) }), status: response.status }
    },
    onSuccess: () => {
      updateImageScope.reset()
      Message.success('镜像更新已提交')
      onChanged()
    },
    onError: (error) => Message.error(getInstanceActionErrorMessage(error, 'lifecycle')),
  })
  const rollback = useMutation({
    mutationFn: async () => {
      const submitData = { action: 'rollback' as const }
      const { error, response } = await coreApi.POST('/instances/{instance_id}/lifecycle', {
        params: { path: { instance_id: instance.id } },
        body: rollbackScope.withKey(submitData),
      })
      if (error) throw { ...(typeof error === 'object' && error ? error : { message: String(error) }), status: response.status }
    },
    onSuccess: () => {
      rollbackScope.reset()
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
