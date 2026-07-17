import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/my-orders')({
  component: MyOrdersPage,
})

function MyOrdersPage() {
  return <main className="min-h-screen bg-white">di pa tapos</main>
}
