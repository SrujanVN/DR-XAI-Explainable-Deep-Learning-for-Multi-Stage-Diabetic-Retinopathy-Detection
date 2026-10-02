import { useState } from 'react';
import { Download, FileCheck2, FileText, Info, Printer } from 'lucide-react';
import { PageHeading, Disclaimer } from '../components/Shell';
import type { ModelPrediction, Page } from '../types';
import { markReportGenerated } from '../services/modelService';

const labels = ['No DR', 'Mild', 'Moderate', 'Severe', 'Proliferative DR'];
const prettyModelName = (name: string) => name.replace(/_/g, ' ');

export default function Reports({ result, onNavigate }: { result: ModelPrediction | null; onNavigate: (page: Page) => void }) {
  const [generated, setGenerated] = useState(false);
  const individualModels = result?.individual_models ?? {};
  const explanations = result?.explainability?.models ?? {};
  const modelNames = [...new Set([...Object.keys(individualModels), ...Object.keys(explanations)])];
  const report = result ? {
    title: 'DR-XAI Research Analysis Report',
    analysis_id: result.analysis_id,
    generatedAt: new Date().toISOString(),
    analyzedAt: result.created_at,
    image: 'Uploaded retinal fundus image',
    image_url: result.image_url,
    prediction: {
      label: result.class_name,
      class: result.predicted_class,
      confidence: result.confidence,
      probabilities: result.probabilities,
      ensemble_method: 'Mean probability (soft voting)',
    },
    model: { name: result.model_name, version: result.model_version, status: 'Current research baseline' },
    individual_models: individualModels,
    preprocessing: result.preprocessing ?? {},
    explainability: explanations,
    metricsContext: 'Baseline research metrics are available on the Research page and are not per-image performance measures.',
    disclaimer: 'Experimental research prototype. A model output is not a medical diagnosis. Not clinically validated. Not a substitute for evaluation by a qualified healthcare professional.',
  } : null;

  const download = () => {
    if (!report) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dr-xai-research-report.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const generate = async () => {
    if (!result) return;
    try {
      if (result.analysis_id) await markReportGenerated(result.analysis_id);
      setGenerated(true);
      download();
    } catch {
      setGenerated(false);
    }
  };

  return <div className="page-wrap">
    <PageHeading eyebrow="REPORTS" title="A structured research record." description="Generate and download a report containing the ensemble result, each model output, explanation maps, and preprocessing views." action={result ? <button className="button button-primary" onClick={() => void generate()}><Download size={16}/> Download report</button> : undefined}/>
    {!result ? <section className="empty-results report-empty"><div className="empty-orbit"><FileText size={26}/></div><h2>No analysis is available to report</h2><p>Run an analysis first. Reports do not include invented patient or image details.</p><button className="button button-primary" onClick={() => onNavigate('Analysis')}>Go to image analysis</button></section> : <div className="report-layout">
      <section className="panel report-preview">
        <div className="report-top"><div className="report-file-icon"><FileText size={19}/></div><div><span className="step-label">REPORT PREVIEW</span><h2>Research analysis record</h2></div><span className="report-status"><FileCheck2 size={14}/> {generated ? 'GENERATED' : 'READY'}</span></div>
        <div className="report-content">
          <div className="report-section"><span>01</span><div><h3>Image information</h3><p>Retinal fundus image submitted for research analysis. No patient information was provided.</p><div className="report-preprocessing-grid">{[
            { label: 'Original', url: result.image_url },
            { label: 'Filtered', url: result.preprocessing?.filtered_url },
            { label: 'CLAHE Green Channel', url: result.preprocessing?.clahe_green_url },
          ].map(view => <figure className="report-image-card" key={view.label}><figcaption>{view.label}</figcaption>{view.url ? <img src={view.url} alt={`${view.label} fundus image`}/> : <div className="report-image-missing">Not attached to this saved analysis.</div>}</figure>)}</div></div></div>
          <div className="report-section"><span>02</span><div><h3>Four-model ensemble prediction</h3><p><strong>{result.class_name}</strong> · Class {result.predicted_class} · Mean probability {(result.confidence * 100).toFixed(1)}%</p></div></div>
          <div className="report-section"><span>03</span><div><h3>Ensemble probability distribution</h3><div className="report-probs">{labels.map((name, index) => <span key={name}>{name}<b>{(result.probabilities[index] * 100).toFixed(1)}%</b></span>)}</div></div></div>
          <div className="report-section"><span>04</span><div><h3>Individual model outputs</h3>{Object.keys(individualModels).length ? <div className="report-model-grid">{Object.entries(individualModels).map(([name, model]) => <article className="report-model-card" key={name}><h4>{prettyModelName(name)}</h4><p><strong>{model.class_name}</strong><b>{(model.confidence * 100).toFixed(1)}%</b></p><small>Per-model confidence</small><div className="report-model-probs">{labels.map((label, index) => <span key={label}>{label}<b>{(model.probabilities[index] * 100).toFixed(1)}%</b></span>)}</div></article>)}</div> : <p>Individual predictions were not saved in this result. Run a new analysis with the updated backend to include all four model outputs.</p>}</div></div>
          <div className="report-section"><span>05</span><div><h3>Per-model explainability</h3>{modelNames.length ? <div className="report-model-grid">{modelNames.map(name => {
            const modelExplanation = explanations[name];
            const prediction = individualModels[name];
            const className = prediction?.class_name ?? labels[modelExplanation?.target_class ?? result.predicted_class];
            return <article className="report-model-card report-explanation-card" key={name}><h4>{prettyModelName(name)}</h4><p><strong>{className}</strong>{prediction && <b>{(prediction.confidence * 100).toFixed(1)}% confidence</b>}</p><div className="report-map-grid">{[
              { label: 'Grad-CAM', url: modelExplanation?.gradcam_url, available: modelExplanation?.gradcam_available },
              { label: 'SHAP', url: modelExplanation?.shap_url, available: modelExplanation?.shap_available },
            ].map(map => <figure className="report-image-card" key={map.label}><figcaption>{map.label}</figcaption>{map.available && map.url ? <img src={map.url} alt={`${map.label} explanation for ${prettyModelName(name)}`}/> : <div className="report-image-missing">{map.label} map unavailable for this saved analysis.</div>}</figure>)}</div></article>;
          })}</div> : <p>Per-model explanation availability was not attached. Run a new analysis with the updated backend to generate maps for all four models.</p>}</div></div>
          <div className="report-section"><span>06</span><div><h3>Research metrics context</h3><p>Baseline research evaluation metrics are reported separately and are not per-image performance measures.</p></div></div>
        </div>
        <div className="report-disclaimer"><Info size={16}/><p>{report?.disclaimer}</p></div>
      </section>
      <aside className="report-aside"><div className="panel side-panel"><span className="step-label">REPORT ACTIONS</span><h3>Export your record</h3><p className="side-copy">Download a JSON file with the ensemble prediction, each model’s output, explanation image links, and preprocessing image links. Patient fields remain absent unless explicitly supplied.</p><button className="button button-primary full-button" onClick={() => void generate()}><Download size={16}/> Download JSON</button><button className="button button-outline full-button" onClick={() => window.print()}><Printer size={16}/> Print this view</button></div><div className="report-data-note"><Info size={15}/><span>No patient name, age, or other identity details are collected in this interface.</span></div></aside>
    </div>}
    <Disclaimer compact/>
  </div>;
}
