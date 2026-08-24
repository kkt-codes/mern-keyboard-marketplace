import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { AuthContext } from '../../../context/AuthContext';
import Pagination from '../../../components/Pagination';

const AllOrdersPage = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deliveringId, setDeliveringId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    const fetchOrders = async () => {
      try {
        const { data } = await api.get('/orders', { params: { page, keyword, status } });
        setOrders(data.orders);
        setPages(data.pages);
        setTotal(data.total);
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

  const deliverHandler = async (orderId) => {
    setDeliveringId(orderId);
    try {
      await api.put(`/orders/${orderId}/deliver`);
      toast.success('Order marked as delivered');
      setOrders((prev) =>
        prev.map((order) => (order._id === orderId ? { ...order, isDelivered: true } : order))
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update delivery status');
    } finally {
      setDeliveringId(null);
    }
  };

  const cancelHandler = async (order) => {
    const reason = window.prompt(
      order.isPaid
        ? 'Cancel this order and refund the buyer? Optionally give a reason:'
        : 'Cancel this order? Optionally give a reason:'
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">All Orders</h1>
        <span className="font-mono text-sm text-slate-400">{total} total</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          value={keyword}
          onChange={keywordChangeHandler}
          placeholder="Search by buyer name or email..."
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
        <div className="border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 p-3 rounded">No orders match your filters.</div>
      ) : (
        <div className="overflow-x-auto bg-card rounded-lg border border-line shadow-xl shadow-black/40">
          <table className="min-w-full">
            <thead>
              <tr className="bg-card-2 text-slate-400 uppercase text-sm leading-normal">
                <th className="py-3 px-6 text-left">Order ID</th>
                <th className="py-3 px-6 text-left">Buyer</th>
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
                  <td className="py-3 px-6">{order.user?.name || 'Deleted user'}</td>
                  <td className="py-3 px-6">{order.createdAt.substring(0, 10)}</td>
                  <td className="py-3 px-6">${order.totalPrice.toFixed(2)}</td>
                  <td className="py-3 px-6 text-center">
                    {order.isPaid ? (
                      <span className="bg-emerald-500/15 text-emerald-300 py-1 px-3 rounded-full text-xs">Paid</span>
                    ) : (
                      <span className="bg-red-500/15 text-red-300 py-1 px-3 rounded-full text-xs">Unpaid</span>
                    )}
                  </td>
                  <td className="py-3 px-6 text-center">
                    {order.isCancelled ? (
                      <span className="bg-red-500/15 text-red-300 py-1 px-3 rounded-full text-xs">Cancelled</span>
                    ) : order.isDelivered ? (
                      <span className="bg-emerald-500/15 text-emerald-300 py-1 px-3 rounded-full text-xs">Delivered</span>
                    ) : order.orderItems.some((item) => item.isDelivered) ? (
                      <span className="bg-amber-500/15 text-amber-300 py-1 px-3 rounded-full text-xs">Partial</span>
                    ) : (
                      <span className="bg-amber-500/15 text-amber-300 py-1 px-3 rounded-full text-xs">Pending</span>
                    )}
                  </td>
                  <td className="py-3 px-6 text-center space-x-2 whitespace-nowrap">
                    <Link
                      to={`/order/${order._id}`}
                      className="bg-card-2 border border-line text-slate-200 py-1 px-3 rounded text-xs hover:border-violet-500/60 transition"
                    >
                      Details
                    </Link>
                    {order.isPaid && !order.isDelivered && !order.isCancelled && (
                      <button
                        onClick={() => deliverHandler(order._id)}
                        disabled={deliveringId === order._id}
                        className="bg-violet-600 text-white py-1 px-3 rounded text-xs hover:bg-violet-500 transition disabled:opacity-50"
                      >
                        {deliveringId === order._id ? 'Updating...' : 'Mark Delivered'}
                      </button>
                    )}
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

export default AllOrdersPage;
