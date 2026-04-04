import Nav from './components/Nav';
import Hero from './components/Hero';
import ForWho from './components/ForWho';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import CtaBanner from './components/CtaBanner';
import Footer from './components/Footer';

export default function App() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <Nav />
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
