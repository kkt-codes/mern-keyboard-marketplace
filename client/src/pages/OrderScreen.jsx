import { useEffect, useState, useContext, useCallback } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { AuthContext } from '../context/contexts';
import DemoPaymentNotice from '../components/DemoPaymentNotice';

const OrderScreen = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payLoading, setPayLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState(null);

  const fetchOrder = useCallback(async () => {
    try {
      const { data } = await api.get(`/orders/${id}`);
      setOrder(data);
      return data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // Wait for the session to resolve, then send guests to log in — without
    // this the page would sit on "Loading..." forever for a logged-out
    // visitor, since the fetch below never runs.
    if (authLoading) return;
    if (!user) {
      navigate(`/login?redirect=/order/${id}`);
      return;
    }
    fetchOrder();
  }, [authLoading, user, id, navigate, fetchOrder]);

  // Stripe redirects back here with ?payment=success|canceled. That param says
  // only that the browser came back from Stripe — the webhook is the sole thing
  // that marks an order paid. So rather than announcing success on the strength
  // of a URL, poll until the order itself says it is paid, and report what we
  // actually found. Claiming success here would let the page congratulate you
  // above a row still reading "Unpaid".
  useEffect(() => {
    const payment = searchParams.get('payment');

    searchParams.delete('payment');
    setSearchParams(searchParams, { replace: true });

    if (payment === 'canceled') {
      toast.error('Payment canceled');
      return;
    }
    if (payment !== 'success') return;

    let cancelled = false;
    const toastId = toast.loading('Confirming your payment...');

    (async () => {
      // The webhook usually beats the redirect, but it travels a separate path
      // and can lag. Give it a bounded window instead of one hopeful refetch.
      for (let attempt = 0; attempt < 10 && !cancelled; attempt += 1) {
        const latest = await fetchOrder();

        if (cancelled) return;

        if (latest?.isPaid) {
          toast.success('Payment confirmed', { id: toastId });
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      if (cancelled) return;

      // Money may well have been taken — saying "failed" would be as wrong as
      // saying "successful". Describe the actual state and leave it there.
      toast(
        'Payment received, but we could not confirm it yet. Refresh in a moment — if it stays unpaid, contact support.',
        { id: toastId, icon: '⏳', duration: 8000 }
      );
    })();

    return () => {
      cancelled = true;
      toast.dismiss(toastId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Coming back from Stripe with the browser's Back button restores this page
  // from the back/forward cache with its old state, which would leave the pay
  // button stuck mid-redirect. Reset it and refetch, since the order may have
  // been paid in the meantime.
  useEffect(() => {
    const handleRestore = (event) => {
      if (!event.persisted) return;
      setPayLoading(false);
      fetchOrder();
    };

    window.addEventListener('pageshow', handleRestore);
    return () => window.removeEventListener('pageshow', handleRestore);
  }, [fetchOrder]);

  const payHandler = async () => {
    setPayLoading(true);
    try {
      const { data } = await api.post(`/orders/${id}/create-checkout-session`);
      setCheckoutUrl(data.url);
      window.location.href = data.url;

      // Normally the line above ends this page. If it doesn't — an extension
      // or network policy blocking the redirect is the usual reason — hand
      // control back rather than leaving a dead button, and surface the link
      // so the payment can still be completed manually.
      setTimeout(() => setPayLoading(false), 4000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start checkout');
      setPayLoading(false);
    }
  };

  const cancelHandler = async () => {
    const reason = window.prompt(
      order.isPaid
        ? 'Cancel this order and refund the payment? Optionally tell us why:'
        : 'Cancel this order? Optionally tell us why:'
    );
    // prompt() returns null when the dialog itself is dismissed — that's a
    // change of heart, not an empty reason.
    if (reason === null) return;

    setCancelLoading(true);
    try {
      const { data } = await api.put(`/orders/${id}/cancel`, { reason });
      setOrder(data);
      toast.success(data.refunds?.length ? 'Order cancelled and refunded' : 'Order cancelled');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel order');
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) return <h2 className="text-center text-xl mt-10">Loading...</h2>;
  if (error) return <h2 className="text-center text-red-400 mt-10">{error}</h2>;

  const formatDate = (value) => (value ? new Date(value).toLocaleString() : '');
  const anyItemShipped = order.orderItems.some((item) => item.isDelivered);
  const canCancel = !order.isCancelled && !anyItemShipped;
  const refunds = order.refunds || [];
  const refundedTotal = refunds.reduce((sum, refund) => sum + refund.amount, 0);

  return (
    <div className="container mx-auto mt-10">
      <h1 className="text-3xl font-bold mb-8">Order {order._id}</h1>

      {order.isCancelled && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300">
          <p className="font-semibold">
            Cancelled on {formatDate(order.cancelledAt)}
            {refunds.length > 0 && ` — $${refundedTotal.toFixed(2)} refunded`}
          </p>
          {order.cancelReason && <p className="mt-1 text-sm">Reason: {order.cancelReason}</p>}
          {/* Listed individually: an order paid twice gets refunded twice, and
              collapsing that to one line hides money that actually moved. */}
          {refunds.map((refund) => (
            <p key={refund.id} className="mt-1 font-mono text-xs text-red-300/80">
              Refund {refund.id} · ${refund.amount.toFixed(2)} · {refund.status}
            </p>
          ))}
        </div>
      )}

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
              <div className="border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 p-3 rounded">
                Delivered on {formatDate(order.deliveredAt)}
              </div>
            ) : anyItemShipped ? (
              <div className="border border-amber-500/30 bg-amber-500/10 text-amber-300 p-3 rounded">
                Partially delivered — some items are still on their way
              </div>
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
              <div className="border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 p-3 rounded">
                Paid on {formatDate(order.paidAt)}
              </div>
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
                  <div key={index} className="py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center min-w-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded mr-4 shrink-0"
                      />
                      <div className="min-w-0">
                        <Link to={`/product/${item.product}`} className="text-violet-400 hover:underline">
                          {item.name}
                        </Link>
                        {/* Each seller ships their own items, so status lives per line. */}
                        <div className="mt-1">
                          {item.isDelivered ? (
                            <span className="bg-emerald-500/15 text-emerald-300 py-0.5 px-2 rounded-full text-xs">
                              Delivered {formatDate(item.deliveredAt).split(',')[0]}
                            </span>
                          ) : order.isCancelled ? (
                            <span className="bg-red-500/15 text-red-300 py-0.5 px-2 rounded-full text-xs">
                              Cancelled
                            </span>
                          ) : (
                            <span className="bg-amber-500/15 text-amber-300 py-0.5 px-2 rounded-full text-xs">
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-slate-300 shrink-0">
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
            
            {refunds.length > 0 && (
              <div className="flex justify-between mb-4 text-sm text-red-300">
                <span>Refunded{refunds.length > 1 && ` (${refunds.length} payments)`}</span>
                <span>-${refundedTotal.toFixed(2)}</span>
              </div>
            )}

            {!order.isPaid && !order.isCancelled && (
              <>
                <button
                  onClick={payHandler}
                  disabled={payLoading}
                  className="btn-primary w-full py-2.5 px-4"
                >
                  {payLoading ? 'Redirecting to Stripe...' : 'Pay with Stripe'}
                </button>

                {checkoutUrl && !payLoading && (
                  <p className="mt-2 text-xs text-slate-400 text-center">
                    Didn&apos;t get taken to Stripe?{' '}
                    <a href={checkoutUrl} className="text-violet-400 hover:underline">
                      Open the payment page
                    </a>
                  </p>
                )}

                <DemoPaymentNotice />
              </>
            )}

            {canCancel && (
              <button
                onClick={cancelHandler}
                // Blocked mid-redirect: cancelling with a checkout page about
                // to open invites paying for an order that's already gone.
                disabled={cancelLoading || payLoading}
                className="w-full mt-2 py-2.5 px-4 rounded-lg border border-red-500/40 text-red-300 font-medium transition hover:bg-red-500/10 disabled:opacity-50 disabled:hover:bg-transparent"
              >
                {cancelLoading ? 'Cancelling...' : order.isPaid ? 'Cancel & Refund' : 'Cancel Order'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderScreen;
