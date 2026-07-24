import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  classifications?: {
    status: 'pending_review' | 'confirmed' | 'overridden';
  }[];
}

interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const limit = 9; // Show grid items in multiples of 3

  useEffect(() => {
    setLoading(true);
    setError('');

    // Construct query parameters
    let path = `/products?page=${page}&limit=${limit}`;
    if (category) {
      path += `&category=${encodeURIComponent(category)}`;
    }

    api.get<ProductsResponse>(path)
      .then((data) => {
        setProducts(data.products);
        setTotal(data.total);
      })
      .catch((err: any) => {
        console.error(err);
        setError(err.error?.message || 'Failed to load product catalog.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [page, category]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategory(e.target.value);
    setPage(1); // Reset page to 1 when changing filter
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <nav className="border-b border-slate-900 bg-slate-900/50 backdrop-blur-md px-6 py-4 flex justify-between items-center">
        <Link to="/dashboard" className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          TradeComplyAI
        </Link>
        <div className="flex space-x-6">
          <Link to="/dashboard" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">Dashboard</Link>
          <Link to="/products" className="text-sm font-semibold text-blue-400">Products</Link>
        </div>
      </nav>

      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col">
        {/* Header Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white">Product Catalog</h1>
            <p className="text-slate-400 text-sm mt-1">Manage and inspect parameters for export compliance reviews.</p>
          </div>
          <Link
            to="/products/new"
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-5 rounded-lg text-sm shadow-md transition-colors text-center"
          >
            Add Product
          </Link>
        </div>

        {/* Filter and Query bar */}
        <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="w-full sm:w-64">
            <select
              value={category}
              onChange={handleCategoryChange}
              className="block w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              <option value="Textiles">Textiles</option>
              <option value="Electronics">Electronics</option>
              <option value="Machinery">Machinery</option>
              <option value="Chemicals">Chemicals</option>
              <option value="Agri-products">Agri-products</option>
              <option value="Handicrafts">Handicrafts</option>
              <option value="Others">Others</option>
            </select>
          </div>
          <div className="text-xs text-slate-400">
            {loading ? 'Refreshing...' : `Showing ${products.length} of ${total} products`}
          </div>
        </div>

        {/* Dynamic State Views */}
        {error && (
          <div className="rounded-lg bg-red-950/50 border border-red-900/50 p-4 text-sm text-red-400 mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="flex-1 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center p-12 bg-slate-900/10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="text-lg font-bold text-slate-300">Catalog is empty</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-sm">No products found under this category filter. Register a new item to configure compliance details.</p>
            <Link to="/products/new" className="mt-6 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors">
              Add First Product
            </Link>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between">
            {/* Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {products.map((product) => (
                <Link
                  key={product.id}
                  to={`/products/${product.id}`}
                  className="group bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all flex flex-col"
                >
                  <div className="aspect-video bg-slate-950 flex items-center justify-center border-b border-slate-800 overflow-hidden relative">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=300&q=80';
                        }}
                      />
                    ) : (
                      <div className="text-slate-750 text-xs italic">No Thumbnail</div>
                    )}
                    <span className="absolute top-3 left-3 bg-slate-900/90 border border-slate-850 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-400">
                      {product.category}
                    </span>
                    {(() => {
                      const latest = product.classifications?.[0];
                      if (!latest) {
                        return (
                          <span className="absolute top-3 right-3 bg-slate-900/90 border border-slate-800/80 text-slate-500 px-2 py-0.5 rounded text-[10px] font-semibold">
                            Unclassified
                          </span>
                        );
                      }
                      switch (latest.status) {
                        case 'pending_review':
                          return (
                            <span className="absolute top-3 right-3 bg-yellow-950/90 border border-yellow-900/80 text-yellow-400 px-2 py-0.5 rounded text-[10px] font-semibold">
                              Pending Review
                            </span>
                          );
                        case 'confirmed':
                          return (
                            <span className="absolute top-3 right-3 bg-emerald-950/90 border border-emerald-900/80 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-semibold">
                              Confirmed
                            </span>
                          );
                        case 'overridden':
                          return (
                            <span className="absolute top-3 right-3 bg-blue-950/90 border border-blue-900/80 text-blue-400 px-2 py-0.5 rounded text-[10px] font-semibold">
                              Overridden
                            </span>
                          );
                        default:
                          return null;
                      }
                    })()}
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                        {product.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{product.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-850/50 text-[11px] text-slate-400">
                      <div>
                        <span className="block text-slate-500 font-semibold uppercase tracking-wider">Declared Value</span>
                        <span className="text-sm font-bold text-emerald-400 mt-0.5 block">${product.declared_value}</span>
                      </div>
                      <div>
                        <span className="block text-slate-500 font-semibold uppercase tracking-wider">Weight & Origin</span>
                        <span className="text-sm font-bold text-slate-200 mt-0.5 block">
                          {product.weight} kg ({product.origin_country})
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="border-t border-slate-900 pt-4 flex justify-between items-center">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  className="bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 font-semibold py-2 px-4 rounded-lg text-xs transition-colors border border-slate-800 disabled:pointer-events-none"
                >
                  &larr; Previous
                </button>
                <span className="text-xs text-slate-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  className="bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 font-semibold py-2 px-4 rounded-lg text-xs transition-colors border border-slate-800 disabled:pointer-events-none"
                >
                  Next &rarr;
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
