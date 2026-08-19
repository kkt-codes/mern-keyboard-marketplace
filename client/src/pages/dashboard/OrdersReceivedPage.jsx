import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import Pagination from '../../components/Pagination';

const OrdersReceivedPage = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deliveringId, setDeliveringId] = useState(null);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/orders/sellerorders', { params: { page } });
      setOrders(data.orders);
      setPages(data.pages);
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

    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, navigate, page]);

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

  if (loading) return <h2 className="text-center text-xl mt-10">Loading...</h2>;
  if (error) return <h2 className="text-center text-red-400 mt-10">{error}</h2>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Orders Received</h1>

      {orders.length === 0 ? (
        <div className="border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 p-3 rounded">No orders yet.</div>
      ) : (
        <div className="overflow-x-auto bg-card rounded-lg border border-line shadow-xl shadow-black/40">
          <table className="min-w-full">
            <thead>
              <tr className="bg-card-2 text-slate-400 uppercase text-sm leading-normal">
                <th className="py-3 px-6 text-left">Order ID</th>
                <th className="py-3 px-6 text-left">Buyer</th>
                <th className="py-3 px-6 text-left">Date</th>
                <th className="py-3 px-6 text-left">Items</th>
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
                  <td className="py-3 px-6">{order.user?.name || 'Unknown'}</td>
                  <td className="py-3 px-6">{order.createdAt.substring(0, 10)}</td>
                  <td className="py-3 px-6">{order.orderItems.reduce((sum, i) => sum + i.qty, 0)}</td>
                  <td className="py-3 px-6">${order.sellerTotal.toFixed(2)}</td>
                  <td className="py-3 px-6 text-center">
                    {order.isPaid ? (
                      <span className="bg-emerald-500/15 text-emerald-300 py-1 px-3 rounded-full text-xs">Paid</span>
                    ) : (
                      <span className="bg-red-500/15 text-red-300 py-1 px-3 rounded-full text-xs">Unpaid</span>
                    )}
                  </td>
                  <td className="py-3 px-6 text-center">
                    {order.isDelivered ? (
                      <span className="bg-emerald-500/15 text-emerald-300 py-1 px-3 rounded-full text-xs">Delivered</span>
                    ) : (
                      <span className="bg-amber-500/15 text-amber-300 py-1 px-3 rounded-full text-xs">Pending</span>
                    )}
                  </td>
                  <td className="py-3 px-6 text-center">
                    {order.isPaid && !order.isDelivered && (
                      <button
                        onClick={() => deliverHandler(order._id)}
                        disabled={deliveringId === order._id}
                        className="bg-violet-600 text-white py-1 px-3 rounded text-xs hover:bg-violet-500 hover:shadow-[0_0_12px_rgba(139,92,246,0.4)] transition disabled:opacity-50"
                      >
                        {deliveringId === order._id ? 'Updating...' : 'Mark Delivered'}
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

export default OrdersReceivedPage;
