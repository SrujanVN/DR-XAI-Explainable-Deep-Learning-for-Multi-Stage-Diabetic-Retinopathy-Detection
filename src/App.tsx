import { useEffect, useState } from 'react';
import { Shell } from './components/Shell';
import Home from './pages/Home';
import Analysis from './pages/Analysis';
import Results from './pages/Results';
import Research from './pages/Research';
import Reports from './pages/Reports';
import History from './pages/History';
import About from './pages/About';
import { checkModelAvailability, getAnalysis } from './services/modelService';
import type { ModelPrediction, Page } from './types';

export default function App() {
  const initialMatch = window.location.pathname.match(/^\/results\/(DRXAI-[a-f0-9]{32})$/);
  const [page, setPage] = useState<Page>(initialMatch ? 'Results' : 'Home');
  const [result, setResult] = useState<ModelPrediction | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(initialMatch?.[1] ?? null);
  const [serviceAvailable, setServiceAvailable] = useState<boolean | null>(null);
  useEffect(() => { void checkModelAvailability().then(setServiceAvailable); }, []);
  useEffect(() => {
    if (!analysisId) return;
    let active = true;
    void getAnalysis(analysisId).then(record => { if (active) setResult(record); }).catch(() => { if (active) setResult(null); });
    return () => { active = false; };
  }, [analysisId]);
  useEffect(() => {
    const onPopState = () => {
      const match = window.location.pathname.match(/^\/results\/(DRXAI-[a-f0-9]{32})$/);
      if (match) { setAnalysisId(match[1]); setPage('Results'); }
      else if (window.location.pathname === '/') { setAnalysisId(null); setPage('Home'); }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  const navigate = (next: Page) => setPage(next);
  return <Shell page={page} onNavigate={navigate}>
    {page === 'Home' && <Home onNavigate={navigate}/>}
    {page === 'Analysis' && <Analysis serviceAvailable={serviceAvailable} onComplete={prediction => { setResult(prediction); setAnalysisId(prediction.analysis_id ?? null); if (prediction.analysis_id) window.history.pushState({}, '', `/results/${prediction.analysis_id}`); setServiceAvailable(true); setPage('Results'); window.scrollTo({top:0,behavior:'smooth'}); }}/>}
    {page === 'Results' && <Results result={result} onNavigate={navigate}/>}
    {page === 'History' && <History onSelect={id => { setAnalysisId(id); window.history.pushState({}, '', `/results/${id}`); setPage('Results'); }}/>}
    {page === 'Research' && <Research onNavigate={navigate}/>}
    {page === 'Reports' && <Reports result={result} onNavigate={navigate}/>}
    {page === 'About' && <About onNavigate={navigate}/>}
    {page === 'Home' && serviceAvailable === false && <div className="service-banner">The inference service is not connected right now. Research pages remain available; image analysis requires the Flask backend and loaded checkpoints.</div>}
  </Shell>;
}
