import '../styles/Hero.css'
import atomImg from '../assets/ATOM.png'

export function Hero() {
  return (
    <section className="hero">
      <div className="hero__container">
        <h1 className="hero__title">
          Phos<span className="hero__title-accent">ForUs</span>
        </h1>
        <div className="hero__media">
          <img src={atomImg} alt="Atom Structure" className="hero__atom" />
        </div>
        <p className="hero__subtitle">
          Empowering Farmers with Precision Phosphorus Insights
        </p>
      </div>
    </section>
  )
}
