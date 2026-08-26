import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Form, Input, InputNumber, Modal, Select, Typography } from '@arco-design/web-react'
import { useEffect, useState } from 'react'
import { coreApi } from '@/api/client'
import { showApiError } from '@/api/helpers'
import type { components } from '@/api/core-schema'
import { listOrThrow } from '@/lib/api-list'
import { getErrorMessage } from '@/lib/errors'
import { newIdempotencyKey } from '@/lib/idempotency'

type LoadBalancer = components['schemas']['NetworkLoadBalancer']
type Vpc = components['schemas']['NetworkVPC']
type Subnet = components['schemas']['NetworkSubnet']

export function CreateLoadBalancerModal({
  visible,
  onCancel,
  onCreated,
}: {
  visible: boolean
  onCancel: () => void
  onCreated?: (item: LoadBalancer) => void
}) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [vpcId, setVpcId] = useState('')
  const [subnetId, setSubnetId] = useState('')
  const [scheme, setScheme] = useState<LoadBalancer['scheme']>('internal')
  const [listenerProtocol, setListenerProtocol] = useState<'http' | 'https' | 'tcp'>('tcp')
  const [listenerPort, setListenerPort] = useState(80)
  const [targetPort, setTargetPort] = useState(80)
  const vpcs = useQuery({
    queryKey: ['network-vpcs', 'load-balancer-create'],
    queryFn: () => listOrThrow(() => coreApi.GET('/networks/vpcs', { params: { query: { limit: 100 } } })),
    enabled: visible,
  })
  const subnets = useQuery({
    queryKey: ['network-subnets', 'load-balancer-create'],
    queryFn: () => listOrThrow(() => coreApi.GET('/networks/subnets', { params: { query: { limit: 100 } } })),
    enabled: visible,
  })
  const availableSubnets = ((subnets.data?.items ?? []) as Subnet[]).filter((item) => !vpcId || item.vpc_id === vpcId)
  useEffect(() => {
    if (subnetId && !availableSubnets.some((item) => item.id === subnetId)) setSubnetId('')
  }, [availableSubnets, subnetId])
  const reset = () => {
    setName('')
    setVpcId('')
    setSubnetId('')
    setScheme('internal')
    setListenerProtocol('tcp')
    setListenerPort(80)
    setTargetPort(80)
  }
  const create = useMutation({
    mutationFn: async (_: undefined) => {
      if (!name.trim()) throw new Error('请输入负载均衡名称')
      if (!vpcId) throw new Error('请选择 VPC')
      if (listenerPort < 1 || listenerPort > 65535) throw new Error('监听端口必须在 1–65535 之间')
      if (targetPort < 1 || targetPort > 65535) throw new Error('目标端口必须在 1–65535 之间')
      const { data, error } = await coreApi.POST('/networks/load-balancers', {
        body: {
          name: name.trim(),
          vpc_id: vpcId,
          subnet_id: subnetId || undefined,
          scheme,
          listeners: [{ protocol: listenerProtocol, port: listenerPort, target_port: targetPort }],
          idempotency_key: newIdempotencyKey(),
        },
      })
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['network-load-balancers'] })
      reset()
      onCreated?.(data)
      onCancel()
    },
    onError: (error) => showApiError(error),
  })
  return (
    <Modal
      visible={visible}
      title="创建负载均衡"
      onCancel={() => {
        reset()
        onCancel()
      }}
      onOk={() => create.mutateAsync(undefined)}
      confirmLoading={create.isPending}
      unmountOnExit
    >
      <Form layout="vertical">
        <Form.Item label="名称" required>
          <Input value={name} onChange={setName} placeholder="请输入负载均衡名称" maxLength={64} showWordLimit />
        </Form.Item>
        <Form.Item label="VPC" required>
          <Select value={vpcId || undefined} onChange={setVpcId} loading={vpcs.isLoading} placeholder="请选择 VPC">
            {((vpcs.data?.items ?? []) as Vpc[]).map((item) => (
              <Select.Option key={item.id} value={item.id}>
                {item.name} · {item.cidr}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item label="子网">
          <Select
            value={subnetId || undefined}
            onChange={setSubnetId}
            loading={subnets.isLoading}
            allowClear
            placeholder="请选择用于 VIP 的子网"
          >
            {availableSubnets.map((item) => (
              <Select.Option key={item.id} value={item.id}>
                {item.name} · {item.cidr}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item label="类型" required>
          <Select value={scheme} onChange={setScheme}>
            <Select.Option value="internal">私网</Select.Option>
            <Select.Option value="public">公网</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="监听协议" required>
          <Select value={listenerProtocol} onChange={setListenerProtocol}>
            <Select.Option value="tcp">TCP</Select.Option>
            <Select.Option value="http">HTTP</Select.Option>
            <Select.Option value="https">HTTPS</Select.Option>
          </Select>
        </Form.Item>
        <div className="grid grid-cols-2 gap-3">
          <Form.Item label="监听端口" required>
            <InputNumber
              value={listenerPort}
              onChange={(value) => setListenerPort(Number(value ?? 80))}
              min={1}
              max={65535}
              precision={0}
              className="w-full"
            />
          </Form.Item>
          <Form.Item label="目标端口" required>
            <InputNumber
              value={targetPort}
              onChange={(value) => setTargetPort(Number(value ?? 80))}
              min={1}
              max={65535}
              precision={0}
              className="w-full"
            />
          </Form.Item>
        </div>
        {vpcs.error || subnets.error ? (
          <Alert type="error" showIcon content={getErrorMessage(vpcs.error ?? subnets.error, '网络选项加载失败')} />
        ) : null}
        <Typography.Text type="secondary">
          Kubernetes Service 至少需要一个监听端口；当前 Core API 暂不支持创建后独立添加监听器。
        </Typography.Text>
      </Form>
    </Modal>
  )
}
