import './experience.css'
import { ExperienceClosing } from './ExperienceClosing'

const METRICS = [
  { value: '2–3', label: 'APPLICATIONS', description: 'Maintained in production' },
  { value: '6–10', label: 'FEATURES', description: 'Developed or implemented' },
  { value: '01', label: 'API INTEGRATION', description: 'Mailrelay' },
] as const

const RESPONSIBILITIES = [
  {
    title: 'Production & Backend',
    description: 'Maintained live Symfony applications, working with Doctrine ORM, services, business logic, Mailrelay API integration and Twig templates.',
  },
  {
    title: 'Frontend & Web',
    description: 'Developed React components, maintained existing code, improved responsive layouts with Tailwind CSS and managed website content. Used Node.js as the runtime for development tooling.',
  },
  {
    title: 'Team Operations',
    description: 'Collaborative development through sprint meetings, GitHub workflows and shared remote repositories.',
  },
] as const

export function ExperienceSection() {
  return (
    <section className="experience-section" aria-labelledby="destination-heading">
      <header className="experience-hero">
        <p className="experience-eyebrow">PROFESSIONAL EXPERIENCE / CAREER RECORD</p>
        <h2 id="destination-heading" tabIndex={-1}>Built for the real world.</h2>
        <p className="experience-subtitle">Professional experience / Engineering record</p>
        <span className="experience-accent" aria-hidden="true" />
      </header>

      <section className="experience-employment" aria-labelledby="experience-company">
        <div>
          <h3 id="experience-company">VEISS</h3>
          <p className="experience-role">Full Stack Developer</p>
        </div>
        <p className="experience-period">
          <time dateTime="2025-10">OCT 2025</time> — <time dateTime="2026-05">MAY 2026</time>
        </p>
      </section>

      <section className="experience-performance" aria-labelledby="experience-performance-heading">
        <h3 id="experience-performance-heading" className="experience-record-heading">Performance Record</h3>
        <dl className="experience-metrics">
          {METRICS.map(metric => (
            <div className="experience-metric" key={metric.label}>
              <dt className="experience-metric-label">{metric.label}</dt>
              <dd className="experience-metric-value">{metric.value}</dd>
              <dd className="experience-metric-description">{metric.description}</dd>
            </div>
          ))}
        </dl>
        <p className="experience-estimates">Application and feature counts are approximate.</p>
      </section>

      <div className="experience-responsibilities">
        {RESPONSIBILITIES.map((responsibility, index) => (
          <section className="experience-responsibility" key={responsibility.title} aria-labelledby={`experience-responsibility-${index + 1}`}>
            <span className="experience-responsibility-number">{String(index + 1).padStart(2, '0')} / </span>
            <div>
            <h3 id={`experience-responsibility-${index + 1}`}>
              {responsibility.title}
            </h3>
            <p>{responsibility.description}</p>
            </div>
          </section>
        ))}
      </div>
      <ExperienceClosing  />
    </section>
  )
}
