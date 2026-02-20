import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../context/CartContext';

const PaymentScreen = () => {
  const { shippingAddress, savePaymentMethod } = useContext(CartContext);
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState('PayPal');

  useEffect(() => {
    if (!shippingAddress.address) {
      navigate('/shipping');
    }
  }, [shippingAddress, navigate]);

  const submitHandler = (e) => {
    e.preventDefault();
    savePaymentMethod(paymentMethod);
    navigate('/placeorder');
  };

  return (
    <div className="flex justify-center items-center mt-10">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Payment Method</h1>

        <form onSubmit={submitHandler}>
          <div className="mb-6">
            <label className="block text-gray-700 text-lg font-bold mb-4">
              Select Method
            </label>
            
            <div className="flex items-center mb-4">
              <input
                type="radio"
                id="PayPal"
                name="paymentMethod"
                value="PayPal"
                checked={paymentMethod === 'PayPal'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
              />
              <label htmlFor="PayPal" className="ml-3 block text-gray-700">
                PayPal or Credit Card
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="radio"
                id="Stripe"
                name="paymentMethod"
                value="Stripe"
                checked={paymentMethod === 'Stripe'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
              />
              <label htmlFor="Stripe" className="ml-3 block text-gray-700">
                Stripe
              </label>
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
