import { WORKFLOW_STAGES, CASE_TIMELINE } from '../data/mock'

const TABS = ['Timeline', 'Parties', 'Documents', 'Communications', 'Evidence', 'Actions', 'Schedule', 'Status']

export function CasesPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>POSH-2026-0042</h1>
          <p>Complaint of Sexual Harassment Against Senior Manager — Investigation</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className="badge badge-progress">Investigation</span>
          <span className="badge badge-medium">12d in stage</span>
          <span className="badge badge-high">High</span>
        </div>
      </div>

      <div className="card" style={{ padding: '1rem', marginBottom: '1rem', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: '0.35rem', minWidth: 720 }}>
          {WORKFLOW_STAGES.map((stage, i) => (
            <div
              key={stage}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '0.55rem 0.35rem',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                background: i <= 4 ? 'var(--color-accent)' : '#ebe7df',
                color: i <= 4 ? 'white' : 'var(--color-secondary-text)',
              }}
            >
              {stage}
            </div>
          ))}
        </div>
      </div>

      <div className="filters">
        {TABS.map((t, i) => (
          <button key={t} className={`btn ${i === 0 ? 'btn-primary' : 'btn-secondary'}`} type="button">
            {t}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3>Case Timeline</h3>
          <span className="meta-pill">{CASE_TIMELINE.length} events</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {CASE_TIMELINE.map((e) => (
            <div
              key={e.title + e.date}
              style={{
                display: 'grid',
                gridTemplateColumns: '140px 1fr',
                gap: '1rem',
                paddingBottom: '0.85rem',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-accent)' }}>{e.type}</div>
                <div style={{ fontSize: 12, color: 'var(--color-secondary-text)' }}>{e.date}</div>
              </div>
              <div style={{ fontWeight: 600 }}>{e.title}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
