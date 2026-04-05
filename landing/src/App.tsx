import { useState, useEffect } from 'react';
import Nav from './components/Nav';
import Hero from './components/Hero';
import ForWho from './components/ForWho';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import CtaBanner from './components/CtaBanner';
import Footer from './components/Footer';

export default function App() {
  const [light, setLight] = useState(() => localStorage.getItem('theme') === 'light');

  useEffect(() => {
    document.documentElement.classList.toggle('light', light);
    localStorage.setItem('theme', light ? 'light' : 'dark');
  }, [light]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <Nav onToggleTheme={() => setLight(v => !v)} isLight={light} />
      <main>
        <Hero />
        <ForWho />
        <Features />
        <HowItWorks />
        <CtaBanner />
      </main>
      <Footer />
    </div>
  );
}
