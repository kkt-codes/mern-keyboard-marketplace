import { useEffect, useState, useContext, useCallback } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

const OrderScreen = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payLoading, setPayLoading] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const { data } = await api.get(`/orders/${id}`);
      setOrder(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (user) {
      fetchOrder();
    }
  }, [user, fetchOrder]);

  // Stripe redirects back here with ?payment=success|canceled. The webhook
  // is what actually marks the order paid (usually already done by the time
  // this redirect lands), so we just refetch to pick that up and surface a
  // toast — this query param is purely a UX signal, never trusted for payment state.
  useEffect(() => {
    const payment = searchParams.get('payment');
    if (!payment) return;

    if (payment === 'success') {
      toast.success('Payment successful!');
      fetchOrder();
    } else if (payment === 'canceled') {
      toast.error('Payment canceled');
    }

    searchParams.delete('payment');
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const payHandler = async () => {
    setPayLoading(true);
    try {
      const { data } = await api.post(`/orders/${id}/create-checkout-session`);
      window.location.href = data.url;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start checkout');
      setPayLoading(false);
    }
  };

  if (loading) return <h2 className="text-center text-xl mt-10">Loading...</h2>;
  if (error) return <h2 className="text-center text-red-400 mt-10">{error}</h2>;

  return (
    <div className="container mx-auto mt-10">
      <h1 className="text-3xl font-bold mb-8">Order {order._id}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          {/* Shipping Info */}
          <div className="bg-card p-6 rounded-lg border border-line shadow-xl shadow-black/40 mb-6">
            <h2 className="text-xl font-bold mb-4">Shipping</h2>
            <p className="mb-2"><strong>Name: </strong> {order.user.name}</p>
            <p className="mb-2"><strong>Email: </strong> <a href={`mailto:${order.user.email}`} className="text-violet-400">{order.user.email}</a></p>
            <p className="mb-4">
              <strong>Address: </strong>
              {order.shippingAddress.address}, {order.shippingAddress.city},{' '}
              {order.shippingAddress.postalCode}, {order.shippingAddress.country}
            </p>
            
            {order.isDelivered ? (
              <div className="border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 p-3 rounded">Delivered on {order.deliveredAt}</div>
            ) : (
              <div className="border border-red-500/30 bg-red-500/10 text-red-300 p-3 rounded">Not Delivered</div>
            )}
          </div>

          {/* Payment Method */}
          <div className="bg-card p-6 rounded-lg border border-line shadow-xl shadow-black/40 mb-6">
            <h2 className="text-xl font-bold mb-4">Payment Method</h2>
            <p className="mb-4">
              <strong>Method: </strong>
              {order.paymentMethod}
            </p>
            
            {order.isPaid ? (
              <div className="border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 p-3 rounded">Paid on {order.paidAt}</div>
            ) : (
              <div className="border border-red-500/30 bg-red-500/10 text-red-300 p-3 rounded">Not Paid</div>
            )}
          </div>

          {/* Order Items */}
          <div className="bg-card p-6 rounded-lg border border-line shadow-xl shadow-black/40 mb-6">
            <h2 className="text-xl font-bold mb-4">Order Items</h2>
            {order.orderItems.length === 0 ? (
              <p>Order is empty</p>
            ) : (
              <div className="divide-y divide-line">
                {order.orderItems.map((item, index) => (
                  <div key={index} className="py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded mr-4"
                      />
                      <Link to={`/product/${item.product}`} className="text-violet-400 hover:underline">
                        {item.name}
                      </Link>
                    </div>
                    <div className="text-slate-300">
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
          <div className="bg-card p-6 rounded-lg border border-line shadow-xl shadow-black/40 border border-line">
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
            
            <div className="border-t border-line my-2"></div>
            
            <div className="flex justify-between mb-4 text-xl font-bold">
              <span>Total</span>
              <span>${order.totalPrice.toFixed(2)}</span>
            </div>
            
            {!order.isPaid && (
               <button
                 onClick={payHandler}
                 disabled={payLoading}
                 className="btn-primary w-full py-2.5 px-4"
               >
                 {payLoading ? 'Redirecting to Stripe...' : 'Pay with Stripe'}
               </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderScreen;
