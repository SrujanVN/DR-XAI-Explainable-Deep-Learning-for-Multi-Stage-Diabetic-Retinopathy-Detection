import { useRef, useState } from 'react';
import { AlertCircle, ArrowRight, Check, FileImage, ImagePlus, LoaderCircle, ScanLine, ShieldCheck, Upload, X } from 'lucide-react';
import { PageHeading, Disclaimer } from '../components/Shell';
import { predictImage } from '../services/modelService';
import type { ModelPrediction } from '../types';

const stages = ['Upload', 'Preprocess', 'Inference', 'Explain'];
export default function Analysis({ onComplete, serviceAvailable }: { onComplete: (result: ModelPrediction) => void; serviceAvailable: boolean | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null); const [preview, setPreview] = useState(''); const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<'idle'|'working'|'error'>('idle'); const [error, setError] = useState('');
  const chooseFile = (picked?: File) => {
    setError(''); if (!picked) return;
    if (!['image/jpeg', 'image/png'].includes(picked.type)) { setError('This file type is not supported. Choose a JPG, JPEG, or PNG image.'); return; }
    if (picked.size > 12 * 1024 * 1024) { setError('This image is larger than 12 MB. Choose a smaller file.'); return; }
    setFile(picked); setPreview(URL.createObjectURL(picked)); setStatus('idle');
  };
  const analyze = async () => { if (!file) { setError('Choose an image before starting analysis.'); return; } setStatus('working'); setError(''); try { onComplete(await predictImage(file)); } catch (cause) { setStatus('error'); setError(cause instanceof Error ? cause.message : 'Analysis could not be completed.'); } };
  return <div className="page-wrap"><PageHeading eyebrow="IMAGE ANALYSIS" title="Start with an image." description="Upload a retinal fundus image to run the currently configured research model." action={<div className={`api-status ${serviceAvailable === false ? 'offline' : ''}`}><span className="status-dot"/>{serviceAvailable === null ? 'Checking model service' : serviceAvailable ? 'Model service ready' : 'Model service unavailable'}</div>}/>
    <div className="analysis-layout"><section className="panel upload-panel"><div className="panel-heading"><div><span className="step-label">01 / IMAGE INPUT</span><h2>Upload a fundus image</h2><p>Images stay on the configured research service during inference.</p></div><span className="icon-tile"><ScanLine size={19}/></span></div>
      {file ? <div className="preview-wrap"><img src={preview} alt="Selected retinal fundus image preview"/><div className="preview-overlay"><span><FileImage size={15}/>{file.name}</span><button aria-label="Remove image" className="icon-button inverse" onClick={() => {setFile(null); setPreview(''); setError('');}}><X size={16}/></button></div></div> : <button className={`drop-zone ${dragging ? 'dragging' : ''}`} onClick={() => input.current?.click()} onDragOver={e => {e.preventDefault();setDragging(true);}} onDragLeave={() => setDragging(false)} onDrop={e => {e.preventDefault();setDragging(false);chooseFile(e.dataTransfer.files[0]);}}><span className="upload-icon"><ImagePlus size={22}/></span><strong>Drag an image here, or <em>browse files</em></strong><small>Retinal fundus image · JPG, JPEG, PNG · Up to 12 MB</small></button>}
      <input ref={input} type="file" accept="image/jpeg,image/png" className="sr-only" aria-label="Choose retinal fundus image" onChange={e => chooseFile(e.target.files?.[0])}/>
      {error && <div className="inline-error" role="alert"><AlertCircle size={17}/><span>{error}</span></div>}
      <div className="upload-actions">{file && <button className="button button-outline" onClick={() => input.current?.click()}><Upload size={16}/> Replace image</button>}<button className="button button-primary" disabled={!file || status === 'working'} onClick={analyze}>{status === 'working' ? <><LoaderCircle className="spin" size={16}/> Analyzing image</> : <>Run analysis <ArrowRight size={16}/></>}</button></div>
      {status === 'working' && <div className="workflow" aria-live="polite">{stages.map((stage, i) => <div key={stage} className={`workflow-step ${i < 3 ? 'current' : ''}`}><span>{i < 2 ? <Check size={12}/> : i === 2 ? <LoaderCircle className="spin" size={13}/> : i + 1}</span>{stage}</div>)}</div>}
    </section><aside className="analysis-aside"><div className="panel side-panel"><span className="step-label">WHAT HAPPENS NEXT</span><h3>Image to insight</h3><div className="process-list">{[['01','Validate image format'],['02','Apply configured preprocessing'],['03','Run loaded model checkpoints'],['04','Return standardized prediction']].map(([n,t])=><div className="process-row" key={n}><span>{n}</span><p>{t}</p></div>)}</div></div><div className="panel side-panel model-summary"><div className="summary-icon"><ShieldCheck size={17}/></div><div><b>Current model stack</b><p>Configured checkpoint ensemble<br/>Majority-vote classification</p></div><span className="status-pill">BASELINE</span></div><div className="help-note"><AlertCircle size={15}/><p>No prediction is generated in the browser. If the backend is unavailable, the interface shows its error response.</p></div></aside></div><Disclaimer compact/>
  </div>;
}
