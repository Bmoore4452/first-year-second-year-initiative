import { useState, type FormEvent } from 'react'
import {
  ACADEMIC_TOPICS,
  CLASS_OPTIONS,
  FIELDS_OF_INTEREST,
  POPULATION_INTERESTS,
  PROFESSIONAL_TOPICS,
} from './options'
import { submitResponse, type ResponsePayload } from './api'

const emptyForm: ResponsePayload = {
  name: '',
  email: '',
  phone: '',
  classYear: '',
  fieldsOfInterest: [],
  populationInterests: [],
  academicTopics: [],
  professionalTopics: [],
}

type ListKey = 'fieldsOfInterest' | 'populationInterests' | 'academicTopics' | 'professionalTopics'
type Status = 'idle' | 'submitting' | 'success' | 'error'

interface CheckboxGroupProps {
  legend: string
  options: string[]
  selected: string[]
  onToggle: (option: string) => void
}

function CheckboxGroup({ legend, options, selected, onToggle }: CheckboxGroupProps) {
  return (
    <fieldset>
      <legend>{legend}</legend>
      {options.map((option) => (
        <label key={option} className="checkbox">
          <input
            type="checkbox"
            checked={selected.includes(option)}
            onChange={() => onToggle(option)}
          />
          {option}
        </label>
      ))}
    </fieldset>
  )
}

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`

function Header() {
  return (
    <>
      <header className="brand">
        <img src={assetUrl('images/cau-seal.svg')} alt="Clark Atlanta University seal" className="seal" />
        <span>Clark Atlanta University</span>
      </header>
    </>
  )
}

export default function App() {
  const [form, setForm] = useState<ResponsePayload>(emptyForm)
  const [status, setStatus] = useState<Status>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  function toggle(key: ListKey, option: string) {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(option)
        ? prev[key].filter((o) => o !== option)
        : [...prev[key], option],
    }))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('submitting')
    setErrorMessage('')
    try {
      await submitResponse(form)
      setStatus('success')
      setForm(emptyForm)
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  if (status === 'success') {
    return (
      <main className="container">
        <Header />
        <h1>Thank you!</h1>
        <p>Your response has been recorded.</p>
        <button type="button" onClick={() => setStatus('idle')}>
          Submit another response
        </button>
      </main>
    )
  }

  return (
    <main className="container">
      <Header />
      <h1>First Year / Second Year Mentorship Initiative</h1>

      <img
        src={assetUrl('images/library-study.jpg')}
        alt="Three students studying together in a library"
        className="hero"
      />
      <form onSubmit={handleSubmit}>
        <label>
          Name:
          <input
            type="text"
            required
            maxLength={100}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>

        <label>
          Email:
          <input
            type="email"
            required
            maxLength={255}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>

        <label>
          Phone number:
          <input
            type="tel"
            maxLength={30}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </label>

        <label>
          Class:
          <select
            required
            value={form.classYear}
            onChange={(e) => setForm({ ...form, classYear: e.target.value })}
          >
            <option value="" disabled>
              Select one
            </option>
            {CLASS_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <CheckboxGroup
          legend="Fields of Interest (check all that apply)"
          options={FIELDS_OF_INTEREST}
          selected={form.fieldsOfInterest}
          onToggle={(o) => toggle('fieldsOfInterest', o)}
        />

        <CheckboxGroup
          legend="Population Interests (check all that apply)"
          options={POPULATION_INTERESTS}
          selected={form.populationInterests}
          onToggle={(o) => toggle('populationInterests', o)}
        />

        <section className="survey">
          <h2>Needs Survey</h2>
          <p className="hint">Check any topics you would like help with.</p>

          <CheckboxGroup
            legend="Academic Interests"
            options={ACADEMIC_TOPICS}
            selected={form.academicTopics}
            onToggle={(o) => toggle('academicTopics', o)}
          />

          <CheckboxGroup
            legend="Professional Development Interests"
            options={PROFESSIONAL_TOPICS}
            selected={form.professionalTopics}
            onToggle={(o) => toggle('professionalTopics', o)}
          />
        </section>

        {status === 'error' && <p className="error">{errorMessage}</p>}

        <button type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </main>
  )
}
