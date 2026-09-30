import { useEffect, useState } from 'react';
import { Activity, AlertCircle, ArrowUpRight, LoaderCircle } from 'lucide-react';
import { PageHeading } from '../components/Shell';
import { getAnalysisHistory } from '../services/modelService';
import type { AnalysisRecord } from '../types';

export default function History({ onSelect }: { onSelect: (analysisId: string) => void }) {
  const [items, setItems] = useState<AnalysisRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void getAnalysisHistory().then(result => {
      if (active) { setItems(result.items); setTotal(result.total); }
    }).catch(cause => {
      if (active) setError(cause instanceof Error ? cause.message : 'Analysis history is unavailable.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return <div className="page-wrap">
    <PageHeading eyebrow="ANALYSIS HISTORY" title="Previous analyses." description="Recent records saved by the research service. No patient identity information is shown." action={<span className="status-pill">{total} RECORD{total === 1 ? '' : 'S'}</span>}/>
    <section className="panel" style={{ padding: 22 }}>
      {loading ? <div className="empty-results"><LoaderCircle className="spin"/><p>Loading saved analyses</p></div> : error ? <div className="inline-error" role="alert"><AlertCircle size={17}/><span>{error}</span></div> : items.length === 0 ? <div className="empty-results"><div className="empty-orbit"><Activity size={25}/></div><h2>No saved analyses yet</h2><p>Completed analyses will appear here when MongoDB is connected.</p></div> : <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}><thead><tr>{['Analysis ID', 'Date', 'Prediction', 'Confidence', 'Model', 'Status', ''].map(label => <th key={label} style={{ padding: '12px 10px', color: '#718096', fontSize: 11, borderBottom: '1px solid #e6edf4' }}>{label}</th>)}</tr></thead><tbody>{items.map(item => <tr key={item.analysis_id} style={{ cursor: 'pointer' }} onClick={() => onSelect(item.analysis_id)}><td style={{ padding: 12, borderBottom: '1px solid #eef2f5', fontSize: 11 }}>{item.analysis_id}</td><td style={{ padding: 12, borderBottom: '1px solid #eef2f5', fontSize: 11 }}>{new Date(item.created_at).toLocaleString()}</td><td style={{ padding: 12, borderBottom: '1px solid #eef2f5', fontSize: 12, fontWeight: 700 }}>{item.prediction.class_name}</td><td style={{ padding: 12, borderBottom: '1px solid #eef2f5', fontSize: 12 }}>{(item.prediction.confidence * 100).toFixed(1)}%</td><td style={{ padding: 12, borderBottom: '1px solid #eef2f5', fontSize: 11 }}>{item.model.name}</td><td style={{ padding: 12, borderBottom: '1px solid #eef2f5', fontSize: 11 }}>{item.status}</td><td style={{ padding: 12, borderBottom: '1px solid #eef2f5' }}><ArrowUpRight size={15}/></td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
