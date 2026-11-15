import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { api } from './lib/api'
import './App.css'

type Health = { status: string; app: string; time: string }

function Home() {
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<Health>('/health')
      .then((res) => setHealth(res.data))
      .catch((err) => setError(err.message))
  }, [])

  return (
    <main className="home">
      <h1>SignBridge</h1>
      <p>Laravel + React setup</p>
      <div className="status">
        {health && <span className="ok">Backend connected: {health.app}</span>}
        {error && <span className="err">Backend not reachable ({error})</span>}
        {!health && !error && <span>Checking backend…</span>}
      </div>
    </main>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  )
}
