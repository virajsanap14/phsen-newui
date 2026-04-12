import { Navbar } from '../components/Navbar'
import { Hero } from '../components/Hero'
import { Features } from '../components/Features'
import { Footer } from '../components/Footer'
import '../styles/HomePage.css'

export function HomePage() {
  return (
    <div className="home-page">
      <Navbar />
      <main>
        <Hero />
        <Features />
      </main>
      <Footer />
    </div>
  )
}
