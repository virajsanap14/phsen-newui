import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import '../styles/AboutPage.css'

export function AboutPage() {
  return (
    <div className="about-page">
      <Navbar />
      <main className="about-content">
        <h1>About PhosForUs</h1>
        <p>This page is currently being developed.</p>
        <a href="/" className="back-link">Return Home</a>
      </main>
      <Footer />
    </div>
  )
}
