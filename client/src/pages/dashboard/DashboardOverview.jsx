import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FaBoxOpen,
  FaDollarSign,
  FaShoppingBag,
  FaExclamationTriangle,
  FaBookmark,
  FaTruck,
} from 'react-icons/fa';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { BookmarkContext } from '../../context/BookmarkContext';

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

const StatusBadge = ({ ok, okText, pendingText }) => (
  <span
    className={`py-1 px-3 rounded-full text-xs ${
      ok ? 'bg-green-200 text-green-600' : 'bg-yellow-200 text-yellow-700'
    }`}
  >
    {ok ? okText : pendingText}
  </span>
);

/**
 * Landing section of the dashboard: at-a-glance stats plus a short preview
 * of recent activity, with links out to the full section for more detail.
 */
const DashboardOverview = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const { bookmarkedProducts } = useContext(BookmarkContext);
  const isSeller = user && (user.role === 'seller' || user.role === 'admin');

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [sellerOrders, setSellerOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchData = async () => {
      try {
        setLoading(true);
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
        setLoading(false);
      }
    };

    fetchData();
  }, [authLoading, user, isSeller]);

  if (authLoading || loading) return <h2 className="text-center text-xl mt-10">Loading...</h2>;

  const totalSpent = orders.filter((o) => o.isPaid).reduce((sum, o) => sum + o.totalPrice, 0);
  const pendingDeliveries = orders.filter((o) => o.isPaid && !o.isDelivered).length;

  const totalRevenue = sellerOrders.filter((o) => o.isPaid).reduce((sum, o) => sum + o.sellerTotal, 0);
  const lowStockCount = products.filter((p) => p.countInStock < LOW_STOCK_THRESHOLD).length;

  // Top 5 products by revenue, computed client-side from paid orders' line
  // items — a lightweight bar breakdown without pulling in a chart library.
  const revenueByProduct = {};
  sellerOrders
    .filter((o) => o.isPaid)
    .forEach((order) => {
      order.orderItems.forEach((item) => {
        revenueByProduct[item.name] = (revenueByProduct[item.name] || 0) + item.price * item.qty;
      });
    });
  const topProducts = Object.entries(revenueByProduct)
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  const maxRevenue = topProducts[0]?.revenue || 1;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Overview</h1>
      <p className="text-gray-500 mb-6">Welcome back, {user.name}.</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {isSeller ? (
          <>
            <StatCard icon={FaBoxOpen} label="Products" value={products.length} />
            <StatCard icon={FaShoppingBag} label="Orders Received" value={sellerOrders.length} />
            <StatCard icon={FaDollarSign} label="Revenue" value={`$${totalRevenue.toFixed(2)}`} />
            <StatCard icon={FaExclamationTriangle} label="Low Stock" value={lowStockCount} />
          </>
        ) : (
          <>
            <StatCard icon={FaShoppingBag} label="Orders" value={orders.length} />
            <StatCard icon={FaDollarSign} label="Total Spent" value={`$${totalSpent.toFixed(2)}`} />
            <StatCard icon={FaTruck} label="Pending Deliveries" value={pendingDeliveries} />
            <StatCard icon={FaBookmark} label="Bookmarks" value={bookmarkedProducts.length} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isSeller ? (
          <>
            {/* Top products by revenue */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-bold mb-4">Top Products by Revenue</h2>
              {topProducts.length === 0 ? (
                <p className="text-gray-500 text-sm">No paid orders yet.</p>
              ) : (
                topProducts.map((p) => (
                  <div key={p.name} className="mb-3 last:mb-0">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 truncate mr-2">{p.name}</span>
                      <span className="text-gray-500 font-medium shrink-0">${p.revenue.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{ width: `${(p.revenue / maxRevenue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Recent orders received */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Recent Orders</h2>
                <Link to="/dashboard/orders-received" className="text-sm text-indigo-600 hover:underline">
                  View all
                </Link>
              </div>
              {sellerOrders.length === 0 ? (
                <p className="text-gray-500 text-sm">No orders yet.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {sellerOrders.slice(0, 5).map((order) => (
                    <li key={order._id} className="py-2 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-gray-800">{order.user?.name || 'Unknown'}</p>
                        <p className="text-gray-400 text-xs">{order.createdAt.substring(0, 10)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-700">${order.sellerTotal.toFixed(2)}</span>
                        <StatusBadge ok={order.isPaid} okText="Paid" pendingText="Unpaid" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Recent orders */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Recent Orders</h2>
                <Link to="/dashboard/orders" className="text-sm text-indigo-600 hover:underline">
                  View all
                </Link>
              </div>
              {orders.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  No orders yet. <Link to="/" className="text-indigo-600 hover:underline">Start shopping</Link>.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {orders.slice(0, 5).map((order) => (
                    <li key={order._id} className="py-2 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-mono text-xs text-gray-500">{order._id}</p>
                        <p className="text-gray-400 text-xs">{order.createdAt.substring(0, 10)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-700">${order.totalPrice.toFixed(2)}</span>
                        <StatusBadge ok={order.isDelivered} okText="Delivered" pendingText="In Transit" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Recently bookmarked */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Recently Bookmarked</h2>
                <Link to="/dashboard/bookmarks" className="text-sm text-indigo-600 hover:underline">
                  View all
                </Link>
              </div>
              {bookmarkedProducts.length === 0 ? (
                <p className="text-gray-500 text-sm">No bookmarks yet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {bookmarkedProducts.slice(0, 4).map((product) => (
                    <Link
                      key={product._id}
                      to={`/product/${product._id}`}
                      className="flex items-center gap-2 border border-gray-100 rounded-lg p-2 hover:border-indigo-300 transition"
                    >
                      <img src={product.image} alt={product.name} className="w-10 h-10 object-cover rounded" />
                      <span className="text-sm text-gray-700 truncate">{product.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardOverview;
