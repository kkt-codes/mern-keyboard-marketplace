import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FaBoxOpen, FaDollarSign, FaShoppingBag, FaExclamationTriangle, FaHeart, FaTimes } from 'react-icons/fa';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { BookmarkContext } from '../context/BookmarkContext';
import Product from '../components/Product';

const LOW_STOCK_THRESHOLD = 5;

const StatCard = ({ icon: Icon, label, value }) => (
  <div className="bg-white rounded-lg shadow-md p-5 flex items-center gap-4">
    <div className="bg-indigo-100 text-indigo-600 rounded-full p-3">
      <Icon className="text-xl" />
    </div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-800">{value}</p>
    </div>
  </div>
);

/**
 * Role-aware account dashboard. Buyers see order history + stats; sellers/
 * admins see product management + orders received + stats. Bookmarks show
 * for everyone, since saving a product isn't tied to a specific role.
 */
const DashboardScreen = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const { bookmarkedProducts } = useContext(BookmarkContext);
  const navigate = useNavigate();
  const isSeller = user && (user.role === 'seller' || user.role === 'admin');

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [sellerOrders, setSellerOrders] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        setLoadingData(true);
        if (isSeller) {
          const [productsRes, sellerOrdersRes] = await Promise.all([
            api.get('/products/myproducts'),
            api.get('/orders/sellerorders'),
          ]);
          setProducts(productsRes.data);
          setSellerOrders(sellerOrdersRes.data);
        } else {
          const { data } = await api.get('/orders/myorders');
          setOrders(data);
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load dashboard');
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, isSeller, navigate]);

  const deleteProductHandler = async (productId) => {
    if (!window.confirm('Delete this product? This cannot be undone.')) return;

    try {
      await api.delete(`/products/${productId}`);
      toast.success('Product deleted');
      setProducts((prev) => prev.filter((p) => p._id !== productId));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete product');
    }
  };

  if (authLoading || loadingData) return <h2 className="text-center text-xl mt-10">Loading...</h2>;

  const totalOrders = orders.length;
  const totalSpent = orders.filter((o) => o.isPaid).reduce((sum, o) => sum + o.totalPrice, 0);

  const totalRevenue = sellerOrders.filter((o) => o.isPaid).reduce((sum, o) => sum + o.sellerTotal, 0);
  const lowStockCount = products.filter((p) => p.countInStock < LOW_STOCK_THRESHOLD).length;

  return (
    <div className="container mx-auto mt-10">
      <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
      <p className="text-gray-500 mb-8">Welcome back, {user.name}.</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {isSeller ? (
          <>
            <StatCard icon={FaBoxOpen} label="Products" value={products.length} />
            <StatCard icon={FaShoppingBag} label="Orders Received" value={sellerOrders.length} />
            <StatCard icon={FaDollarSign} label="Revenue" value={`$${totalRevenue.toFixed(2)}`} />
            <StatCard icon={FaExclamationTriangle} label="Low Stock" value={lowStockCount} />
          </>
        ) : (
          <>
            <StatCard icon={FaShoppingBag} label="Orders" value={totalOrders} />
            <StatCard icon={FaDollarSign} label="Total Spent" value={`$${totalSpent.toFixed(2)}`} />
            <StatCard icon={FaHeart} label="Bookmarks" value={bookmarkedProducts.length} />
          </>
        )}
      </div>

      {isSeller ? (
        <>
          {/* My Products */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">My Products</h2>
              <Link
                to="/seller/product/new"
                className="bg-indigo-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-indigo-700 transition"
              >
                + Add Product
              </Link>
            </div>

            {products.length === 0 ? (
              <div className="bg-blue-100 text-blue-700 p-3 rounded">You haven't listed any products yet.</div>
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
                            className="bg-indigo-500 text-white py-1 px-3 rounded text-xs hover:bg-indigo-600 transition"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => deleteProductHandler(product._id)}
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
          </section>

          {/* Orders Received */}
          <section className="mb-10">
            <h2 className="text-xl font-bold mb-4">Orders Received</h2>
            {sellerOrders.length === 0 ? (
              <div className="bg-blue-100 text-blue-700 p-3 rounded">No orders yet.</div>
            ) : (
              <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                      <th className="py-3 px-6 text-left">Order ID</th>
                      <th className="py-3 px-6 text-left">Buyer</th>
                      <th className="py-3 px-6 text-left">Date</th>
                      <th className="py-3 px-6 text-left">Items</th>
                      <th className="py-3 px-6 text-left">Total</th>
                      <th className="py-3 px-6 text-center">Paid</th>
                      <th className="py-3 px-6 text-center">Delivered</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-600 text-sm">
                    {sellerOrders.map((order) => (
                      <tr key={order._id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-6 font-mono text-xs">{order._id}</td>
                        <td className="py-3 px-6">{order.user?.name || 'Unknown'}</td>
                        <td className="py-3 px-6">{order.createdAt.substring(0, 10)}</td>
                        <td className="py-3 px-6">{order.orderItems.reduce((sum, i) => sum + i.qty, 0)}</td>
                        <td className="py-3 px-6">${order.sellerTotal.toFixed(2)}</td>
                        <td className="py-3 px-6 text-center">
                          {order.isPaid ? (
                            <span className="bg-green-200 text-green-600 py-1 px-3 rounded-full text-xs">Paid</span>
                          ) : (
                            <span className="bg-red-200 text-red-600 py-1 px-3 rounded-full text-xs">Unpaid</span>
                          )}
                        </td>
                        <td className="py-3 px-6 text-center">
                          {order.isDelivered ? (
                            <span className="bg-green-200 text-green-600 py-1 px-3 rounded-full text-xs">
                              Delivered
                            </span>
                          ) : (
                            <span className="bg-yellow-200 text-yellow-700 py-1 px-3 rounded-full text-xs">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : (
        /* Buyer: My Orders */
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">My Orders</h2>
          {orders.length === 0 ? (
            <div className="bg-blue-100 text-blue-700 p-3 rounded">
              You have no orders.{' '}
              <Link to="/" className="underline font-bold">
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto bg-white rounded-lg shadow-md">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                    <th className="py-3 px-6 text-left">ID</th>
                    <th className="py-3 px-6 text-left">Date</th>
                    <th className="py-3 px-6 text-left">Total</th>
                    <th className="py-3 px-6 text-center">Paid</th>
                    <th className="py-3 px-6 text-center">Delivered</th>
                    <th className="py-3 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600 text-sm">
                  {orders.map((order) => (
                    <tr key={order._id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-6 font-mono text-xs">{order._id}</td>
                      <td className="py-3 px-6">{order.createdAt.substring(0, 10)}</td>
                      <td className="py-3 px-6">${order.totalPrice.toFixed(2)}</td>
                      <td className="py-3 px-6 text-center">
                        {order.isPaid ? (
                          <span className="bg-green-200 text-green-600 py-1 px-3 rounded-full text-xs">
                            {order.paidAt.substring(0, 10)}
                          </span>
                        ) : (
                          <span className="bg-red-200 text-red-600 py-1 px-3 rounded-full text-xs">
                            <FaTimes />
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-6 text-center">
                        {order.isDelivered ? (
                          <span className="bg-green-200 text-green-600 py-1 px-3 rounded-full text-xs">
                            {order.deliveredAt.substring(0, 10)}
                          </span>
                        ) : (
                          <span className="bg-red-200 text-red-600 py-1 px-3 rounded-full text-xs">
                            <FaTimes />
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-6 text-center">
                        <Link
                          to={`/order/${order._id}`}
                          className="bg-indigo-500 text-white py-1 px-3 rounded text-xs hover:bg-indigo-600 transition"
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Bookmarks - shown for everyone */}
      <section>
        <h2 className="text-xl font-bold mb-4">Bookmarked Products</h2>
        {bookmarkedProducts.length === 0 ? (
          <div className="bg-blue-100 text-blue-700 p-3 rounded">
            No bookmarks yet. Tap the heart icon on any product to save it here.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {bookmarkedProducts.map((product) => (
              <Product key={product._id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default DashboardScreen;
