import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

/**
 * Lists the logged-in seller's own products with Edit/Delete actions.
 * Backend already rejects non-seller/admin roles on /products/myproducts,
 * but we also redirect here client-side so buyers never see a dead page.
 */
const SellerDashboardScreen = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMyProducts = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/products/myproducts');
      setProducts(data);
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
      navigate('/');
      return;
    }

    fetchMyProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, navigate]);

  const deleteHandler = async (productId) => {
    if (!window.confirm('Delete this product? This cannot be undone.')) return;

    try {
      await api.delete(`/products/${productId}`);
      toast.success('Product deleted');
      setProducts((prev) => prev.filter((p) => p._id !== productId));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete product');
    }
  };

  if (loading) return <h2 className="text-center text-xl mt-10">Loading...</h2>;
  if (error) return <h2 className="text-center text-red-500 mt-10">{error}</h2>;

  return (
    <div className="container mx-auto mt-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Products</h1>
        <Link
          to="/seller/product/new"
          className="bg-indigo-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-indigo-700 transition"
        >
          + Add Product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="bg-blue-100 text-blue-700 p-3 rounded">
          You haven't listed any products yet.
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow-md">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 text-left">Image</th>
                <th className="py-3 px-6 text-left">Name</th>
                <th className="py-3 px-6 text-left">Price</th>
                <th className="py-3 px-6 text-left">Stock</th>
                <th className="py-3 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm">
              {products.map((product) => (
                <tr key={product._id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-6">
                    <img src={product.image} alt={product.name} className="w-12 h-12 object-cover rounded" />
                  </td>
                  <td className="py-3 px-6 font-medium">{product.name}</td>
                  <td className="py-3 px-6">${product.price.toFixed(2)}</td>
                  <td className="py-3 px-6">{product.countInStock}</td>
                  <td className="py-3 px-6 text-center space-x-2">
                    <Link
                      to={`/seller/product/${product._id}/edit`}
                      className="bg-indigo-500 text-white py-1 px-3 rounded text-xs hover:bg-indigo-600 transition"
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
    </div>
  );
};

export default SellerDashboardScreen;
