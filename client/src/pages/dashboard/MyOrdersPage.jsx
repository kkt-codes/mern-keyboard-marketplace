import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaTimes } from 'react-icons/fa';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

const MyOrdersPage = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchOrders = async () => {
      try {
        const { data } = await api.get('/orders/myorders');
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
      <h1 className="text-2xl font-bold mb-6">My Orders</h1>

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
    </div>
  );
};

export default MyOrdersPage;
