import { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaTrash, FaShoppingCart, FaPlus, FaMinus, FaTruck, FaShieldAlt, FaUndo } from 'react-icons/fa';
import { CartContext } from '../context/CartContext';

const CartScreen = () => {
  const { cartItems, addToCart, removeFromCart } = useContext(CartContext);
  const navigate = useNavigate();

  const checkoutHandler = () => {
    // The redirect value must be an absolute path (leading slash) since
    // LoginScreen passes it straight into navigate() after login, and a
    // relative string there resolves against /login (e.g. "shipping" would
    // become the dead route /login/shipping instead of /shipping).
    navigate('/login?redirect=/shipping');
  };

  const subtotal = cartItems.reduce((acc, item) => acc + item.qty * item.price, 0);
  const totalItems = cartItems.reduce((acc, item) => acc + item.qty, 0);

  return (
    <div className="container mx-auto mt-10">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      {cartItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center bg-white rounded-lg shadow-md py-20 px-4 text-center">
          <FaShoppingCart className="text-6xl text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-6">Looks like you haven't added any keyboards yet.</p>
          <Link
            to="/"
            className="bg-indigo-600 hover:bg-indigo-700 transition text-white font-semibold px-6 py-3 rounded-lg"
          >
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Cart Items List */}
          <div className="md:col-span-2 bg-white rounded-lg shadow-md divide-y divide-gray-200">
            {cartItems.map((item) => (
              <div key={item._id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4">
                <Link to={`/product/${item._id}`} className="shrink-0">
                  <img src={item.image} alt={item.name} className="w-24 h-24 object-cover rounded-lg" />
                </Link>

                <div className="flex-1 min-w-0">
                  <Link
                    to={`/product/${item._id}`}
                    className="text-lg font-semibold text-gray-800 hover:text-indigo-600 block truncate"
                  >
                    {item.name}
                  </Link>
                  <p className="text-gray-500 text-sm">{item.brand}</p>
                  <p className="text-gray-900 font-bold mt-1">${item.price}</p>
                </div>

                <div className="flex items-center justify-between sm:flex-col sm:items-end gap-3">
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      type="button"
                      onClick={() => addToCart(item, Math.max(1, item.qty - 1))}
                      disabled={item.qty <= 1}
                      aria-label="Decrease quantity"
                      className="p-2 text-gray-600 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      <FaMinus size={10} />
                    </button>
                    <span className="w-8 text-center font-medium">{item.qty}</span>
                    <button
                      type="button"
                      onClick={() => addToCart(item, Math.min(item.countInStock, item.qty + 1))}
                      disabled={item.qty >= item.countInStock}
                      aria-label="Increase quantity"
                      className="p-2 text-gray-600 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      <FaPlus size={10} />
                    </button>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-bold text-gray-900">${(item.price * item.qty).toFixed(2)}</span>
                    <button
                      onClick={() => removeFromCart(item._id)}
                      aria-label="Remove item"
                      className="text-gray-400 hover:text-red-600 transition"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="md:col-span-1">
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 sticky top-4">
              <h2 className="text-xl font-bold mb-4">Order Summary</h2>

              <div className="flex justify-between mb-2 text-gray-600">
                <span>Subtotal ({totalItems} {totalItems === 1 ? 'item' : 'items'})</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-400 mb-4">Tax and shipping calculated at checkout.</p>

              <div className="border-t border-gray-200 pt-4 mb-4 flex justify-between text-xl font-bold">
                <span>Total</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>

              <button
                onClick={checkoutHandler}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
                disabled={cartItems.length === 0}
              >
                Proceed to Checkout
              </button>

              <Link
                to="/"
                className="block text-center text-sm text-indigo-600 hover:underline mt-4"
              >
                Continue Shopping
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
              <div className="flex flex-col items-center gap-1">
                <FaTruck className="text-indigo-600" />
                <span className="text-xs text-gray-500">Fast Shipping</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <FaShieldAlt className="text-indigo-600" />
                <span className="text-xs text-gray-500">Secure Checkout</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <FaUndo className="text-indigo-600" />
                <span className="text-xs text-gray-500">Easy Returns</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartScreen;
