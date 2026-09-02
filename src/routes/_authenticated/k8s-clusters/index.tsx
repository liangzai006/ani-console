import { K8sClustersPage } from '@/components/k8s-clusters/K8sClustersPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/k8s-clusters/')({
  component: K8sClustersPage,
})
