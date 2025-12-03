import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { ScanPage } from '@/pages/ScanPage'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/students" element={<div>Students page (coming soon)</div>} />
          <Route path="/reports" element={<div>Reports page (coming soon)</div>} />
          <Route path="/settings" element={<div>Settings page (coming soon)</div>} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
