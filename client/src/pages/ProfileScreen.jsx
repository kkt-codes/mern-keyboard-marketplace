import { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { FaTimes } from 'react-icons/fa';

const ProfileScreen = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [errorOrders, setErrorOrders] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
      setName(user.name);
      setEmail(user.email);
      fetchMyOrders();
    }
  }, [navigate, user]);

  const fetchMyOrders = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.get('/api/orders/myorders', config);
      setOrders(data);
      setLoadingOrders(false);
    } catch (err) {
      setErrorOrders(err.response?.data?.message || err.message);
      setLoadingOrders(false);
    }
  };

  return (
    <div className="container mx-auto mt-10">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* User Profile Column */}
        <div className="md:col-span-1">
          <h2 className="text-2xl font-bold mb-4">User Profile</h2>
          <form>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">Name</label>
              <input
                type="text"
                value={name}
                disabled
                className="w-full px-3 py-2 border rounded-lg bg-gray-100 cursor-not-allowed"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-3 py-2 border rounded-lg bg-gray-100 cursor-not-allowed"
              />
            </div>
            {/* Update logic can be added here later */}
          </form>
        </div>

        {/* My Orders Column */}
        <div className="md:col-span-3">
          <h2 className="text-2xl font-bold mb-4">My Orders</h2>
          {loadingOrders ? (
            <p>Loading orders...</p>
          ) : errorOrders ? (
            <div className="bg-red-100 text-red-700 p-3 rounded">{errorOrders}</div>
          ) : orders.length === 0 ? (
            <div className="bg-blue-100 text-blue-700 p-3 rounded">
              You have no orders. <Link to="/" className="underline font-bold">Start Shopping</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
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
                <tbody className="text-gray-600 text-sm font-light">
                  {orders.map((order) => (
                    <tr key={order._id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-6 text-left whitespace-nowrap font-medium">{order._id}</td>
                      <td className="py-3 px-6 text-left">{order.createdAt.substring(0, 10)}</td>
                      <td className="py-3 px-6 text-left">${order.totalPrice.toFixed(2)}</td>
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
      </div>
    </div>
  );
};

export default ProfileScreen;
