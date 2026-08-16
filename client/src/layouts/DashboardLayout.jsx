import { useState, useEffect, useContext } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  FaTachometerAlt,
  FaShoppingBag,
  FaBookmark,
  FaBoxOpen,
  FaClipboardList,
  FaBars,
  FaTimes,
  FaUser,
  FaArrowLeft,
} from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium transition ${
    isActive
      ? 'bg-violet-600 text-white shadow-[0_0_16px_rgba(139,92,246,0.35)]'
      : 'text-slate-400 hover:bg-card-2 hover:text-slate-200'
  }`;

/**
 * Shared shell for every /dashboard/* route: a role-aware sidebar (persistent
 * on desktop, a slide-in drawer on mobile) around an <Outlet /> for the
 * actual section content. Each section is its own page/route rather than one
 * long scrolling page.
 */
const DashboardLayout = () => {
  const { user, loading } = useContext(AuthContext);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isSeller = user && (user.role === 'seller' || user.role === 'admin');

  useEffect(() => {
    if (loading) return;
    if (!user) navigate('/login');
  }, [loading, user, navigate]);

  if (loading || !user) return <h2 className="text-center text-xl mt-10">Loading...</h2>;

  const navItems = isSeller
    ? [
        { to: '/dashboard', label: 'Overview', icon: FaTachometerAlt, end: true },
        { to: '/dashboard/products', label: 'My Products', icon: FaBoxOpen },
        { to: '/dashboard/orders-received', label: 'Orders Received', icon: FaClipboardList },
        { to: '/dashboard/bookmarks', label: 'Bookmarks', icon: FaBookmark },
      ]
    : [
        { to: '/dashboard', label: 'Overview', icon: FaTachometerAlt, end: true },
        { to: '/dashboard/orders', label: 'My Orders', icon: FaShoppingBag },
        { to: '/dashboard/bookmarks', label: 'Bookmarks', icon: FaBookmark },
      ];

  const SidebarContent = () => (
    <>
      <div className="px-4 mb-6">
        <p className="text-xs uppercase text-slate-500 font-semibold tracking-wide">
          {isSeller ? 'Seller' : 'Buyer'} Dashboard
        </p>
        <p className="font-semibold text-slate-100 truncate">{user.name}</p>
      </div>

      <nav className="space-y-1 px-2 flex-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={linkClass} onClick={() => setSidebarOpen(false)}>
            <Icon /> {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-2 pt-4 mt-4 border-t border-line space-y-1">
        <NavLink to="/profile" className={linkClass} onClick={() => setSidebarOpen(false)}>
          <FaUser /> Profile
        </NavLink>
        <Link
          to="/"
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium text-slate-400 hover:bg-card-2 transition"
          onClick={() => setSidebarOpen(false)}
        >
          <FaArrowLeft /> Back to Store
        </Link>
      </div>
    </>
  );

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between bg-card rounded-lg border border-line shadow-xl shadow-black/40 p-4">
        <span className="font-bold text-slate-100">{isSeller ? 'Seller' : 'Buyer'} Dashboard</span>
        <button onClick={() => setSidebarOpen(true)} aria-label="Open menu">
          <FaBars className="text-xl text-slate-400" />
        </button>
      </div>

      {/* Mobile drawer + backdrop */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative bg-card border-r border-line w-64 h-full flex flex-col py-6 z-50 overflow-y-auto">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-slate-400"
              aria-label="Close menu"
            >
              <FaTimes className="text-xl" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-64 shrink-0 bg-card rounded-lg border border-line shadow-xl shadow-black/40 py-6 self-start sticky top-24">
        <SidebarContent />
      </aside>

      {/* Section content */}
      <div className="flex-1 min-w-0">
        <Outlet />
      </div>
    </div>
  );
};

export default DashboardLayout;
