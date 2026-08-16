import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaTruck, FaShieldAlt, FaUserCheck, FaUndo } from 'react-icons/fa';
import api from '../services/api';
import Product from '../components/Product';
import { CATEGORIES } from '../constants/categories';

const TRUST_BADGES = [
  { icon: FaTruck, title: 'Fast Shipping', text: 'Orders go out quickly, straight from the seller.' },
  { icon: FaShieldAlt, title: 'Secure Checkout', text: 'Your payment details stay protected end to end.' },
  { icon: FaUserCheck, title: 'Verified Sellers', text: 'Every listing is tied to a real, accountable seller.' },
  { icon: FaUndo, title: 'Easy Returns', text: "Something wrong with an order? We'll help sort it out." },
];

/**
 * Pure landing page — actual browsing (search, filters, pagination) lives
 * on /products. This just teases the catalog with a small "latest" preview.
 */
const HomeScreen = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const { data } = await api.get('/products', { params: { limit: 8, sort: 'newest' } });
        setProducts(data.products);
      } catch {
        // Non-critical — the hero/category sections still work without this.
      } finally {
        setLoading(false);
      }
    };

    fetchFeatured();
  }, []);

  return (
    <>
      {/* Hero */}
      <section className="relative mb-12 overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-slate-950 via-indigo-950/60 to-slate-950">
        {/* Neon glow orbs — decorative only */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-violet-600/25 blur-3xl [animation:pulse-glow_6s_ease-in-out_infinite]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl [animation:pulse-glow_7s_ease-in-out_1s_infinite]"
        />

        <div className="relative container mx-auto px-4 py-20 text-center">
          <p className="mb-4 font-mono text-xs sm:text-sm uppercase tracking-[0.3em] text-cyan-300">
            // Mechanical keyboard marketplace
          </p>
          <h1 className="text-4xl md:text-6xl font-bold mb-5">
            Built for typists <span className="text-gradient">who care.</span>
          </h1>
          <p className="text-lg text-slate-300 mb-8 max-w-xl mx-auto">
            Mechanical keyboards from independent sellers — browse builds, compare specs, and order
            straight from the people who make them.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/products" className="btn-primary px-8 py-3">
              Shop Now
            </Link>
            <Link to="/products?category=Custom" className="btn-ghost px-8 py-3">
              Explore Custom Builds
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {['RGB', 'Hot-swap', 'QMK / VIA', 'Gasket mount', 'Wireless'].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-line bg-card/60 px-3 py-1 font-mono text-xs text-slate-400"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Shop by Category */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 text-center">Shop by Category</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {CATEGORIES.map(({ label, icon: Icon }) => (
            <Link
              key={label}
              to={`/products?category=${encodeURIComponent(label)}`}
              className="group flex flex-col items-center justify-center gap-2 bg-card border border-line rounded-lg py-6 hover:border-violet-500/60 hover:-translate-y-1 hover:shadow-[0_0_24px_rgba(139,92,246,0.15)] transition-all duration-300"
            >
              <Icon className="text-2xl text-violet-400 group-hover:text-cyan-300 transition" />
              <span className="font-medium text-slate-100">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured products preview */}
      <section className="mb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Latest Keyboards</h2>
          <Link to="/products" className="text-sm text-violet-400 hover:underline">
            View All Products &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-lg border border-line bg-card overflow-hidden">
                <div className="h-48 bg-card-2" />
                <div className="p-4 space-y-3">
                  <div className="h-4 w-3/4 rounded bg-card-2" />
                  <div className="h-3 w-1/2 rounded bg-card-2" />
                  <div className="h-6 w-1/3 rounded bg-card-2" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 p-4 rounded text-center">
            No products listed yet — check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <Product key={product._id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Why Shop With Us */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-6 text-center">Why Shop With Us</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {TRUST_BADGES.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="bg-card rounded-lg border border-line shadow-xl shadow-black/40 p-6 text-center hover:border-violet-500/50 hover:shadow-[0_0_24px_rgba(139,92,246,0.15)] transition"
            >
              <Icon className="text-3xl text-violet-400 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-100 mb-1">{title}</h3>
              <p className="text-sm text-slate-400">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
};

export default HomeScreen;
