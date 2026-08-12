import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

const OrdersReceivedPage = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || (user.role !== 'seller' && user.role !== 'admin')) {
      navigate('/dashboard');
      return;
    }

    const fetchOrders = async () => {
      try {
        const { data } = await api.get('/orders/sellerorders');
        setOrders(data);
      } catch (err) {
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [authLoading, user, navigate]);

  if (loading) return <h2 className="text-center text-xl mt-10">Loading...</h2>;
  if (error) return <h2 className="text-center text-red-500 mt-10">{error}</h2>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Orders Received</h1>

      {orders.length === 0 ? (
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
              {orders.map((order) => (
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
                      <span className="bg-green-200 text-green-600 py-1 px-3 rounded-full text-xs">Delivered</span>
                    ) : (
                      <span className="bg-yellow-200 text-yellow-700 py-1 px-3 rounded-full text-xs">Pending</span>
                    )}
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

export default OrdersReceivedPage;
