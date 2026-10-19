import { createFileRoute } from '@tanstack/react-router'
import {
  BusinessModel,
  Built,
  Contact,
  Hero,
  HowItWorks,
  Impact,
  Market,
  Problem,
  Team,
  Tiers,
} from '../components/sections'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <main id="main">
      <Hero />
      <Problem />
      <HowItWorks />
      <Tiers />
      <Impact />
      <BusinessModel />
      <Market />
      <Built />
      <Team />
      <Contact />
    </main>
  )
}
