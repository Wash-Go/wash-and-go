import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/book-order')({
  component: BookOrderPage,
})

function BookOrderPage() {
  return (
    <main className="min-h-screen bg-white">
      di pa tapos
    </main>
  )
}
