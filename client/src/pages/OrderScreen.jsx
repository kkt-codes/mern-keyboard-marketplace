import { useEffect, useState, useContext } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const OrderScreen = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const config = {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        };

        const { data } = await axios.get(`/api/orders/${id}`, config);
        setOrder(data);
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.message || err.message);
        setLoading(false);
      }
    };

    if (user) {
      fetchOrder();
    }
  }, [id, user]);

  if (loading) return <h2 className="text-center text-xl mt-10">Loading...</h2>;
  if (error) return <h2 className="text-center text-red-500 mt-10">{error}</h2>;

  return (
    <div className="container mx-auto mt-10">
      <h1 className="text-3xl font-bold mb-8">Order {order._id}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          {/* Shipping Info */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-bold mb-4">Shipping</h2>
            <p className="mb-2"><strong>Name: </strong> {order.user.name}</p>
            <p className="mb-2"><strong>Email: </strong> <a href={`mailto:${order.user.email}`} className="text-indigo-600">{order.user.email}</a></p>
            <p className="mb-4">
              <strong>Address: </strong>
              {order.shippingAddress.address}, {order.shippingAddress.city},{' '}
              {order.shippingAddress.postalCode}, {order.shippingAddress.country}
            </p>
            
            {order.isDelivered ? (
              <div className="bg-green-100 text-green-700 p-3 rounded">Delivered on {order.deliveredAt}</div>
            ) : (
              <div className="bg-red-100 text-red-700 p-3 rounded">Not Delivered</div>
            )}
          </div>

          {/* Payment Method */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-bold mb-4">Payment Method</h2>
            <p className="mb-4">
              <strong>Method: </strong>
              {order.paymentMethod}
            </p>
            
            {order.isPaid ? (
              <div className="bg-green-100 text-green-700 p-3 rounded">Paid on {order.paidAt}</div>
            ) : (
              <div className="bg-red-100 text-red-700 p-3 rounded">Not Paid</div>
            )}
          </div>

          {/* Order Items */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-bold mb-4">Order Items</h2>
            {order.orderItems.length === 0 ? (
              <p>Order is empty</p>
            ) : (
              <div className="divide-y divide-gray-200">
                {order.orderItems.map((item, index) => (
                  <div key={index} className="py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded mr-4"
                      />
                      <Link to={`/product/${item.product}`} className="text-indigo-600 hover:underline">
                        {item.name}
                      </Link>
                    </div>
                    <div className="text-gray-700">
                      {item.qty} x ${item.price} = ${(item.qty * item.price).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>
            
            <div className="flex justify-between mb-2">
              <span>Items</span>
              <span>${(order.totalPrice - order.shippingPrice - order.taxPrice).toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between mb-2">
              <span>Shipping</span>
              <span>${order.shippingPrice.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between mb-2">
              <span>Tax</span>
              <span>${order.taxPrice.toFixed(2)}</span>
            </div>
            
            <div className="border-t border-gray-200 my-2"></div>
            
            <div className="flex justify-between mb-4 text-xl font-bold">
              <span>Total</span>
              <span>${order.totalPrice.toFixed(2)}</span>
            </div>
            
            {/* Placeholder for PayPal Button */}
            {!order.isPaid && (
               <button className="w-full bg-yellow-400 text-black font-bold py-2 px-4 rounded hover:bg-yellow-500 transition">
                 Pay with PayPal (Mock)
               </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderScreen;
