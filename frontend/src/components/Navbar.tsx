import { useState } from 'react'
import '../styles/Navbar.css'
import logo from '../assets/PhosForUs logo small.png'

function navigate(e: React.MouseEvent<HTMLAnchorElement>, path: string) {
  e.preventDefault()
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="navbar">
      <div className="navbar__container">
        <a href="/" className="navbar__logo" onClick={(e) => navigate(e, '/')}>
          <img src={logo} alt="PhosForUs" className="navbar__logo-img" />
         <span className="navbar__logo-text">Phos<span className="navbar__logo-accent">ForUs</span></span>
        </a>

        <nav className="navbar__links">
          <a href="/train" onClick={(e) => navigate(e, '/train')}>Train</a>
          <a href="/about" onClick={(e) => navigate(e, '/about')}>About</a>
        </nav>

        <button
          className={`navbar__hamburger ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span /><span /><span />
        </button>
      </div>

      {menuOpen && (
        <nav className="navbar__mobile">
          <a href="/train" onClick={(e) => { navigate(e, '/train'); setMenuOpen(false) }}>Train</a>
          <a href="/about" onClick={(e) => { navigate(e, '/about'); setMenuOpen(false) }}>About</a>
        </nav>
      )}
    </header>
  )
}

