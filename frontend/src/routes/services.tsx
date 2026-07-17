import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/services')({
  component: ServicesPage,
})

function ServicesPage() {
  return <main className="min-h-screen bg-white">di pa tapos</main>
}
