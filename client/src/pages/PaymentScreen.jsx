import { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCcStripe } from 'react-icons/fa';
import { CartContext } from '../context/CartContext';

/**
 * Stripe is the only real payment method this app processes, so this step
 * is just a confirmation rather than a choice between options — offering a
 * fake PayPal radio button would be misleading now that Stripe actually works.
 */
const PaymentScreen = () => {
  const { shippingAddress, savePaymentMethod } = useContext(CartContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!shippingAddress.address) {
      navigate('/shipping');
    }
  }, [shippingAddress, navigate]);

  const submitHandler = (e) => {
    e.preventDefault();
    savePaymentMethod('Stripe');
    navigate('/placeorder');
  };

  return (
    <div className="flex justify-center items-center mt-10">
      <div className="w-full max-w-md bg-card p-8 rounded-lg border border-line shadow-xl shadow-black/40">
        <h1 className="text-2xl font-bold mb-6 text-center">Payment Method</h1>

        <form onSubmit={submitHandler}>
          <div className="flex items-center gap-3 mb-6 border border-line rounded-lg p-4">
            <FaCcStripe className="text-3xl text-violet-400 shrink-0" />
            <div>
              <p className="font-semibold text-slate-100">Pay with Stripe</p>
              <p className="text-sm text-slate-400">Card details are entered securely on Stripe's own page.</p>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary w-full py-2.5 px-4"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
};

export default PaymentScreen;
