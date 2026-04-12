import { useEffect, useState } from 'react'
import { HomePage } from './pages/HomePage'
import { AboutPage } from './pages/AboutPage'
import { TrainPage } from './pages/TrainPage'
import './styles/App.css'

function App() {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const onLocationChange = () => {
      setPath(window.location.pathname)
    }
    window.addEventListener('popstate', onLocationChange)
    return () => window.removeEventListener('popstate', onLocationChange)
  }, [])

  if (path === '/about') {
    return <AboutPage />
  }

  if (path === '/train') {
    return <TrainPage />
  }

  return <HomePage />
}

export default App
