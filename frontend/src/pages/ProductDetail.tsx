import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';

interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  weight: number;
  dimensions: string;
  declared_value: string;
  origin_country: string;
  images: string[];
  created_at: string;
  updated_at: string;
}

interface AICandidate {
  hs_code: string;
  document: string;
  score: number;
  metadata: {
    chapter: string;
    section: string;
    hs_code: string;
  };
}

interface Classification {
  id: string;
  product_id: number;
  hs_code: string;
  confidence: number;
  reasoning: string;
  ai_candidates: AICandidate[];
  status: 'pending_review' | 'confirmed' | 'overridden';
  confirmed_hs_code: string | null;
  created_at: string;
  updated_at: string;
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [classification, setClassification] = useState<Classification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Classification action states
  const [classifying, setClassifying] = useState(false);
  const [classificationError, setClassificationError] = useState('');
  const [confirming, setConfirming] = useState(false);

  // Override form states
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [selectedCandidateCode, setSelectedCandidateCode] = useState('');
  const [useCustomCode, setUseCustomCode] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);

  // UI display states
  const [candidatesExpanded, setCandidatesExpanded] = useState(false);

  useEffect(() => {
    if (id) {
      setLoading(true);
      setError('');
      
      Promise.all([
        api.get<Product>(`/products/${id}`),
        api.get<Classification>(`/products/${id}/classify`)
          .catch((err: any) => {
            // Expected if product has not been classified yet
            if (err.status === 404 || err.error?.code === 'CLASSIFICATION_NOT_FOUND') {
              return null;
            }
            throw err;
          })
      ])
        .then(([prodData, classData]) => {
          setProduct(prodData);
          setClassification(classData);
        })
        .catch((err: any) => {
          console.error(err);
          setError(err.error?.message || 'Failed to retrieve product details.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id]);

  const handleDelete = async () => {
    if (!product) return;
    
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${product.name}"? This action cannot be undone.`
    );
    
    if (!confirmDelete) return;

    setDeleting(true);
    try {
      await api.delete(`/products/${product.id}`);
      navigate('/products');
    } catch (err: any) {
      console.error(err);
      alert(err.error?.message || 'Failed to delete product.');
    } finally {
      setDeleting(false);
    }
  };

  const handleClassify = async () => {
    if (!product) return;
    setClassifying(true);
    setClassificationError('');
    try {
      const data = await api.post<Classification>(`/products/${product.id}/classify`, {});
      setClassification(data);
    } catch (err: any) {
      console.error(err);
      setClassificationError(err.error?.message || 'AI service classification failed. Please check network/Groq status and try again.');
    } finally {
      setClassifying(false);
    }
  };

  const handleConfirm = async () => {
    if (!product || !classification) return;
    setConfirming(true);
    setClassificationError('');
    try {
      const data = await api.put<Classification>(`/products/${product.id}/classify/confirm`, {});
      setClassification(data);
    } catch (err: any) {
      console.error(err);
      setClassificationError(err.error?.message || 'Failed to confirm classification.');
    } finally {
      setConfirming(false);
    }
  };

  const handleOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    const finalCode = useCustomCode ? customCode.trim() : selectedCandidateCode;
    if (!finalCode) {
      alert('Please select a candidate HTS code or enter a custom code manually.');
      return;
    }

    setOverrideSubmitting(true);
    setClassificationError('');
    try {
      const data = await api.put<Classification>(`/products/${product.id}/classify/override`, {
        hs_code: finalCode,
        reason: overrideReason
      });
      setClassification(data);
      setShowOverrideForm(false);
      setOverrideReason('');
      setCustomCode('');
      setUseCustomCode(false);
    } catch (err: any) {
      console.error(err);
      setClassificationError(err.error?.message || 'Failed to submit HTS code override.');
    } finally {
      setOverrideSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-955 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-slate-955 flex flex-col">
        <nav className="border-b border-slate-900 bg-slate-900/50 backdrop-blur-md px-6 py-4 flex justify-between items-center">
          <Link to="/dashboard" className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            TradeComplyAI
          </Link>
        </nav>
        <main className="flex-1 p-8 max-w-md mx-auto w-full flex flex-col justify-center text-center">
          <div className="rounded-xl bg-red-950/40 border border-red-900/50 p-6">
            <h2 className="text-xl font-bold text-red-400 mb-2">Error</h2>
            <p className="text-slate-400 text-sm">{error || 'Product not found.'}</p>
            <Link to="/products" className="mt-6 inline-block bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors">
              Back to Catalog
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-955 flex flex-col text-slate-100">
      <nav className="border-b border-slate-900 bg-slate-900/50 backdrop-blur-md px-6 py-4 flex justify-between items-center">
        <Link to="/dashboard" className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          TradeComplyAI
        </Link>
        <div className="flex space-x-6">
          <Link to="/dashboard" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">Dashboard</Link>
          <Link to="/products" className="text-sm font-semibold text-blue-400">Products</Link>
        </div>
      </nav>

      <main className="flex-1 p-6 md:p-8 max-w-4xl mx-auto w-full">
        {/* Breadcrumbs / Back Header */}
        <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <Link to="/products" className="text-xs text-blue-400 hover:text-blue-300 font-semibold uppercase tracking-wider flex items-center gap-1 mb-2">
              &larr; Back to Catalog
            </Link>
            <h1 className="text-3xl font-extrabold text-white">{product.name}</h1>
            <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-900/50 border border-blue-800 text-blue-300">
              {product.category}
            </span>
          </div>

          <div className="flex space-x-3">
            <Link
              to={`/products/${product.id}/edit`}
              className="bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 px-5 rounded-lg text-sm shadow-md transition-colors"
            >
              Edit Details
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-500 text-white font-semibold py-2.5 px-5 rounded-lg text-sm shadow-md transition-colors disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete Product'}
            </button>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main info card */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 p-6 md:p-8 rounded-2xl shadow-xl space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Description</h3>
              <p className="text-slate-300 text-sm leading-relaxed">{product.description}</p>
            </div>

            {/* Parameter list */}
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Export Parameters</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Weight</span>
                  <span className="text-sm font-bold text-slate-200 mt-1 block">{product.weight} kg</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Dimensions</span>
                  <span className="text-sm font-bold text-slate-200 mt-1 block">{product.dimensions}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Declared Value</span>
                  <span className="text-sm font-bold text-emerald-400 mt-1 block">${product.declared_value} USD</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Country of Origin</span>
                  <span className="text-sm font-bold text-slate-200 mt-1 block">{product.origin_country}</span>
                </div>
              </div>
            </div>

            {/* Compliance Classification Section */}
            <div className="bg-slate-900/50 border border-slate-800 p-6 md:p-8 rounded-2xl shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M2.166 4.9L10 1.154l7.834 3.746a1 1 0 01.554.894v7.412a1 1 0 01-.554.894L10 17.846 2.166 14.1a1 1 0 01-.554-.894V5.794a1 1 0 01.554-.894zM10 3.195L3.834 6.14l6.166 2.95 6.166-2.95L10 3.195z" clipRule="evenodd" />
                    </svg>
                    HTS Classification Analysis
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">AI-suggested Harmonized Tariff Schedule code for India-US Corridor compliance.</p>
                </div>
                
                {classification && (
                  <div>
                    {classification.status === 'pending_review' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-950/80 border border-yellow-800 text-yellow-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></span>
                        Pending Review
                      </span>
                    )}
                    {classification.status === 'confirmed' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/80 border border-emerald-800 text-emerald-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Human Verified
                      </span>
                    )}
                    {classification.status === 'overridden' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-950/80 border border-blue-800 text-blue-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                        Overridden
                      </span>
                    )}
                  </div>
                )}
              </div>

              {classificationError && (
                <div className="bg-red-950/40 border border-red-900/50 p-4 rounded-xl text-red-400 text-sm flex justify-between items-center gap-4">
                  <span>{classificationError}</span>
                  <button 
                    onClick={handleClassify} 
                    className="px-3 py-1 bg-red-900/60 hover:bg-red-850 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
                  >
                    Retry Classify
                  </button>
                </div>
              )}

              {!classification && !classifying && (
                <div className="text-center py-8 space-y-4">
                  <div className="inline-flex items-center justify-center p-3 rounded-full bg-slate-950 border border-slate-800 text-slate-500 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h4 className="text-slate-300 font-bold text-sm">Product is not classified</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">Use the AI classifier pipeline to analyze the description and suggest the correct Harmonized System export code.</p>
                  <button
                    onClick={handleClassify}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-6 rounded-lg text-sm shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Classify This Product
                  </button>
                </div>
              )}

              {classifying && (
                <div className="text-center py-12 space-y-4">
                  <div className="relative inline-flex items-center justify-center">
                    <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                    <div className="absolute h-10 w-10 rounded-full bg-blue-950/50 flex items-center justify-center text-blue-400 font-semibold text-[10px]">AI</div>
                  </div>
                  <h4 className="text-blue-400 font-bold text-sm animate-pulse">Running AI Classification...</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">Retrieving HTS reference indices and generating LLM compliance analysis (takes a few seconds).</p>
                </div>
              )}

              {classification && !classifying && !showOverrideForm && (
                <div className="space-y-6">
                  {/* Code suggestion cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Suggested Code Card */}
                    <div className="bg-slate-950 border border-slate-850 p-5 rounded-xl space-y-3 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 h-16 w-16 bg-blue-500/5 group-hover:bg-blue-500/10 rounded-bl-full transition-all flex items-start justify-end p-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 112 0v9a1 1 0 11-2 0V7zM9 7a1 1 0 112 0v9a1 1 0 11-2 0V7zM14 6a1 1 0 00-1 1v9a1 1 0 102 0V7a1 1 0 00-1-1z" />
                        </svg>
                      </div>
                      
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        {classification.status === 'overridden' ? 'AI-Suggested Code (Original)' : 'Suggested HTS Code'}
                      </span>
                      <div className="text-2xl font-extrabold text-blue-400 tracking-wide font-mono">
                        {classification.hs_code}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {classification.ai_candidates?.[0]?.document?.split('| Description: ')?.[1] || 'Reference Code Description'}
                      </p>
                    </div>

                    {/* Human override active card if overridden */}
                    {classification.status === 'overridden' ? (
                      <div className="bg-blue-950/20 border border-blue-900 p-5 rounded-xl space-y-3 relative overflow-hidden">
                        <div className="absolute top-0 right-0 h-16 w-16 bg-blue-500/10 rounded-bl-full flex items-start justify-end p-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        
                        <span className="block text-[10px] font-bold text-blue-400 uppercase tracking-wider">Human-Confirmed Code</span>
                        <div className="text-2xl font-extrabold text-blue-300 tracking-wide font-mono">
                          {classification.confirmed_hs_code}
                        </div>
                        <p className="text-xs text-slate-400">This code was manually overridden and confirmed for export compliance.</p>
                      </div>
                    ) : (
                      /* Confidence Score Card */
                      <div className="bg-slate-950 border border-slate-850 p-5 rounded-xl space-y-3">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">AI Confidence Match</span>
                        <div className="flex items-baseline gap-2">
                          <span className={`text-2xl font-extrabold tracking-wide ${classification.confidence < 70 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                            {classification.confidence}%
                          </span>
                          <span className="text-xs text-slate-550 font-semibold">probability score</span>
                        </div>
                        
                        {/* Progress bar */}
                        <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${classification.confidence < 70 ? 'bg-yellow-500 animate-pulse' : 'bg-emerald-500'}`} 
                            style={{ width: `${classification.confidence}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reasoning text */}
                  <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Classification Reasoning & Audit Trail</h4>
                    <p className="text-xs text-slate-300 leading-relaxed italic">{classification.reasoning}</p>
                  </div>

                  {/* Expandable alternative candidates */}
                  {classification.ai_candidates && classification.ai_candidates.length > 0 && (
                    <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-950">
                      <button
                        onClick={() => setCandidatesExpanded(!candidatesExpanded)}
                        className="w-full px-4 py-3 flex justify-between items-center text-xs font-bold text-slate-400 hover:text-white transition-colors"
                      >
                        <span>AI Search Candidates ({classification.ai_candidates.length} alternatives)</span>
                        <span className="text-slate-500">
                          {candidatesExpanded ? 'Collapse ▲' : 'Expand ▼'}
                        </span>
                      </button>
                      
                      {candidatesExpanded && (
                        <div className="bg-slate-955 divide-y divide-slate-900 border-t border-slate-900">
                          {classification.ai_candidates.map((cand, idx) => (
                            <div key={idx} className="p-4 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 hover:bg-slate-900/20 transition-colors">
                              <div className="space-y-1">
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 border border-slate-800 text-blue-400 select-all">
                                  {cand.hs_code}
                                </span>
                                <p className="text-xs text-slate-400 leading-normal">
                                  {cand.document?.split('| Description: ')?.[1] || cand.document}
                                </p>
                              </div>
                              <div className="text-[10px] text-slate-500 whitespace-nowrap bg-slate-900 px-2 py-1 rounded border border-slate-850 self-start sm:self-auto">
                                Similarity: {(cand.score * 100).toFixed(1)}%
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    {classification.status !== 'confirmed' && (
                      <button
                        onClick={handleConfirm}
                        disabled={confirming}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2 px-5 rounded-lg text-xs transition-colors"
                      >
                        {confirming ? 'Confirming...' : 'Confirm as Correct'}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        // Pre-select the original AI code
                        setSelectedCandidateCode(classification.ai_candidates?.[0]?.hs_code || classification.hs_code);
                        setShowOverrideForm(true);
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2 px-5 rounded-lg text-xs transition-colors"
                    >
                      {classification.status === 'overridden' ? 'Update Human Override' : 'This isn\'t right / Choose different code'}
                    </button>
                  </div>
                </div>
              )}

              {classification && !classifying && showOverrideForm && (
                <form onSubmit={handleOverrideSubmit} className="space-y-6">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Compliance Correction Override</h4>
                  
                  {/* Radio list of alternative candidates */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Select matching candidate:</label>
                    
                    {classification.ai_candidates && classification.ai_candidates.length > 0 ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto border border-slate-850 rounded-xl p-3 bg-slate-950/60 divide-y divide-slate-900/50">
                        {classification.ai_candidates.map((cand, idx) => (
                          <label 
                            key={idx} 
                            className={`flex items-start gap-3 p-3 cursor-pointer rounded-lg hover:bg-slate-900/40 transition-colors ${!useCustomCode && selectedCandidateCode === cand.hs_code ? 'bg-blue-950/10 border border-blue-900/30' : ''}`}
                          >
                            <input
                              type="radio"
                              name="candidate_override"
                              checked={!useCustomCode && selectedCandidateCode === cand.hs_code}
                              disabled={useCustomCode}
                              onChange={() => setSelectedCandidateCode(cand.hs_code)}
                              className="mt-0.5 focus:ring-blue-500 h-4 w-4 text-blue-600 border-slate-800 bg-slate-950 rounded-full"
                            />
                            <div className="text-xs space-y-1">
                              <span className="font-mono font-bold text-blue-400">{cand.hs_code}</span>
                              <p className="text-slate-400 leading-normal">
                                {cand.document?.split('| Description: ')?.[1] || cand.document}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No alternative candidates available.</p>
                    )}
                  </div>

                  {/* Manual Input Trigger */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={useCustomCode}
                        onChange={(e) => setUseCustomCode(e.target.checked)}
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-slate-800 bg-slate-950 rounded"
                      />
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">I want to enter a custom HTS code manually</span>
                    </label>
                    
                    {useCustomCode && (
                      <div className="space-y-1.5">
                        <input
                          type="text"
                          required={useCustomCode}
                          placeholder="e.g. 6109.10.00.04"
                          value={customCode}
                          onChange={(e) => setCustomCode(e.target.value)}
                          className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                        />
                        <p className="text-[10px] text-slate-500">Enter a valid HTS code string matching the US tariff schedule format.</p>
                      </div>
                    )}
                  </div>

                  {/* Reason text input */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Reason for manual override (Optional):</label>
                    <textarea
                      placeholder="Explain why this code is more accurate for this product (e.g. material description details, lab test results)..."
                      rows={3}
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-350 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Form Buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={overrideSubmitting}
                      className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-2 px-5 rounded-lg text-xs transition-colors"
                    >
                      {overrideSubmitting ? 'Saving Override...' : 'Submit Override'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowOverrideForm(false)}
                      className="bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2 px-5 rounded-lg text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Media panel */}
          <div className="space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Product Images</h3>
              {product.images && product.images.length > 0 ? (
                <div className="space-y-4">
                  {product.images.map((url, index) => (
                    <div key={index} className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950 aspect-video flex items-center justify-center">
                      <img
                        src={url}
                        alt={`${product.name} visual ${index + 1}`}
                        className="object-cover w-full h-full max-h-40"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=300&q=80';
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-650 italic border border-dashed border-slate-800 rounded-lg">
                  No images uploaded
                </div>
              )}
            </div>
            
            {/* Timestamps */}
            <div className="bg-slate-900/30 border border-slate-850 p-4 rounded-xl text-xs text-slate-500 space-y-1">
              <div>Created: {new Date(product.created_at).toLocaleString()}</div>
              <div>Updated: {new Date(product.updated_at).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
