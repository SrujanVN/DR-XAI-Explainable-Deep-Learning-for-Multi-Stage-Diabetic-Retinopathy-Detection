import { useEffect, useState } from 'react';
import { Shell } from './components/Shell';
import Home from './pages/Home';
import Analysis from './pages/Analysis';
import Results from './pages/Results';
import Research from './pages/Research';
import Reports from './pages/Reports';
import About from './pages/About';
import { checkModelAvailability } from './services/modelService';
import type { ModelPrediction, Page } from './types';

export default function App() {
  const [page, setPage] = useState<Page>('Home');
  const [result, setResult] = useState<ModelPrediction | null>(null);
  const [serviceAvailable, setServiceAvailable] = useState<boolean | null>(null);
  useEffect(() => { void checkModelAvailability().then(setServiceAvailable); }, []);
  const navigate = (next: Page) => setPage(next);
  return <Shell page={page} onNavigate={navigate}>
    {page === 'Home' && <Home onNavigate={navigate}/>}
    {page === 'Analysis' && <Analysis serviceAvailable={serviceAvailable} onComplete={prediction => { setResult(prediction); setServiceAvailable(true); setPage('Results'); window.scrollTo({top:0,behavior:'smooth'}); }}/>}
    {page === 'Results' && <Results result={result} onNavigate={navigate}/>}
    {page === 'Research' && <Research onNavigate={navigate}/>}
    {page === 'Reports' && <Reports result={result} onNavigate={navigate}/>}
    {page === 'About' && <About onNavigate={navigate}/>}
    {page === 'Home' && serviceAvailable === false && <div className="service-banner">The inference service is not connected right now. Research pages remain available; image analysis requires the Flask backend and loaded checkpoints.</div>}
  </Shell>;
}
