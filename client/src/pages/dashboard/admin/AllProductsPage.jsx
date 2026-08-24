import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { AuthContext } from '../../../context/AuthContext';
import Pagination from '../../../components/Pagination';
import { CATEGORIES } from '../../../constants/categories';

/**
 * Catalog moderation: every product on the marketplace regardless of
 * seller. Uses the public paginated /products endpoint for listing; the
 * edit/delete actions rely on the server's admin override.
 */
const AllProductsPage = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');

  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/products', { params: { page, limit: 10, keyword, category } });
      setProducts(data.products);
      setPages(data.pages);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, navigate, page, keyword, category]);

  const keywordChangeHandler = (e) => {
    setKeyword(e.target.value);
    setPage(1);
  };
  const categoryChangeHandler = (e) => {
    setCategory(e.target.value);
    setPage(1);
  };

  const deleteHandler = async (productId, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;

    try {
      await api.delete(`/products/${productId}`);
      toast.success('Product deleted');
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete product');
    }
  };

  if (loading) return <h2 className="text-center text-xl mt-10">Loading...</h2>;
  if (error) return <h2 className="text-center text-red-400 mt-10">{error}</h2>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">All Products</h1>
        <span className="font-mono text-sm text-slate-400">{total} total</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          value={keyword}
          onChange={keywordChangeHandler}
          placeholder="Search by product name..."
          className="flex-1 px-3 py-2 border border-line rounded text-sm"
        />
        <select
          value={category}
          onChange={categoryChangeHandler}
          className="border border-line rounded px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {CATEGORIES.map(({ label }) => (
            <option key={label} value={label}>{label}</option>
          ))}
        </select>
      </div>

      {products.length === 0 ? (
        <div className="border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 p-3 rounded">No products match your filters.</div>
      ) : (
        <div className="overflow-x-auto bg-card rounded-lg border border-line shadow-xl shadow-black/40">
          <table className="min-w-full">
            <thead>
              <tr className="bg-card-2 text-slate-400 uppercase text-sm leading-normal">
                <th className="py-3 px-6 text-left">Image</th>
                <th className="py-3 px-6 text-left">Name</th>
                <th className="py-3 px-6 text-left">Seller</th>
                <th className="py-3 px-6 text-left">Price</th>
                <th className="py-3 px-6 text-left">Stock</th>
                <th className="py-3 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-slate-400 text-sm">
              {products.map((product) => (
                <tr key={product._id} className="border-b border-line hover:bg-card-2">
                  <td className="py-3 px-6">
                    <Link to={`/product/${product._id}`}>
                      <img src={product.image} alt={product.name} className="w-12 h-12 object-cover rounded" />
                    </Link>
                  </td>
                  <td className="py-3 px-6 font-medium text-slate-200">{product.name}</td>
                  <td className="py-3 px-6">{product.user?.name || 'Deleted user'}</td>
                  <td className="py-3 px-6 font-mono">${product.price.toFixed(2)}</td>
                  <td className="py-3 px-6">{product.countInStock}</td>
                  <td className="py-3 px-6 text-center space-x-2 whitespace-nowrap">
                    <Link
                      to={`/seller/product/${product._id}/edit`}
                      className="bg-violet-600 text-white py-1 px-3 rounded text-xs hover:bg-violet-500 transition"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => deleteHandler(product._id, product.name)}
                      className="bg-red-500 text-white py-1 px-3 rounded text-xs hover:bg-red-600 transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pages={pages} onPageChange={setPage} />
    </div>
  );
};

export default AllProductsPage;
