#!/usr/bin/env node
import { createServer } from 'node:http'

const ISO = '2026-06-01T08:00:00Z'
const PORT = Number(process.env.MOCK_SERVER_PORT || 4010)

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

function ok(res, body) {
  json(res, 200, body)
}

function accepted(res, body = { id: 'mock-async', status: 'accepted' }) {
  json(res, 202, body)
}

const server = createServer((req, res) => {
  if (!req.url || !req.method) {
    json(res, 400, { error: 'bad_request' })
    return
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'access-control-allow-headers': 'content-type,authorization,idempotency-key',
    })
    res.end()
    return
  }

  const pathname = new URL(req.url, `http://127.0.0.1:${PORT}`).pathname
  const apiPath = pathname.replace(/^\/api\/v1/, '') || '/'

  if (req.method === 'GET' && apiPath === '/branding') {
    ok(res, { platform_name: 'ANI Console(Mock Server)' })
    return
  }

  if (req.method === 'POST' && apiPath === '/auth/oidc/begin') {
    ok(res, {
      authorization_url: 'http://127.0.0.1:5173/login/callback?code=mock-code&state=mock-state',
      state: 'mock-state',
    })
    return
  }

  if (req.method === 'POST' && apiPath === '/auth/token') {
    ok(res, {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      token_type: 'Bearer',
      expires_in: 3600,
    })
    return
  }

  if (req.method === 'GET' && apiPath === '/instances') {
    ok(res, { items: [{ id: 'inst-1', name: 'mock-vm', state: 'running', created_at: ISO }], total: 1 })
    return
  }

  if (req.method === 'GET' && /^\/instances\/[^/]+$/.test(apiPath)) {
    ok(res, {
      id: 'inst-1',
      name: 'mock-vm',
      state: 'running',
      kind: 'container',
      replicas: 1,
      termination_protection: false,
      created_at: ISO,
      updated_at: ISO,
    })
    return
  }

  if (req.method === 'GET' && /^\/instances\/[^/]+\/operations$/.test(apiPath)) {
    ok(res, { items: [{ id: 'op-1', operation: 'create', status: 'succeeded' }] })
    return
  }

  if (req.method === 'GET' && apiPath === '/gpu-inventory/occupancy') {
    ok(res, {
      total: 8,
      in_use: 2,
      available: 6,
      fault: 0,
      dev_profile: { real_provider: false, profile: 'CORE-DEV-PROFILE-A' },
    })
    return
  }

  if (req.method === 'GET' && apiPath === '/observability/alert-rules') {
    ok(res, { items: [{ id: 'rule-1', name: 'cpu-high', enabled: true }], total: 1 })
    return
  }

  if (req.method === 'GET' && apiPath === '/metering/usage') {
    ok(res, {
      items: [
        { period: '2026-06-01', total_quantity: 8, resource_type: 'instance_cpu_seconds', unit: 'seconds' },
        { period: '2026-06-02', total_quantity: 9, resource_type: 'instance_cpu_seconds', unit: 'seconds' },
      ],
      total: 2,
      dev_profile: { real_provider: false, profile: 'CORE-DEV-PROFILE-A' },
    })
    return
  }

  if (req.method === 'GET' && apiPath === '/volumes') {
    ok(res, { items: [{ id: 'vol-1', name: 'mock-vol', size_gib: 120, storage_class: 'default' }] })
    return
  }

  if (req.method === 'GET' && /^\/volumes\/[^/]+$/.test(apiPath)) {
    ok(res, { id: 'vol-1', name: 'mock-vol', size_gib: 120, storage_class: 'default' })
    return
  }

  if (req.method === 'GET' && /^\/volumes\/[^/]+\/snapshots$/.test(apiPath)) {
    ok(res, { items: [{ id: 'snap-1', name: 'mock-snap' }] })
    return
  }

  if (req.method === 'GET' && apiPath === '/filesystems') {
    ok(res, { items: [{ id: 'fs-1', name: 'mock-fs', protocol: 'nfs', size_gib: 200 }] })
    return
  }

  if (req.method === 'GET' && /^\/filesystems\/[^/]+$/.test(apiPath)) {
    ok(res, { id: 'fs-1', name: 'mock-fs', protocol: 'nfs', size_gib: 200 })
    return
  }

  if (req.method === 'GET' && /^\/filesystems\/[^/]+\/mount-targets$/.test(apiPath)) {
    ok(res, { items: [{ id: 'mt-1', vpc_id: 'vpc-1', subnet_id: 'subnet-1' }] })
    return
  }

  if (req.method === 'GET' && apiPath === '/buckets') {
    ok(res, { items: [{ id: 'bucket-1', name: 'mock-bucket' }] })
    return
  }

  if (req.method === 'GET' && apiPath === '/objects') {
    ok(res, { items: [{ id: 'obj-1', key: 'mock.txt', size_bytes: 2048 }] })
    return
  }

  if (req.method === 'GET' && apiPath === '/networks/vpcs') {
    ok(res, { items: [{ id: 'vpc-1', name: 'mock-vpc', cidr: '10.0.0.0/16', state: 'available', created_at: ISO }] })
    return
  }

  if (req.method === 'GET' && /^\/networks\/vpcs\/[^/]+$/.test(apiPath)) {
    ok(res, {
      id: 'vpc-1',
      name: 'mock-vpc',
      cidr: '10.0.0.0/16',
      state: 'available',
      created_at: ISO,
      updated_at: ISO,
    })
    return
  }

  if (req.method === 'GET' && apiPath === '/registry/projects') {
    ok(res, { items: [{ id: 'proj-1', name: 'mock', public: false, created_at: ISO }] })
    return
  }

  if (req.method === 'POST' && apiPath === '/registry/projects') {
    ok(res, { id: 'proj-2', name: 'new-project', public: false, created_at: ISO })
    return
  }

  if (req.method === 'GET' && /^\/registry\/projects\/[^/]+\/repositories$/.test(apiPath)) {
    ok(res, { items: [{ project: 'mock', name: 'backend', artifact_count: 1, pull_count: 5 }] })
    return
  }

  if (req.method === 'GET' && /^\/registry\/projects\/[^/]+\/repositories\/[^/]+\/artifacts$/.test(apiPath)) {
    ok(res, {
      items: [
        {
          project: 'mock',
          repository: 'backend',
          digest: 'sha256:mockabc',
          tags: ['v1.0.0'],
          media_type: 'application/vnd.docker.distribution.manifest.v2+json',
          size_bytes: 102400,
          pushed_at: ISO,
          scan_status: { image: 'mock/backend:v1.0.0', status: 'complete', critical: 0, high: 1, medium: 2, low: 3 },
        },
      ],
    })
    return
  }

  if (req.method === 'GET' && /^\/registry\/projects\/[^/]+\/scan-report$/.test(apiPath)) {
    ok(res, { project: 'mock', status: 'complete', critical: 0, high: 1, medium: 2, low: 3, artifacts_total: 1, scanned_artifacts: 1 })
    return
  }

  if (req.method === 'GET' && apiPath === '/registry/images/scan-result') {
    ok(res, { image: 'mock/backend:v1.0.0', status: 'complete', critical: 0, high: 1, medium: 2, low: 3 })
    return
  }

  if (req.method === 'POST' && /^\/registry\/projects\/[^/]+\/repositories\/[^/]+\/permissions$/.test(apiPath)) {
    ok(res, { status: 'updated' })
    return
  }

  if (req.method === 'POST' && /^\/registry\/projects\/[^/]+\/pull-secret$/.test(apiPath)) {
    ok(res, { name: 'ani-registry-pull', created: true })
    return
  }

  if (req.method === 'GET' && apiPath === '/auth/api-keys') {
    ok(res, { items: [{ id: 'key-1', name: 'mock-ci', key_prefix: 'ani_mock_', created_at: ISO }] })
    return
  }

  if (req.method === 'POST' && apiPath === '/auth/api-keys') {
    ok(res, {
      id: 'key-2',
      name: 'mock-new',
      key_prefix: 'ani_new_',
      key_value: 'ani_sk_mock_server',
      created_at: ISO,
    })
    return
  }

  if (req.method === 'GET') {
    ok(res, { items: [], total: 0 })
    return
  }

  accepted(res)
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[mock-core-api] listening on http://127.0.0.1:${PORT}`)
})
