import { ENGINE, NEXT_STEPS, QUALITY_LINE } from '../../content/site'
import { ADMIN_SHOTS } from '../../content/screens'
import { DesktopShot, Section, SectionHeading } from '../ui'

function EngineList({
  title,
  items,
}: {
  title: string
  items: ReadonlyArray<string>
}) {
  return (
    <div>
      <h3 className="text-xl font-bold text-ink">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex gap-3 leading-relaxed text-ink">
            <span
              aria-hidden="true"
              className="mt-3 h-0.5 w-4 shrink-0 bg-brand-navy"
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Built() {
  const [first, ...rest] = ADMIN_SHOTS
  return (
    <Section id="built" band="tint">
      <SectionHeading
        id="built"
        eyebrow="What’s built"
        title="Alpha v1.0: four apps and one backend."
        lead="A customer app (React Native / Expo), a rider app, a laundry portal and an admin console, on a NestJS + Fastify + Prisma + Postgres backend with Firebase auth and TomTom maps, search and routing. The admin console handles oversight, exceptions and business rules."
      />

      <div className="mt-12 grid gap-x-8 gap-y-10 md:grid-cols-2">
        <DesktopShot shot={first} className="md:col-span-2" />
        {rest.map((shot) => (
          <DesktopShot key={shot.src} shot={shot} />
        ))}
      </div>

      <div className="mt-16 grid gap-12 md:grid-cols-2 md:gap-16">
        <EngineList title="Money path" items={ENGINE.money} />
        <EngineList title="Platform" items={ENGINE.platform} />
      </div>

      <div className="mt-14 grid gap-8 border-t-2 border-brand-navy pt-8 md:grid-cols-2 md:gap-16">
        <div>
          <h3 className="text-xl font-bold text-ink">Quality</h3>
          <p className="mt-3 leading-relaxed text-ink">{QUALITY_LINE}</p>
        </div>
        <div>
          <h3 className="text-xl font-bold text-ink">Next</h3>
          <ol className="mt-3 space-y-2">
            {NEXT_STEPS.map((step, i) => (
              <li key={step} className="flex gap-3 leading-relaxed text-ink">
                <span className="font-mono font-bold text-brand-navy tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  )
}
