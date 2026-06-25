import { Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar.jsx'
import Footer from './components/Footer.jsx'
import Landing from './pages/Landing.jsx'
import Packaging from './pages/Packaging.jsx'
import WEEE from './pages/WEEE.jsx'
import Battery from './pages/Battery.jsx'
import Calculator from './pages/Calculator.jsx'
import FAQ from './pages/FAQ.jsx'
import Downloads from './pages/Downloads.jsx'
import SignupFlow from './pages/SignupFlow.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Admin from './pages/Admin.jsx'
import ApplyForm from './pages/ApplyForm.jsx'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa]">
      <NavBar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/packaging" element={<Packaging />} />
          <Route path="/weee" element={<WEEE />} />
          <Route path="/battery" element={<Battery />} />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/downloads" element={<Downloads />} />
          <Route path="/signup" element={<SignupFlow />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/apply" element={<ApplyForm />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
