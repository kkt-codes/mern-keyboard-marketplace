import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import Pagination from '../../components/Pagination';

/**
 * Status pill for the Paid/Delivered columns.
 *
 * `inline-flex` rather than a bare `span`: an inline element takes its height
 * from the line box, so `rounded-full` on one wrapping a short label (or worse,
 * an icon) resolves to a radius larger than the box and renders as detached
 * curved slivers instead of a pill.
 */
const StatusPill = ({ tone, children }) => {
  const tones = {
    good: 'bg-emerald-500/15 text-emerald-300',
    bad: 'bg-red-500/15 text-red-300',
    warn: 'bg-amber-500/15 text-amber-300'
  };

  return (
    <span
      className={`${tones[tone]} inline-flex items-center justify-center py-1 px-3 rounded-full text-xs leading-none whitespace-nowrap`}
    >
      {children}
    </span>
  );
};

const MyOrdersPage = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchOrders = async () => {
      try {
        const { data } = await api.get('/orders/myorders', { params: { page, keyword, status } });
        setOrders(data.orders);
        setPages(data.pages);
      } catch (err) {
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [authLoading, user, navigate, page, keyword, status]);

  const keywordChangeHandler = (e) => {
    setKeyword(e.target.value);
    setPage(1);
  };
  const statusChangeHandler = (e) => {
    setStatus(e.target.value);
    setPage(1);
  };

  const cancelHandler = async (order) => {
    const reason = window.prompt(
      order.isPaid
        ? 'Cancel this order and refund the payment? Optionally tell us why:'
        : 'Cancel this order? Optionally tell us why:'
    );
    if (reason === null) return;

    setCancellingId(order._id);
    try {
      const { data } = await api.put(`/orders/${order._id}/cancel`, { reason });
      toast.success(data.refundResult ? 'Order cancelled and refunded' : 'Order cancelled');
      setOrders((prev) => prev.map((o) => (o._id === order._id ? { ...o, ...data } : o)));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel order');
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) return <h2 className="text-center text-xl mt-10">Loading...</h2>;
  if (error) return <h2 className="text-center text-red-400 mt-10">{error}</h2>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">My Orders</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          value={keyword}
          onChange={keywordChangeHandler}
          placeholder="Search by product name..."
          className="flex-1 px-3 py-2 border border-line rounded text-sm"
        />
        <select
          value={status}
          onChange={statusChangeHandler}
          className="border border-line rounded px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
          <option value="pending">Pending delivery</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {orders.length === 0 ? (
        <div className="border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 p-3 rounded">
          {keyword || status ? (
            'No orders match your filters.'
          ) : (
            <>
              You have no orders.{' '}
              <Link to="/" className="underline font-bold">
                Start Shopping
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto bg-card rounded-lg border border-line shadow-xl shadow-black/40">
          <table className="min-w-full">
            <thead>
              <tr className="bg-card-2 text-slate-400 uppercase text-sm leading-normal">
                <th className="py-3 px-6 text-left">ID</th>
                <th className="py-3 px-6 text-left">Date</th>
                <th className="py-3 px-6 text-left">Total</th>
                <th className="py-3 px-6 text-center">Paid</th>
                <th className="py-3 px-6 text-center">Delivered</th>
                <th className="py-3 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-slate-400 text-sm">
              {orders.map((order) => (
                <tr key={order._id} className="border-b border-line hover:bg-card-2">
                  <td className="py-3 px-6 font-mono text-xs">{order._id}</td>
                  <td className="py-3 px-6">{order.createdAt.substring(0, 10)}</td>
                  <td className="py-3 px-6">${order.totalPrice.toFixed(2)}</td>
                  <td className="py-3 px-6 text-center">
                    {order.isPaid ? (
                      <StatusPill tone="good">{order.paidAt.substring(0, 10)}</StatusPill>
                    ) : (
                      // A word, not a bare ✗: the paid state shows a date, so an
                      // icon alone gave no hint what the column was telling you.
                      <StatusPill tone="bad">Unpaid</StatusPill>
                    )}
                  </td>
                  <td className="py-3 px-6 text-center">
                    {order.isCancelled ? (
                      <StatusPill tone="bad">Cancelled</StatusPill>
                    ) : order.isDelivered ? (
                      <StatusPill tone="good">{order.deliveredAt.substring(0, 10)}</StatusPill>
                    ) : order.orderItems.some((item) => item.isDelivered) ? (
                      <StatusPill tone="warn">Partial</StatusPill>
                    ) : (
                      <StatusPill tone="warn">Pending</StatusPill>
                    )}
                  </td>
                  <td className="py-3 px-6 text-center space-x-2 whitespace-nowrap">
                    <Link
                      to={`/order/${order._id}`}
                      className="bg-violet-600 text-white py-1 px-3 rounded text-xs hover:bg-violet-500 hover:shadow-[0_0_12px_rgba(139,92,246,0.4)] transition"
                    >
                      Details
                    </Link>
                    {!order.isCancelled && !order.orderItems.some((item) => item.isDelivered) && (
                      <button
                        onClick={() => cancelHandler(order)}
                        disabled={cancellingId === order._id}
                        className="border border-red-500/40 text-red-300 py-1 px-3 rounded text-xs hover:bg-red-500/10 transition disabled:opacity-50"
                      >
                        {cancellingId === order._id ? '...' : 'Cancel'}
                      </button>
                    )}
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

export default MyOrdersPage;
