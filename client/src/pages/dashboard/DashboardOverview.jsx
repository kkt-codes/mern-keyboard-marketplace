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
import { AuthContext } from '../../context/contexts';
import { BookmarkContext } from '../../context/contexts';

const LOW_STOCK_THRESHOLD = 5;

const StatCard = ({ icon: Icon, label, value }) => (
  <div className="bg-card rounded-lg border border-line shadow-xl shadow-black/40 p-5 flex items-center gap-4">
    <div className="bg-violet-500/15 text-violet-400 rounded-full p-3">
      <Icon className="text-xl" />
    </div>
    <div>
      <p className="text-sm text-slate-400">{label}</p>
      <p className="text-xl font-bold text-slate-100">{value}</p>
    </div>
  </div>
);

const StatusBadge = ({ ok, okText, pendingText }) => (
  <span
    className={`py-1 px-3 rounded-full text-xs ${
      ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
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
  const [totals, setTotals] = useState({ orders: 0, products: 0, sellerOrders: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;

    // These endpoints are paginated now — one big page covers the stats and
    // previews here; headline counts come from the response `total` fields
    // so they stay right even past the page size.
    const fetchData = async () => {
      try {
        setLoading(true);
        if (isSeller) {
          const [productsRes, sellerOrdersRes] = await Promise.all([
            api.get('/products/myproducts', { params: { limit: 100 } }),
            api.get('/orders/sellerorders', { params: { limit: 100 } }),
          ]);
          setProducts(productsRes.data.products);
          setSellerOrders(sellerOrdersRes.data.orders);
          setTotals((t) => ({
            ...t,
            products: productsRes.data.total,
            sellerOrders: sellerOrdersRes.data.total,
          }));
        } else {
          const { data } = await api.get('/orders/myorders', { params: { limit: 100 } });
          setOrders(data.orders);
          setTotals((t) => ({ ...t, orders: data.total }));
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
      <p className="text-slate-400 mb-6">Welcome back, {user.name}.</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {isSeller ? (
          <>
            <StatCard icon={FaBoxOpen} label="Products" value={totals.products} />
            <StatCard icon={FaShoppingBag} label="Orders Received" value={totals.sellerOrders} />
            <StatCard icon={FaDollarSign} label="Revenue" value={`$${totalRevenue.toFixed(2)}`} />
            <StatCard icon={FaExclamationTriangle} label="Low Stock" value={lowStockCount} />
          </>
        ) : (
          <>
            <StatCard icon={FaShoppingBag} label="Orders" value={totals.orders} />
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
            <div className="bg-card rounded-lg border border-line shadow-xl shadow-black/40 p-6">
              <h2 className="text-lg font-bold mb-4">Top Products by Revenue</h2>
              {topProducts.length === 0 ? (
                <p className="text-slate-400 text-sm">No paid orders yet.</p>
              ) : (
                topProducts.map((p) => (
                  <div key={p.name} className="mb-3 last:mb-0">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300 truncate mr-2">{p.name}</span>
                      <span className="text-slate-400 font-medium shrink-0">${p.revenue.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-card-2 rounded-full h-2">
                      <div
                        className="bg-violet-600 h-2 rounded-full"
                        style={{ width: `${(p.revenue / maxRevenue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Recent orders received */}
            <div className="bg-card rounded-lg border border-line shadow-xl shadow-black/40 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Recent Orders</h2>
                <Link to="/dashboard/orders-received" className="text-sm text-violet-400 hover:underline">
                  View all
                </Link>
              </div>
              {sellerOrders.length === 0 ? (
                <p className="text-slate-400 text-sm">No orders yet.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {sellerOrders.slice(0, 5).map((order) => (
                    <li key={order._id} className="py-2 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-slate-100">{order.user?.name || 'Unknown'}</p>
                        <p className="text-slate-500 text-xs">{order.createdAt.substring(0, 10)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-300">${order.sellerTotal.toFixed(2)}</span>
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
            <div className="bg-card rounded-lg border border-line shadow-xl shadow-black/40 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Recent Orders</h2>
                <Link to="/dashboard/orders" className="text-sm text-violet-400 hover:underline">
                  View all
                </Link>
              </div>
              {orders.length === 0 ? (
                <p className="text-slate-400 text-sm">
                  No orders yet. <Link to="/" className="text-violet-400 hover:underline">Start shopping</Link>.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {orders.slice(0, 5).map((order) => (
                    <li key={order._id} className="py-2 flex items-center justify-between text-sm">
                      <div>
                        <p className="font-mono text-xs text-slate-400">{order._id}</p>
                        <p className="text-slate-500 text-xs">{order.createdAt.substring(0, 10)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-300">${order.totalPrice.toFixed(2)}</span>
                        <StatusBadge ok={order.isDelivered} okText="Delivered" pendingText="In Transit" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Recently bookmarked */}
            <div className="bg-card rounded-lg border border-line shadow-xl shadow-black/40 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Recently Bookmarked</h2>
                <Link to="/dashboard/bookmarks" className="text-sm text-violet-400 hover:underline">
                  View all
                </Link>
              </div>
              {bookmarkedProducts.length === 0 ? (
                <p className="text-slate-400 text-sm">No bookmarks yet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {bookmarkedProducts.slice(0, 4).map((product) => (
                    <Link
                      key={product._id}
                      to={`/product/${product._id}`}
                      className="flex items-center gap-2 border border-line rounded-lg p-2 hover:border-violet-500/60 transition"
                    >
                      <img src={product.image} alt={product.name} className="w-10 h-10 object-cover rounded" />
                      <span className="text-sm text-slate-300 truncate">{product.name}</span>
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
