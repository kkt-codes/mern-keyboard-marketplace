import { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaTrash } from 'react-icons/fa';
import { CartContext } from '../context/CartContext';

const CartScreen = () => {
  const { cartItems, addToCart, removeFromCart } = useContext(CartContext);
  const navigate = useNavigate();

  const checkoutHandler = () => {
    navigate('/login?redirect=shipping');
  };

  return (
    <div className="container mx-auto mt-10">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      {cartItems.length === 0 ? (
        <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4" role="alert">
          <p>
            Your cart is empty. <Link to="/" className="underline font-bold">Go Back</Link>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Cart Items List */}
          <div className="md:col-span-2">
            {cartItems.map((item) => (
              <div key={item._id} className="flex items-center justify-between border-b border-gray-200 py-4">
                <div className="flex items-center space-x-4">
                  <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded" />
                  <Link to={`/product/${item._id}`} className="text-lg font-semibold text-gray-800 hover:text-indigo-600">
                    {item.name}
                  </Link>
                </div>
                
                <div className="flex items-center space-x-4">
                  <p className="text-lg font-bold">${item.price}</p>
                  
                  <select
                    value={item.qty}
                    onChange={(e) => addToCart(item, Number(e.target.value))}
                    className="border border-gray-300 rounded px-2 py-1"
                  >
                    {[...Array(item.countInStock).keys()].map((x) => (
                      <option key={x + 1} value={x + 1}>
                        {x + 1}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => removeFromCart(item._id)}
                    className="text-red-500 hover:text-red-700 transition"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="md:col-span-1">
            <div className="bg-gray-50 p-6 rounded-lg shadow-md border border-gray-200">
              <h2 className="text-xl font-bold mb-4">Order Summary</h2>
              
              <div className="flex justify-between mb-2">
                <span>Items:</span>
                <span>{cartItems.reduce((acc, item) => acc + item.qty, 0)}</span>
              </div>
              
              <div className="flex justify-between mb-4 text-xl font-bold">
                <span>Total:</span>
                <span>
                  ${cartItems
                    .reduce((acc, item) => acc + item.qty * item.price, 0)
                    .toFixed(2)}
                </span>
              </div>

              <button
                onClick={checkoutHandler}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
                disabled={cartItems.length === 0}
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartScreen;
