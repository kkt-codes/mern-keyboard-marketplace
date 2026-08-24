import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import Pagination from '../../components/Pagination';

const LOW_STOCK_THRESHOLD = 5;

const MyProductsPage = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/products/myproducts', {
        params: { page, keyword, lowStock: lowStockOnly || undefined },
      });
      setProducts(data.products);
      setPages(data.pages);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || (user.role !== 'seller' && user.role !== 'admin')) {
      navigate('/dashboard');
      return;
    }
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, navigate, page, keyword, lowStockOnly]);

  const keywordChangeHandler = (e) => {
    setKeyword(e.target.value);
    setPage(1);
  };
  const lowStockChangeHandler = (e) => {
    setLowStockOnly(e.target.checked);
    setPage(1);
  };

  const deleteHandler = async (productId) => {
    if (!window.confirm('Delete this product? This cannot be undone.')) return;

    try {
      await api.delete(`/products/${productId}`);
      toast.success('Product deleted');
      // Refetch instead of filtering locally so page counts stay accurate.
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
        <h1 className="text-2xl font-bold">My Products</h1>
        <Link
          to="/seller/product/new"
          className="btn-primary py-2 px-4"
        >
          + Add Product
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <input
          type="text"
          value={keyword}
          onChange={keywordChangeHandler}
          placeholder="Search by product name..."
          className="flex-1 px-3 py-2 border border-line rounded text-sm"
        />
        <label className="flex items-center gap-2 text-sm text-slate-300 whitespace-nowrap">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={lowStockChangeHandler}
            className="accent-violet-600"
          />
          Low stock only
        </label>
      </div>

      {products.length === 0 ? (
        <div className="border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 p-3 rounded">
          {keyword || lowStockOnly ? 'No products match your filters.' : "You haven't listed any products yet."}
        </div>
      ) : (
        <div className="overflow-x-auto bg-card rounded-lg border border-line shadow-xl shadow-black/40">
          <table className="min-w-full">
            <thead>
              <tr className="bg-card-2 text-slate-400 uppercase text-sm leading-normal">
                <th className="py-3 px-6 text-left">Image</th>
                <th className="py-3 px-6 text-left">Name</th>
                <th className="py-3 px-6 text-left">Price</th>
                <th className="py-3 px-6 text-left">Stock</th>
                <th className="py-3 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-slate-400 text-sm">
              {products.map((product) => (
                <tr key={product._id} className="border-b border-line hover:bg-card-2">
                  <td className="py-3 px-6">
                    <img src={product.image} alt={product.name} className="w-12 h-12 object-cover rounded" />
                  </td>
                  <td className="py-3 px-6 font-medium">{product.name}</td>
                  <td className="py-3 px-6">${product.price.toFixed(2)}</td>
                  <td className="py-3 px-6">
                    {product.countInStock < LOW_STOCK_THRESHOLD ? (
                      <span className="text-orange-600 font-semibold">{product.countInStock} left</span>
                    ) : (
                      product.countInStock
                    )}
                  </td>
                  <td className="py-3 px-6 text-center space-x-2">
                    <Link
                      to={`/seller/product/${product._id}/edit`}
                      className="bg-violet-600 text-white py-1 px-3 rounded text-xs hover:bg-violet-500 hover:shadow-[0_0_12px_rgba(139,92,246,0.4)] transition"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => deleteHandler(product._id)}
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

export default MyProductsPage;
