import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FaTimes } from 'react-icons/fa';
import api from '../services/api';
import Product from '../components/Product';
import { CATEGORIES } from '../constants/categories';

/**
 * The real product-browsing page: category + price filters, sorting, and
 * pagination, all synced to the URL so a filtered view is a shareable link.
 * The homepage only links here — it doesn't do this itself anymore.
 */
const ProductsScreen = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const keyword = searchParams.get('keyword') || '';
  const category = searchParams.get('category') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const sort = searchParams.get('sort') || 'newest';
  const page = Number(searchParams.get('page')) || 1;

  const [priceInputs, setPriceInputs] = useState({ min: minPrice, max: maxPrice });
  const [data, setData] = useState({ products: [], page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/products', {
          params: { keyword, category, minPrice, maxPrice, sort, page },
        });
        setData(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [keyword, category, minPrice, maxPrice, sort, page]);

  // Keep the price inputs in sync if the URL changes from elsewhere
  // (Clear Filters, browser back/forward), not just from this form.
  useEffect(() => {
    setPriceInputs({ min: minPrice, max: maxPrice });
  }, [minPrice, maxPrice]);

  const updateParams = (updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    next.delete('page'); // any filter/sort change resets pagination
    setSearchParams(next);
  };

  const applyPriceFilter = (e) => {
    e.preventDefault();
    updateParams({ minPrice: priceInputs.min, maxPrice: priceInputs.max });
  };

  const goToPage = (p) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', p);
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => setSearchParams({});

  const hasActiveFilters = Boolean(keyword || category || minPrice || maxPrice);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">All Keyboards</h1>

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8">
        {/* Filters */}
        <aside className="bg-white rounded-lg shadow-md p-5 h-fit">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800">Filters</h2>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
              >
                <FaTimes /> Clear
              </button>
            )}
          </div>

          {keyword && (
            <p className="text-sm text-gray-500 mb-4">
              Searching for <strong>&ldquo;{keyword}&rdquo;</strong>
            </p>
          )}

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Category</h3>
            <div className="space-y-1">
              {CATEGORIES.map(({ label }) => (
                <button
                  key={label}
                  onClick={() => updateParams({ category: category === label ? '' : label })}
                  className={`block w-full text-left px-2 py-1.5 rounded text-sm transition ${
                    category === label ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Price Range</h3>
            <form onSubmit={applyPriceFilter}>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Min"
                  value={priceInputs.min}
                  onChange={(e) => setPriceInputs((p) => ({ ...p, min: e.target.value }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Max"
                  value={priceInputs.max}
                  onChange={(e) => setPriceInputs((p) => ({ ...p, max: e.target.value }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm py-1.5 rounded transition"
              >
                Apply
              </button>
            </form>
          </div>
        </aside>

        {/* Results */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <p className="text-sm text-gray-500">
              {loading ? 'Loading...' : `${data.total} result${data.total === 1 ? '' : 's'}`}
            </p>
            <select
              value={sort}
              onChange={(e) => updateParams({ sort: e.target.value })}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm"
            >
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>

          {loading ? (
            <h3 className="text-center text-xl mt-10">Loading...</h3>
          ) : error ? (
            <h3 className="text-center text-red-500 mt-10">{error}</h3>
          ) : data.products.length === 0 ? (
            <div className="bg-blue-100 text-blue-700 p-4 rounded text-center">
              No products match your filters.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {data.products.map((product) => (
                  <Product key={product._id} product={product} />
                ))}
              </div>

              {data.pages > 1 && (
                <div className="flex justify-center gap-2">
                  {[...Array(data.pages).keys()].map((x) => (
                    <button
                      key={x + 1}
                      onClick={() => goToPage(x + 1)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition ${
                        page === x + 1
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {x + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductsScreen;
