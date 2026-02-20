import { useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';

const PlaceOrderScreen = () => {
  const { cartItems, shippingAddress, paymentMethod, clearCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Calculate Prices
  const addDecimals = (num) => {
    return (Math.round(num * 100) / 100).toFixed(2);
  };

  const itemsPrice = addDecimals(
    cartItems.reduce((acc, item) => acc + item.price * item.qty, 0)
  );
  
  const shippingPrice = addDecimals(itemsPrice > 100 ? 0 : 10);
  const taxPrice = addDecimals(Number((0.15 * itemsPrice).toFixed(2)));
  
  const totalPrice = (
    Number(itemsPrice) +
    Number(shippingPrice) +
    Number(taxPrice)
  ).toFixed(2);

  useEffect(() => {
    if (!paymentMethod) {
      navigate('/payment');
    }
  }, [paymentMethod, navigate]);

  const placeOrderHandler = async () => {
    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
      };

      const { data } = await axios.post(
        '/api/orders',
        {
          orderItems: cartItems,
          shippingAddress,
          paymentMethod,
          itemsPrice,
          shippingPrice,
          taxPrice,
          totalPrice,
        },
        config
      );

      clearCart();
      navigate(`/order/${data._id}`);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <div className="container mx-auto mt-10">
      <h1 className="text-3xl font-bold mb-8">Place Order</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          {/* Shipping Address */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-bold mb-4">Shipping</h2>
            <p className="text-gray-700">
              <strong>Address: </strong>
              {shippingAddress.address}, {shippingAddress.city},{' '}
              {shippingAddress.postalCode}, {shippingAddress.country}
            </p>
          </div>

          {/* Payment Method */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-bold mb-4">Payment Method</h2>
            <p className="text-gray-700">
              <strong>Method: </strong>
              {paymentMethod}
            </p>
          </div>

          {/* Order Items */}
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h2 className="text-xl font-bold mb-4">Order Items</h2>
            {cartItems.length === 0 ? (
              <p>Your cart is empty</p>
            ) : (
              <div className="divide-y divide-gray-200">
                {cartItems.map((item) => (
                  <div key={item._id} className="py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded mr-4"
                      />
                      <Link to={`/product/${item._id}`} className="text-indigo-600 hover:underline">
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
              <span>${itemsPrice}</span>
            </div>
            
            <div className="flex justify-between mb-2">
              <span>Shipping</span>
              <span>${shippingPrice}</span>
            </div>
            
            <div className="flex justify-between mb-2">
              <span>Tax</span>
              <span>${taxPrice}</span>
            </div>
            
            <div className="border-t border-gray-200 my-2"></div>
            
            <div className="flex justify-between mb-4 text-xl font-bold">
              <span>Total</span>
              <span>${totalPrice}</span>
            </div>

            <button
              type="button"
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
              disabled={cartItems.length === 0}
              onClick={placeOrderHandler}
            >
              Place Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaceOrderScreen;
