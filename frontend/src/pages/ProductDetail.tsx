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

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      api.get<Product>(`/products/${id}`)
        .then((data) => {
          setProduct(data);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
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
    <div className="min-h-screen bg-slate-955 flex flex-col">
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
                          // Simple broken image fallback
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
