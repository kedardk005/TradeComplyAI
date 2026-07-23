import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { currentUser, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <nav className="border-b border-slate-900 bg-slate-900/50 backdrop-blur-md px-6 py-4 flex justify-between items-center">
        <Link to="/dashboard" className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          TradeComplyAI
        </Link>
        <div className="flex space-x-6 items-center">
          <Link to="/dashboard" className="text-sm font-semibold text-blue-400">Dashboard</Link>
          <Link to="/products" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">Products</Link>
          <button onClick={logout} className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">Logout</button>
        </div>
      </nav>

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <h1 className="text-3xl font-extrabold text-white mb-2">Compliance Dashboard</h1>
        <p className="text-slate-400 mb-8">Welcome, {currentUser?.name || currentUser?.email || 'exporter'}. Monitor and manage your India &rarr; US export compliance tasks.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-bold text-slate-200 mb-2">Classified Products</h3>
            <p className="text-4xl font-black text-blue-400">0</p>
            <p className="text-xs text-slate-500 mt-2">Ready to classify new inventory item</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-bold text-slate-200 mb-2">Documents Generated</h3>
            <p className="text-4xl font-black text-indigo-400">0</p>
            <p className="text-xs text-slate-500 mt-2">Commercial invoices & shipping bills</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-bold text-slate-200 mb-2">Platform Status</h3>
            <div className="flex items-center space-x-2 mt-3">
              <span className="h-3.5 w-3.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-sm text-emerald-400 font-semibold">Active & Online</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Ready for Sessions 2-13 builds</p>
          </div>
        </div>
      </main>
    </div>
  );
}
