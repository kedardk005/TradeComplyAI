import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api, type ApiError } from '../api/client';

interface ProductFormProps {
  mode: 'create' | 'edit';
}

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
}

export default function ProductForm({ mode }: ProductFormProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Form Fields State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [weight, setWeight] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [declaredValue, setDeclaredValue] = useState('');
  const [originCountry, setOriginCountry] = useState('IN'); // Default to India
  const [imagesText, setImagesText] = useState('');

  // Page Lifecycle State
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');

  // Fetch product on edit mount
  useEffect(() => {
    if (mode === 'edit' && id) {
      setLoadingProduct(true);
      api.get<Product>(`/products/${id}`)
        .then((product) => {
          setName(product.name);
          setDescription(product.description);
          setCategory(product.category);
          setWeight(product.weight.toString());
          setDimensions(product.dimensions);
          setDeclaredValue(product.declared_value.toString());
          setOriginCountry(product.origin_country);
          setImagesText(product.images.join(', '));
        })
        .catch((err: any) => {
          console.error(err);
          setGeneralError('Failed to load product details.');
        })
        .finally(() => {
          setLoadingProduct(false);
        });
    }
  }, [mode, id]);

  // Client Validation
  const validateForm = (): boolean => {
    const localErrors: Record<string, string> = {};

    if (!name.trim()) localErrors.name = 'Product name is required';
    if (!description.trim()) localErrors.description = 'Product description is required';
    if (!category) localErrors.category = 'Category is required';
    
    if (!weight) {
      localErrors.weight = 'Weight is required';
    } else {
      const wVal = parseFloat(weight);
      if (isNaN(wVal) || wVal <= 0) {
        localErrors.weight = 'Weight must be a positive number';
      }
    }

    if (!dimensions.trim()) localErrors.dimensions = 'Dimensions is required';

    if (!declaredValue) {
      localErrors.declared_value = 'Declared value is required';
    } else {
      const dvVal = parseFloat(declaredValue);
      if (isNaN(dvVal) || dvVal <= 0) {
        localErrors.declared_value = 'Declared value must be a positive number';
      }
    }

    if (!originCountry) localErrors.origin_country = 'Origin country is required';

    setErrors(localErrors);
    return Object.keys(localErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    setErrors({});

    if (!validateForm()) return;

    setSubmitting(true);

    const imagesArray = imagesText
      ? imagesText.split(',').map((u) => u.trim()).filter(Boolean)
      : [];

    const payload = {
      name,
      description,
      category,
      weight: parseFloat(weight),
      dimensions,
      declared_value: parseFloat(declaredValue),
      origin_country: originCountry,
      images: imagesArray
    };

    try {
      if (mode === 'create') {
        await api.post('/products', payload);
      } else {
        await api.put(`/products/${id}`, payload);
      }
      navigate('/products');
    } catch (err: any) {
      const apiErr = err as ApiError;
      if (apiErr.error?.code === 'VALIDATION_ERROR' && apiErr.error.fields) {
        setErrors(apiErr.error.fields);
      } else {
        setGeneralError(apiErr.error?.message || 'An error occurred during submission');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingProduct) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
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

      <main className="flex-1 p-6 md:p-8 max-w-3xl mx-auto w-full">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-white">
              {mode === 'create' ? 'Add New Product' : 'Edit Product'}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {mode === 'create' 
                ? 'Create a new inventory item and assign configuration parameters'
                : 'Modify existing parameters for compliance re-evaluation'}
            </p>
          </div>
          <Link to={mode === 'create' ? '/products' : `/products/${id}`} className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">
            Cancel
          </Link>
        </div>

        {generalError && (
          <div className="rounded-lg bg-red-950/50 border border-red-900/50 p-4 text-sm text-red-400 mb-6">
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-slate-900/50 border border-slate-800 p-6 md:p-8 rounded-2xl shadow-xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Product Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Varanasi Silk Shawl"
                className={`block w-full rounded-lg border bg-slate-950 px-4 py-3 text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all ${
                  errors.name ? 'border-red-500/50' : 'border-slate-800'
                }`}
              />
              {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Handcrafted silk shawl made by traditional MSME weavers..."
                className={`block w-full rounded-lg border bg-slate-950 px-4 py-3 text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all ${
                  errors.description ? 'border-red-500/50' : 'border-slate-800'
                }`}
              />
              {errors.description && <p className="mt-1 text-xs text-red-400">{errors.description}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`block w-full rounded-lg border bg-slate-950 px-4 py-3 text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all ${
                  errors.category ? 'border-red-500/50' : 'border-slate-800'
                }`}
              >
                <option value="">Select Category</option>
                <option value="Textiles">Textiles</option>
                <option value="Electronics">Electronics</option>
                <option value="Machinery">Machinery</option>
                <option value="Chemicals">Chemicals</option>
                <option value="Agri-products">Agri-products</option>
                <option value="Handicrafts">Handicrafts</option>
                <option value="Others">Others</option>
              </select>
              {errors.category && <p className="mt-1 text-xs text-red-400">{errors.category}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Origin Country</label>
              <select
                value={originCountry}
                onChange={(e) => setOriginCountry(e.target.value)}
                className={`block w-full rounded-lg border bg-slate-950 px-4 py-3 text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all ${
                  errors.origin_country ? 'border-red-500/50' : 'border-slate-800'
                }`}
              >
                <option value="IN">India (IN)</option>
                <option value="US">United States (US)</option>
                <option value="Other">Other</option>
              </select>
              {errors.origin_country && <p className="mt-1 text-xs text-red-400">{errors.origin_country}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Declared Value (USD)</label>
              <input
                type="number"
                step="0.01"
                value={declaredValue}
                onChange={(e) => setDeclaredValue(e.target.value)}
                placeholder="150.00"
                className={`block w-full rounded-lg border bg-slate-955 px-4 py-3 text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all ${
                  errors.declared_value ? 'border-red-500/50' : 'border-slate-800'
                }`}
              />
              {errors.declared_value && <p className="mt-1 text-xs text-red-400">{errors.declared_value}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Weight (kg)</label>
              <input
                type="number"
                step="0.001"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0.350"
                className={`block w-full rounded-lg border bg-slate-955 px-4 py-3 text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all ${
                  errors.weight ? 'border-red-500/50' : 'border-slate-800'
                }`}
              />
              {errors.weight && <p className="mt-1 text-xs text-red-400">{errors.weight}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Dimensions (e.g. L x W x H cm)</label>
              <input
                type="text"
                value={dimensions}
                onChange={(e) => setDimensions(e.target.value)}
                placeholder="30 x 20 x 5 cm"
                className={`block w-full rounded-lg border bg-slate-950 px-4 py-3 text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all ${
                  errors.dimensions ? 'border-red-500/50' : 'border-slate-800'
                }`}
              />
              {errors.dimensions && <p className="mt-1 text-xs text-red-400">{errors.dimensions}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Image URLs (comma-separated)</label>
              <input
                type="text"
                value={imagesText}
                onChange={(e) => setImagesText(e.target.value)}
                placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                className={`block w-full rounded-lg border bg-slate-950 px-4 py-3 text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all border-slate-800`}
              />
            </div>
          </div>

          <div className="pt-4 flex space-x-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3.5 px-4 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : mode === 'create' ? 'Create Product' : 'Save Changes'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
