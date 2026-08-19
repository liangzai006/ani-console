import { Form, Input, InputNumber, Message, Radio, Select, Switch } from '@arco-design/web-react'
import { IconCheck } from '@arco-design/web-react/icon'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { coreApi } from '@/api/client'
import type { components } from '@/api/core-schema'
import { FormPageFrame, type FormPageSection } from '@/components/formbase'
import { Ipv4CidrInput } from '@/components/forms/Ipv4CidrInput'
import { listOrThrow } from '@/lib/api-list'
import { newIdempotencyKey } from '@/lib/idempotency'
import { getInstanceActionErrorMessage } from '@/lib/sandbox-instance'
import { optionalIpv4WithinCidrError, subnetFixedOctets, suggestGatewayIp } from '@/lib/validators'

type CreateInstanceRequest = components['schemas']['CreateInstanceRequest']
type NetworkMode = 'default' | 'vpc'
type IpAllocationMode = 'auto' | 'manual'

type ContainerInstanceFormValues = {
  name: string
  image: string
  cpu: string
  memory: string
  replicas: number
  network_mode: NetworkMode
  ip_allocation: IpAllocationMode
  vpc_id: string
  subnet_id: string
  private_ip: string
  auto_start: boolean
  termination_protection: boolean
}

type PrivateIpInputProps = {
  value?: string
  onChange?: (value: string) => void
  placeholder: string
  disabledOctets: boolean[]
}

const CONTAINER_IMAGE = 'dockerproxy.net/library/nginx:1.27-alpine'
const INITIAL_VALUES: ContainerInstanceFormValues = {
  name: '',
  image: CONTAINER_IMAGE,
  cpu: '2',
  memory: '4Gi',
  replicas: 1,
  network_mode: 'default',
  ip_allocation: 'auto',
  vpc_id: '',
  subnet_id: '',
  private_ip: '',
  auto_start: true,
  termination_protection: false,
}

function optionalTrimmed(value: string) {
  const trimmed = value.trim()
  return trimmed || undefined
}

function PrivateIpInput({ value = '', onChange, placeholder, disabledOctets }: PrivateIpInputProps) {
  return (
    <div data-testid="instance-private-ip-input">
      <Ipv4CidrInput
        value={value}
        onChange={(nextValue) => onChange?.(nextValue)}
        placeholder={placeholder}
        disabledOctets={disabledOctets}
      />
    </div>
  )
}

function buildCreateBody(values: ContainerInstanceFormValues, idempotencyKey: string): CreateInstanceRequest {
  const body: CreateInstanceRequest = {
    idempotency_key: idempotencyKey,
    name: values.name.trim(),
    kind: 'container',
    instance_type: 'container',
    image: optionalTrimmed(values.image) ?? null,
    cpu: optionalTrimmed(values.cpu),
    memory: optionalTrimmed(values.memory),
    replicas: values.replicas,
    auto_start: values.auto_start,
    ssh_username: null,
    termination_protection: values.termination_protection,
  }

  if (values.network_mode === 'vpc' && values.subnet_id) {
    body.network = {
      vpc_id: optionalTrimmed(values.vpc_id),
      subnet_id: values.subnet_id,
    }
    if (values.ip_allocation === 'manual') body.network.private_ip = optionalTrimmed(values.private_ip)
  }

  return body
}

export function ContainerInstanceCreatePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<ContainerInstanceFormValues>()
  const [idempotencyKey, setIdempotencyKey] = useState(() => newIdempotencyKey())

  const vpcs = useQuery({
    queryKey: ['network-vpcs', 'select'],
    queryFn: () => listOrThrow(() => coreApi.GET('/networks/vpcs', { params: { query: { limit: 50 } } })),
  })
  const subnets = useQuery({
    queryKey: ['network-subnets', 'select'],
    queryFn: () => listOrThrow(() => coreApi.GET('/networks/subnets', { params: { query: { limit: 50 } } })),
  })

  const create = useMutation({
    mutationFn: async (values: ContainerInstanceFormValues) => {
      const { data, error, response } = await coreApi.POST('/instances', {
        body: buildCreateBody(values, idempotencyKey),
      })
      if (error) {
        throw {
          ...(typeof error === 'object' && error ? error : { message: String(error) }),
          status: response.status,
        }
      }
      const location = response.headers.get('Location')
      return {
        taskId: location?.match(/tasks\/([^/]+)/)?.[1] ?? data?.operation_id,
        instanceId: data?.instance?.id,
      }
    },
    onSuccess: () => {
      Message.success('实例创建已提交')
      form.resetFields()
      setIdempotencyKey(newIdempotencyKey())
      void queryClient.invalidateQueries({ queryKey: ['instances'] })
      void queryClient.invalidateQueries({ queryKey: ['container-instances'] })
      navigate({ to: '/instances/container' })
    },
    onError: (error) => Message.error(getInstanceActionErrorMessage(error, 'create')),
  })

  const goBack = () => {
    setIdempotencyKey(newIdempotencyKey())
    navigate({ to: '/instances/container' })
  }

  const handleValuesChange = (
    changedValues: Partial<ContainerInstanceFormValues>,
    values: Partial<ContainerInstanceFormValues>,
  ) => {
    if (changedValues.network_mode === 'default') {
      form.setFieldsValue({ ip_allocation: 'auto', vpc_id: '', subnet_id: '', private_ip: '' })
      return
    }
    if (Object.prototype.hasOwnProperty.call(changedValues, 'vpc_id')) {
      form.setFieldsValue({ subnet_id: '', private_ip: '' })
      return
    }
    if (changedValues.ip_allocation === 'auto') {
      form.setFieldValue('private_ip', '')
      return
    }

    if (
      changedValues.ip_allocation === 'manual' ||
      Object.prototype.hasOwnProperty.call(changedValues, 'subnet_id')
    ) {
      const selectedSubnet = (subnets.data?.items ?? []).find((subnet) => String(subnet.id) === values.subnet_id)
      const cidr = selectedSubnet?.cidr ? String(selectedSubnet.cidr) : ''
      form.setFieldValue('private_ip', cidr ? suggestGatewayIp(cidr) : '')
    }
  }

  const sections: FormPageSection[] = [
    {
      key: 'basic',
      title: '基本信息',
      content: (
        <>
          <Form.Item
            field="name"
            label="名称"
            rules={[
              { required: true, message: '请输入名称' },
              {
                validator: (value, callback) => callback(value?.trim() ? undefined : '请输入名称'),
              },
            ]}
          >
            <Input data-testid="instance-name-input" placeholder="请输入名称" allowClear />
          </Form.Item>
          <Form.Item label="类型">
            <Input value="容器" disabled />
          </Form.Item>
        </>
      ),
    },
    {
      key: 'configuration',
      title: '配置信息',
      content: (
        <>
          <Form.Item field="image" label="镜像" rules={[{ required: true, message: '请输入镜像' }]}>
            <Input data-testid="instance-image-input" placeholder={CONTAINER_IMAGE} allowClear />
          </Form.Item>
          <Form.Item field="cpu" label="CPU">
            <Input  placeholder="2" />
          </Form.Item>
          <Form.Item field="memory" label="内存">
            <Input placeholder="4Gi" />
          </Form.Item>
          <Form.Item field="replicas" label="副本数">
            <InputNumber min={1} precision={0} />
          </Form.Item>
          <Form.Item field="auto_start" label="自动启动" triggerPropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item field="termination_protection" label="终止保护" triggerPropName="checked">
            <Switch />
          </Form.Item>
        </>
      ),
    },
    {
      key: 'network',
      title: '网络配置',
      content: (
        <>
          <Form.Item field="network_mode" label="网络">
            <Radio.Group type="button">
              <Radio value="default">默认网络</Radio>
              <Radio value="vpc">VPC 网络</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item noStyle shouldUpdate>
            {(currentValues) => {
              const values = currentValues as Partial<ContainerInstanceFormValues>
              if (values.network_mode !== 'vpc') return null

              const selectedSubnets = (subnets.data?.items ?? []).filter(
                (subnet) => !values.vpc_id || subnet.vpc_id === values.vpc_id,
              )
              const selectedSubnet = selectedSubnets.find((subnet) => String(subnet.id) === values.subnet_id)
              const selectedSubnetCidr = selectedSubnet?.cidr ? String(selectedSubnet.cidr) : ''
              const disabledOctets = selectedSubnetCidr ? subnetFixedOctets(selectedSubnetCidr) : []

              return (
                <>
                  <Form.Item field="vpc_id" label="VPC" rules={[{ required: true, message: '请选择 VPC' }]}>
                    <Select
                      data-testid="instance-vpc-select"
                      loading={vpcs.isLoading}
                      allowClear
                      placeholder="选择 VPC"
                    >
                      {(vpcs.data?.items ?? []).map((vpc) => (
                        <Select.Option key={String(vpc.id)} value={String(vpc.id)}>
                          {String(vpc.name ?? vpc.id)}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item field="subnet_id" label="子网" rules={[{ required: true, message: '请选择子网' }]}>
                    <Select
                      data-testid="instance-subnet-select"
                      loading={subnets.isLoading}
                      disabled={!values.vpc_id}
                      allowClear
                      placeholder={values.vpc_id ? '选择子网' : '先选择 VPC'}
                    >
                      {selectedSubnets.map((subnet) => (
                        <Select.Option key={String(subnet.id)} value={String(subnet.id)}>
                          {String(subnet.name ?? subnet.id)}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item field="ip_allocation" label="IP 分配">
                    <Radio.Group type="button">
                      <Radio value="auto">自动分配</Radio>
                      <Radio value="manual">手动指定</Radio>
                    </Radio.Group>
                  </Form.Item>
                  {values.ip_allocation === 'manual' ? (
                    <Form.Item
                      field="private_ip"
                      label="固定 IP"
                      dependencies={['subnet_id']}
                      rules={[
                        { required: true, message: '请输入固定 IP' },
                        {
                          validator: (value, callback) => {
                            const message = selectedSubnetCidr
                              ? optionalIpv4WithinCidrError(value ?? '', selectedSubnetCidr, '固定 IP', '子网 CIDR')
                              : undefined
                            callback(message)
                          },
                        },
                      ]}
                    >
                      <PrivateIpInput
                        placeholder={selectedSubnetCidr ? suggestGatewayIp(selectedSubnetCidr) : '10.0.1.10'}
                        disabledOctets={disabledOctets}
                      />
                    </Form.Item>
                  ) : null}
                </>
              )
            }}
          </Form.Item>
        </>
      ),
    },
  ]

  return (
    <FormPageFrame<ContainerInstanceFormValues>
      breadcrumbs={[{ label: '容器实例', to: '/instances/container' }, { label: '创建容器实例' }]}
      form={form}
      sections={sections}
      actions={[
        { key: 'cancel', label: '取消', onClick: goBack, buttonProps: { disabled: create.isPending } },
        {
          key: 'submit',
          label: '创建实例',
          submit: true,
          buttonProps: { type: 'primary', icon: <IconCheck />, loading: create.isPending },
        },
      ]}
      onBack={goBack}
      onSubmit={(values) => create.mutate(values)}
      formProps={{
        initialValues: INITIAL_VALUES,
        onValuesChange: handleValuesChange,
        requiredSymbol: { position: 'end' },
      }}
    />
  )
}