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
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Payment Method</h1>

        <form onSubmit={submitHandler}>
          <div className="flex items-center gap-3 mb-6 border border-gray-200 rounded-lg p-4">
            <FaCcStripe className="text-3xl text-indigo-600 shrink-0" />
            <div>
              <p className="font-semibold text-gray-800">Pay with Stripe</p>
              <p className="text-sm text-gray-500">Card details are entered securely on Stripe's own page.</p>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded hover:bg-indigo-700 transition duration-300"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
};

export default PaymentScreen;
