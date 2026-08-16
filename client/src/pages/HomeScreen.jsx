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
      <section className="mb-12 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-lg">
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Built for typists who care.</h1>
          <p className="text-lg text-gray-300 mb-8 max-w-xl mx-auto">
            Mechanical keyboards from independent sellers - browse builds, compare specs, and order
            straight from the people who make them.
          </p>
          <Link
            to="/products"
            className="inline-block bg-indigo-600 hover:bg-indigo-700 transition text-white font-semibold px-8 py-3 rounded-lg"
          >
            Shop Now
          </Link>
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
              className="flex flex-col items-center justify-center gap-2 bg-white border border-gray-200 rounded-lg py-6 hover:shadow-md hover:border-indigo-300 transition"
            >
              <Icon className="text-2xl text-indigo-600" />
              <span className="font-medium text-gray-800">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured products preview */}
      <section className="mb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Latest Keyboards</h2>
          <Link to="/products" className="text-sm text-indigo-600 hover:underline">
            View All Products &rarr;
          </Link>
        </div>

        {loading ? (
          <h3 className="text-center text-xl mt-10">Loading...</h3>
        ) : products.length === 0 ? (
          <div className="bg-blue-100 text-blue-700 p-4 rounded text-center">
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
              className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition"
            >
              <Icon className="text-3xl text-indigo-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-800 mb-1">{title}</h3>
              <p className="text-sm text-gray-600">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
};

export default HomeScreen;
