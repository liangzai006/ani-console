import { VectorStoresPage } from '@/components/storage/VectorStoresPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/vector-stores/')({
  component: VectorStoresPage,
})
