import { Button, Descriptions, Form, Input, InputNumber, Message, Modal, Radio, Select, Space, Steps, Switch } from '@arco-design/web-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { coreApi } from '@/api/client'
import type { components } from '@/api/core-schema'
import { Ipv4CidrInput } from '@/components/common'
import { listOrThrow } from '@/lib/api-list'
import { newIdempotencyKey } from '@/lib/idempotency'
import { getInstanceActionErrorMessage } from '@/lib/sandbox-instance'
import { optionalIpv4WithinCidrError, subnetFixedOctets, suggestGatewayIp } from '@/lib/validators'
import styles from './index.module.css'

type Request = components['schemas']['CreateInstanceRequest']
type Values = {
  name: string; bootMode: 'containerDisk' | 'iso'; bootImage: string; isoImageId: string
  rootDiskSizeGib: number; cpu: string; memory: string; networkMode: 'default' | 'vpc'
  vpcId: string; subnetId: string; ipMode: 'auto' | 'manual'; privateIp: string
  sshUsername: string; sshKeyRef: string; autoStart: boolean; terminationProtection: boolean
}

const INITIAL: Values = {
  name: '', bootMode: 'containerDisk', bootImage: 'quay.io/kubevirt/cirros-container-disk-demo:v1.2.0',
  isoImageId: '', rootDiskSizeGib: 40, cpu: '2', memory: '4Gi', networkMode: 'default',
  vpcId: '', subnetId: '', ipMode: 'auto', privateIp: '', sshUsername: 'cirros', sshKeyRef: '',
  autoStart: true, terminationProtection: false,
}
const STEPS = ['基础配置', '镜像与规格', '网络与访问', '确认']
const optional = (value: string) => value.trim() || undefined

export function VmInstanceCreateModal({ visible, onCancel, onCreated }: {
  visible: boolean; onCancel: () => void; onCreated: (operationId?: string) => void
}) {
  const [form] = Form.useForm<Values>()
  const [step, setStep] = useState(0)
  const [values, setValues] = useState<Values>(INITIAL)
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!visible) return
    form.setFieldsValue(INITIAL)
    setValues(INITIAL)
    setStep(0)
    setIdempotencyKey(newIdempotencyKey())
  }, [form, visible])

  const images = useQuery({
    queryKey: ['images', 'vm-create', 'iso'], enabled: visible && values.bootMode === 'iso',
    queryFn: () => listOrThrow(() => coreApi.GET('/images', { params: { query: { format: 'iso', state: 'ready', limit: 100 } } })),
  })
  const vpcs = useQuery({
    queryKey: ['network-vpcs', 'vm-create'], enabled: visible && values.networkMode === 'vpc',
    queryFn: () => listOrThrow(() => coreApi.GET('/networks/vpcs', { params: { query: { limit: 100 } } })),
  })
  const subnets = useQuery({
    queryKey: ['network-subnets', 'vm-create', values.vpcId], enabled: visible && values.networkMode === 'vpc' && !!values.vpcId,
    queryFn: () => listOrThrow(() => coreApi.GET('/networks/subnets', { params: { query: { limit: 100, vpc_id: values.vpcId } } })),
  })
  const availableSubnets = (subnets.data?.items ?? []).filter((item) => !values.vpcId || item.vpc_id === values.vpcId)
  const selectedSubnet = availableSubnets.find((item) => String(item.id) === values.subnetId)
  const subnetCidr = selectedSubnet?.cidr ? String(selectedSubnet.cidr) : ''
  const privateIpError = values.networkMode === 'vpc' && values.ipMode === 'manual' && values.privateIp && subnetCidr
    ? optionalIpv4WithinCidrError(values.privateIp, subnetCidr, '固定 IP', '子网 CIDR')
    : undefined

  const create = useMutation({
    mutationFn: async () => {
      const body: Request = {
        idempotency_key: idempotencyKey, name: values.name.trim(), kind: 'vm', instance_type: 'vm',
        cpu: optional(values.cpu), memory: optional(values.memory), auto_start: values.autoStart,
        ssh_username: optional(values.sshUsername) ?? null, ssh_key_ref: optional(values.sshKeyRef) ?? null,
        termination_protection: values.terminationProtection, replicas: 1,
        boot_image: values.bootMode === 'containerDisk' ? (optional(values.bootImage) ?? null) : null,
        boot_media: values.bootMode === 'iso' ? { type: 'iso', image_id: values.isoImageId, boot_order: 1 } : null,
        root_disk_size_gib: values.bootMode === 'iso' ? values.rootDiskSizeGib : null,
      }
      if (values.networkMode === 'vpc') body.network = {
        vpc_id: values.vpcId, subnet_id: values.subnetId,
        private_ip: values.ipMode === 'manual' ? optional(values.privateIp) : undefined,
      }
      const { data, error, response } = await coreApi.POST('/instances', { body })
      if (error) throw { ...(typeof error === 'object' && error ? error : { message: String(error) }), status: response.status }
      return data?.operation_id
    },
    onSuccess: async (operationId) => {
      Message.success('云主机创建已提交')
      await queryClient.invalidateQueries({ queryKey: ['vm-instances'] })
      onCreated(operationId)
    },
    onError: (error) => Message.error(getInstanceActionErrorMessage(error, 'create')),
  })

  const next = async () => {
    try {
      await form.validate()
      if (step === 1 && values.bootMode === 'iso' && !values.isoImageId) throw new Error()
      if (step === 2 && values.networkMode === 'vpc' && (!values.vpcId || !values.subnetId)) throw new Error()
      if (step === 2 && values.ipMode === 'manual' && (!values.privateIp || privateIpError)) throw new Error()
      setStep((current) => Math.min(STEPS.length - 1, current + 1))
    } catch { Message.warning('请先完成当前步骤的必填项') }
  }
  const setValue = <K extends keyof Values>(key: K, value: Values[K]) => {
    form.setFieldValue(key, value)
    setValues((current) => ({ ...current, [key]: value }))
  }

  return <Modal title="创建云主机 VM" visible={visible} onCancel={onCancel} footer={null} unmountOnExit maskClosable={!create.isPending} style={{ width: 780 }}>
    <div className={styles.form}>
      <Steps current={step + 1}>{STEPS.map((title) => <Steps.Step key={title} title={title} />)}</Steps>
      <div className={styles.content}>
        <Form form={form} layout="vertical" initialValues={INITIAL} onValuesChange={(changed) => setValues((current) => ({ ...current, ...changed }))}>
          {step === 0 ? <>
            <Form.Item field="name" label="名称" rules={[{ required: true, message: '请输入云主机名称' }]}><Input placeholder="例如 production-web-01" allowClear /></Form.Item>
            <Space size={32}><Form.Item field="autoStart" label="自动启动" triggerPropName="checked"><Switch /></Form.Item><Form.Item field="terminationProtection" label="终止保护" triggerPropName="checked"><Switch /></Form.Item></Space>
          </> : null}
          {step === 1 ? <>
            <Form.Item field="bootMode" label="启动介质"><Radio.Group type="button"><Radio value="containerDisk">ContainerDisk</Radio><Radio value="iso">ISO 安装</Radio></Radio.Group></Form.Item>
            {values.bootMode === 'containerDisk'
              ? <Form.Item field="bootImage" label="Boot Image" rules={[{ required: true }]}><Input /></Form.Item>
              : <><Form.Item field="isoImageId" label="ISO 镜像" required><Select loading={images.isLoading} placeholder="选择 Ready 状态 ISO">{(images.data?.items ?? []).map((image) => <Select.Option key={String(image.id)} value={String(image.id)}>{String(image.name ?? image.id)}</Select.Option>)}</Select></Form.Item><Form.Item field="rootDiskSizeGib" label="系统盘大小 GiB" rules={[{ required: true }]}><InputNumber min={1} precision={0} /></Form.Item></>}
            <Space className={styles.row} size={16}><Form.Item field="cpu" label="CPU" rules={[{ required: true }]}><Input placeholder="2" /></Form.Item><Form.Item field="memory" label="内存" rules={[{ required: true }]}><Input placeholder="4Gi" /></Form.Item></Space>
          </> : null}
          {step === 2 ? <>
            <Form.Item field="networkMode" label="网络"><Radio.Group type="button" onChange={(networkMode) => { setValue('networkMode', networkMode); setValue('vpcId', ''); setValue('subnetId', ''); setValue('privateIp', '') }}><Radio value="default">默认网络</Radio><Radio value="vpc">VPC 网络</Radio></Radio.Group></Form.Item>
            {values.networkMode === 'vpc' ? <>
              <Form.Item field="vpcId" label="VPC" required><Select loading={vpcs.isLoading} placeholder="选择 VPC" onChange={(vpcId) => { setValue('vpcId', vpcId); setValue('subnetId', ''); setValue('privateIp', '') }}>{(vpcs.data?.items ?? []).map((vpc) => <Select.Option key={String(vpc.id)} value={String(vpc.id)}>{String(vpc.name ?? vpc.id)}</Select.Option>)}</Select></Form.Item>
              <Form.Item field="subnetId" label="子网" required><Select disabled={!values.vpcId} loading={subnets.isLoading} placeholder="选择子网" onChange={(subnetId) => { setValue('subnetId', subnetId); setValue('privateIp', '') }}>{availableSubnets.map((subnet) => <Select.Option key={String(subnet.id)} value={String(subnet.id)}>{String(subnet.name ?? subnet.id)}</Select.Option>)}</Select></Form.Item>
              <Form.Item field="ipMode" label="IP 分配"><Radio.Group type="button" onChange={(ipMode) => { setValue('ipMode', ipMode); setValue('privateIp', ipMode === 'manual' && subnetCidr ? suggestGatewayIp(subnetCidr) : '') }}><Radio value="auto">自动分配</Radio><Radio value="manual">手动指定</Radio></Radio.Group></Form.Item>
              {values.ipMode === 'manual' ? <Form.Item label="固定 IP" required validateStatus={privateIpError ? 'error' : undefined} help={privateIpError}><Ipv4CidrInput value={values.privateIp} onChange={(value) => setValue('privateIp', value)} disabledOctets={subnetCidr ? subnetFixedOctets(subnetCidr) : []} /></Form.Item> : null}
            </> : null}
            <Form.Item field="sshUsername" label="SSH 用户名"><Input /></Form.Item><Form.Item field="sshKeyRef" label="SSH Key Ref"><Input placeholder="可选" /></Form.Item>
          </> : null}
          {step === 3 ? <Descriptions column={2} data={[
            { label: '名称', value: values.name }, { label: '规格', value: `${values.cpu} CPU / ${values.memory}` },
            { label: '启动介质', value: values.bootMode === 'iso' ? 'ISO 安装' : 'ContainerDisk' }, { label: '系统盘', value: values.bootMode === 'iso' ? `${values.rootDiskSizeGib} GiB` : '-' },
            { label: '网络', value: values.networkMode === 'vpc' ? 'VPC 网络' : '默认网络' }, { label: '固定 IP', value: values.privateIp || '-' },
            { label: 'SSH 用户名', value: values.sshUsername || '-' }, { label: '自动启动', value: values.autoStart ? '是' : '否' },
            { label: '终止保护', value: values.terminationProtection ? '开启' : '关闭' },
          ]} /> : null}
        </Form>
      </div>
      <div className={styles.actions}><Space><Button onClick={onCancel} disabled={create.isPending}>取消</Button>{step > 0 ? <Button onClick={() => setStep((current) => current - 1)} disabled={create.isPending}>上一步</Button> : null}<Button type="primary" loading={create.isPending} onClick={step === STEPS.length - 1 ? () => create.mutate() : next}>{step === STEPS.length - 1 ? '提交创建' : '下一步'}</Button></Space></div>
    </div>
  </Modal>
}
