import { useState } from 'react';
import { ArrowLeft, ArrowUpRight, BarChart3, BrainCircuit, CircleHelp, Download, Info, Layers3, ScanEye, Sparkles } from 'lucide-react';
import { PageHeading, Disclaimer } from '../components/Shell';
import type { ModelPrediction, Page } from '../types';

const labels = ['No DR', 'Mild', 'Moderate', 'Severe', 'Proliferative DR'];
type ExplanationTab = 'Grad-CAM' | 'SHAP' | 'Confidence';
const prettyModelName = (name: string) => name.replace(/_/g, ' ');

export default function Results({ result, onNavigate }: { result: ModelPrediction | null; onNavigate: (page: Page) => void }) {
  const [tab, setTab] = useState<ExplanationTab>('Grad-CAM');
  if (!result) return <div className="page-wrap"><PageHeading eyebrow="ANALYSIS RESULTS" title="No result to show yet." description="Run an image through the configured model service to view a research prediction." action={<button className="button button-primary" onClick={() => onNavigate('Analysis')}>Go to analysis <ArrowUpRight size={16}/></button>}/><div className="empty-results"><div className="empty-orbit"><ScanEye size={28}/></div><h2>Your result will appear here</h2><p>The results page only displays outputs returned by a connected model service. It does not create placeholder predictions.</p><button className="button button-outline" onClick={() => onNavigate('Analysis')}><ArrowLeft size={16}/> Start an analysis</button></div></div>;

  const explanation = result.explainability;
  const individualModels = result.individual_models ?? {};
  const perModelExplanations = explanation?.models ?? {};
  const modelNames = [...new Set([...Object.keys(individualModels), ...Object.keys(perModelExplanations)])];
  if (!modelNames.length && (explanation?.gradcam_available || explanation?.shap_available)) {
    modelNames.push(explanation.explanation_model ?? result.model_name);
  }
  const explanationRows = modelNames.map(name => ({
    name,
    prediction: individualModels[name],
    explanation: perModelExplanations[name] ?? (name === (explanation?.explanation_model ?? result.model_name) ? {
      target_class: explanation?.target_class ?? result.predicted_class,
      gradcam_available: explanation?.gradcam_available ?? false,
      shap_available: explanation?.shap_available ?? false,
      gradcam_url: explanation?.gradcam_url,
      shap_url: explanation?.shap_url,
    } : undefined),
  }));

  return <div className="page-wrap">
    <PageHeading eyebrow="ANALYSIS RESULTS" title="Ensemble research prediction." description="Soft-voted result from the four locally loaded model checkpoints." action={<button className="button button-outline" onClick={() => onNavigate('Reports')}><Download size={15}/> Create report</button>}/>
    <div className="results-grid">
      <section className="panel result-image-panel"><div className="panel-heading"><div><span className="step-label">SUBMITTED IMAGE</span><h2>Fundus image</h2></div><span className="image-tag"><span className="live-dot"/> IMAGE</span></div><img className="result-image" src={result.image_url} alt="Fundus image analyzed by the research model"/><div className="image-foot"><span>Source image · research analysis</span><button title="Image stays associated with this local analysis" className="icon-button"><Info size={16}/></button></div></section>
      <section className="panel prediction-panel">
        <div className="prediction-top"><span className="research-tag"><BrainCircuit size={14}/> FOUR MODEL ENSEMBLE</span><span className="model-tag">SOFT VOTE</span></div><span className="prediction-label">Predicted severity</span><h2>{result.class_name}</h2>
        <div className="grade-inline">CLASS <strong>{String(result.predicted_class).padStart(2,'0')}</strong><span className="grade-divider"/>Confidence <strong>{(result.confidence*100).toFixed(1)}%</strong></div><div className="result-rule"/>
        <div className="distribution-title"><div><BarChart3 size={16}/><strong>Ensemble probability distribution</strong></div><small>Mean model output</small></div><div className="probability-list">{labels.map((label, index) => <div key={label} className={`probability-row ${index === result.predicted_class ? 'selected' : ''}`}><span className="prob-label">{label}</span><div className="prob-track"><span style={{ width: `${Math.min(100,Math.max(0,result.probabilities[index] * 100))}%` }}/></div><b>{(result.probabilities[index]*100).toFixed(1)}%</b></div>)}</div>
        {result.consistency_corrected && <div className="ensemble-warning"><strong>Prediction label corrected to match the probabilities.</strong><p>{Object.keys(individualModels).length === 4 ? 'The stored ensemble label differed from the mean of the four model outputs.' : 'This saved result used an older voting rule and has no per-model outputs. Run a new analysis with the updated backend for four individual predictions and matching Grad-CAM and SHAP maps.'}</p></div>}
        <div className="model-meta"><Layers3 size={16}/><span><b>{Object.keys(individualModels).length || 4} local models</b><small>{result.model_name} · Version {result.model_version}</small></span><button onClick={() => onNavigate('Research')} aria-label="Model research details"><ArrowUpRight size={16}/></button></div>{result.analysis_id && <p className="image-foot">Analysis ID · {result.analysis_id}</p>}
      </section>
    </div>

    <section className="panel preprocessing-panel"><div className="explain-heading"><div><span className="step-label">IMAGE PREPROCESSING STEPS</span><h2>Input preparation</h2><p>The filtered view is the image sent through model inference; CLAHE highlights the green channel for visual comparison.</p></div><ScanEye size={19}/></div><div className="preprocessing-grid">{[
      { label: 'Original', description: 'Uploaded fundus image', url: result.image_url },
      { label: 'Filtered', description: 'Inference enhancement and crop', url: result.preprocessing?.filtered_url },
      { label: 'CLAHE Green Channel', description: 'Contrast-limited adaptive histogram equalization', url: result.preprocessing?.clahe_green_url },
    ].map(view=><figure className="preprocessing-card" key={view.label}><figcaption><strong>{view.label}</strong><small>{view.description}</small></figcaption>{view.url ? <img src={view.url} alt={`${view.label} preprocessing view`}/> : <div className="preprocessing-missing">Not attached to this saved analysis. New analyses include this view.</div>}</figure>)}</div></section>

    {Object.keys(individualModels).length > 0 && <section className="panel ensemble-models"><div className="explain-heading"><div><span className="step-label">INDIVIDUAL MODEL OUTPUTS</span><h2>Four checkpoint predictions</h2><p>Each model contributes its five-class probabilities to the soft-voted ensemble.</p></div><Layers3 size={19}/></div><div className="individual-model-grid">{Object.entries(individualModels).map(([name, model]) => <article className="individual-model-card" key={name}><div><span className="step-label">MODEL</span><h3>{prettyModelName(name)}</h3></div><p className="individual-model-prediction">{model.class_name}<b>{(model.confidence*100).toFixed(1)}%</b></p><small>Per-model confidence</small><div className="individual-probabilities">{labels.map((label,index)=><div key={label}><span>{label}</span><i><b style={{width:`${Math.min(100,Math.max(0,model.probabilities[index]*100))}%`}}/></i><strong>{(model.probabilities[index]*100).toFixed(1)}%</strong></div>)}</div></article>)}</div></section>}

    <section className="panel explain-panel">
      <div className="explain-heading"><div><span className="step-label">INTERPRETABILITY</span><h2>Per-model explanations</h2><p>Each map explains that model’s own predicted class. Visualizations do not confirm lesions.</p></div><Sparkles size={19}/></div>
      <div className="explain-tabs" role="tablist">{(['Grad-CAM','SHAP','Confidence'] as const).map(item=><button key={item} role="tab" aria-selected={tab===item} className={tab===item?'selected':''} onClick={()=>setTab(item)}>{item}</button>)}</div>
      <div className="explain-content">
        {tab === 'Confidence' ? <div className="confidence-detail"><div className="distribution-title"><div><BarChart3 size={16}/><strong>Ensemble class probabilities</strong></div><small>Mean of four models</small></div><div className="probability-list">{labels.map((label,index)=><div key={label} className={`probability-row ${index===result.predicted_class?'selected':''}`}><span className="prob-label">{label}</span><div className="prob-track"><span style={{width:`${Math.min(100,Math.max(0,result.probabilities[index]*100))}%`}}/></div><b>{(result.probabilities[index]*100).toFixed(1)}%</b></div>)}</div><div className="future-state"><span><CircleHelp size={19}/></span><div><strong>Model confidence is not clinical certainty.</strong><p>These values describe the ensemble output for this image. Calibration is under investigation in the research baseline.</p></div></div></div> : explanationRows.length ? <div className="model-explanation-grid">{explanationRows.map(({name,prediction,explanation: modelExplanation})=>{
          const isShap = tab === 'SHAP';
          const available = isShap ? modelExplanation?.shap_available : modelExplanation?.gradcam_available;
          const imageUrl = isShap ? modelExplanation?.shap_url : modelExplanation?.gradcam_url;
          const className = prediction?.class_name ?? labels[modelExplanation?.target_class ?? result.predicted_class];
          return <article className="model-explanation-card" key={name}><div className="model-explanation-heading"><div><span className="step-label">{isShap ? 'SHAP' : 'GRAD-CAM'}</span><h3>{prettyModelName(name)}</h3></div><span className="model-tag">{className} · {((prediction?.confidence ?? 0)*100).toFixed(1)}%</span></div>{available && imageUrl ? <><img src={imageUrl} alt={`${tab} explanation for ${prettyModelName(name)} predicting ${className}`}/><p>{isShap ? 'Pixel attribution for this model’s predicted class.' : `Regions influencing this model’s ${className} score.`}</p></> : <div className="model-explanation-missing">{tab} could not be generated for this model.</div>}</article>;
        })}</div> : <div className="future-state"><span>{tab === 'SHAP' ? <Sparkles size={19}/> : <ScanEye size={19}/>}</span><div><strong>{tab} maps are not attached to this analysis.</strong><p>Run a new analysis after all four local models finish loading to create per-model maps.</p></div></div>}
      </div>
    </section>
    <Disclaimer compact/>
  </div>;
}
