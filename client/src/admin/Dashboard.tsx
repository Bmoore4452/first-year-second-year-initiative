import { useEffect, useMemo, useState } from 'react'
import { supabase, type ResponseRow } from '../supabase'
import { CLASS_OPTIONS } from '../options'
import { downloadCsv } from './csv'

type SortKey = 'created_at' | 'name' | 'class_year'
type ListKey = 'fields_of_interest' | 'population_interests' | 'academic_topics' | 'professional_topics'

const CATEGORIES: { key: ListKey; label: string }[] = [
  { key: 'fields_of_interest', label: 'Fields of Interest' },
  { key: 'population_interests', label: 'Population Interests' },
  { key: 'academic_topics', label: 'Academic Interests' },
  { key: 'professional_topics', label: 'Professional Development' },
]

const TOP_N = 5

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function topCounts(rows: ResponseRow[], key: ListKey) {
  const counts = new Map<string, number>()
  for (const r of rows) for (const item of r[key]) counts.set(item, (counts.get(item) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, TOP_N)
}

export default function Dashboard() {
  const [rows, setRows] = useState<ResponseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('responses')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        setLoading(false)
        setError(error ? `Couldn't load responses: ${error.message}` : '')
        if (!error) setRows((data ?? []) as ResponseRow[])
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  function refresh() {
    setLoading(true)
    setReloadKey((k) => k + 1)
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = rows.filter((r) => {
      if (classFilter !== 'all' && r.class_year !== classFilter) return false
      if (!q) return true
      const blob = [
        r.name,
        r.email,
        r.phone ?? '',
        r.class_year,
        ...r.fields_of_interest,
        ...r.population_interests,
        ...r.academic_topics,
        ...r.professional_topics,
      ]
        .join(' ')
        .toLowerCase()
      return blob.includes(q)
    })
    const dir = sortDir === 'asc' ? 1 : -1
    return list.sort((a, b) => {
      if (sortKey === 'created_at') return dir * (Date.parse(a.created_at) - Date.parse(b.created_at))
      if (sortKey === 'class_year') {
        return dir * (CLASS_OPTIONS.indexOf(a.class_year) - CLASS_OPTIONS.indexOf(b.class_year))
      }
      return dir * a.name.localeCompare(b.name)
    })
  }, [rows, search, classFilter, sortKey, sortDir])

  function sortBy(key: SortKey) {
    if (key === sortKey) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else {
      setSortKey(key)
      setSortDir(key === 'created_at' ? 'desc' : 'asc')
    }
  }

  function sortHeader(k: SortKey, label: string) {
    const active = sortKey === k
    return (
      <th scope="col" aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <button type="button" className="sort-btn" onClick={() => sortBy(k)}>
          {label}
          <span className="sort-arrow">{active ? (sortDir === 'asc' ? '↑' : '↓') : ''}</span>
        </button>
      </th>
    )
  }

  const classCounts = CLASS_OPTIONS.map((c) => [c, rows.filter((r) => r.class_year === c).length] as const)

  return (
    <>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Responses</div>
          <div className="stat-value stat-primary">{loading ? '—' : rows.length}</div>
        </div>
        {classCounts.map(([c, n]) => (
          <div className="stat-card" key={c}>
            <div className="stat-label">{c}</div>
            <div className="stat-value">{loading ? '—' : n}</div>
          </div>
        ))}
      </div>

      {rows.length > 0 && (
        <section className="admin-panel">
          <h2 className="panel-title">Most selected</h2>
          <div className="top-grid">
            {CATEGORIES.map(({ key, label }) => {
              const top = topCounts(rows, key)
              return (
                <div key={key}>
                  <h3 className="top-heading">{label}</h3>
                  {top.length === 0 ? (
                    <p className="admin-muted admin-small">No selections yet</p>
                  ) : (
                    <ol className="top-list">
                      {top.map(([item, n]) => (
                        <li key={item}>
                          <span>{item}</span>
                          <span className="top-count">{n}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="admin-panel toolbar">
        <input
          type="search"
          className="toolbar-search"
          placeholder="Search by name, email, phone, or topic…"
          aria-label="Search responses"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select aria-label="Filter by class" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="all">All classes</option>
          {CLASS_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => downloadCsv(visible)} disabled={visible.length === 0}>
          Export CSV
        </button>
        <button type="button" className="btn-secondary" onClick={refresh} disabled={loading}>
          Refresh
        </button>
        {rows.length > 0 && (
          <p className="admin-muted admin-small toolbar-count">
            Showing {visible.length} of {rows.length} responses
            {visible.length !== rows.length && ' · Export includes only the responses shown'}
          </p>
        )}
      </section>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <section className="admin-panel table-panel">
        {loading ? (
          <p className="admin-muted admin-center">Loading responses…</p>
        ) : rows.length === 0 ? (
          <p className="admin-muted admin-center">No responses yet. New submissions will show up here.</p>
        ) : (
          <div className="table-scroll">
            <table className="responses-table">
              <thead>
                <tr>
                  {sortHeader('name', 'Name')}
                  <th scope="col">Contact</th>
                  {sortHeader('class_year', 'Class')}
                  {CATEGORIES.map((c) => (
                    <th scope="col" key={c.key}>
                      {c.label}
                    </th>
                  ))}
                  {sortHeader('created_at', 'Submitted')}
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id}>
                    <td className="cell-name">{r.name}</td>
                    <td className="cell-contact">
                      <a href={`mailto:${r.email}`}>{r.email}</a>
                      {r.phone && <div className="admin-muted">{r.phone}</div>}
                    </td>
                    <td>{r.class_year}</td>
                    {CATEGORIES.map((c) => (
                      <td key={c.key}>
                        {r[c.key].length === 0 ? (
                          <span className="admin-muted">—</span>
                        ) : (
                          <ul className="tag-list">
                            {r[c.key].map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        )}
                      </td>
                    ))}
                    <td className="cell-date">{fmtDate(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
