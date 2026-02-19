import { Link } from 'react-router-dom';
import { FaShoppingCart, FaUser } from 'react-icons/fa';
import { useContext } from 'react';
import { CartContext } from '../context/CartContext';

const Header = () => {
  const { cartItems } = useContext(CartContext);

  return (
    <header className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        {/* Logo */}
        <Link to="/" className="text-2xl font-bold tracking-wider hover:text-gray-300 transition">
          MERN Keyboards
        </Link>

        {/* Navigation Links */}
        <nav>
          <ul className="flex space-x-6 items-center">
            <li>
              <Link to="/cart" className="flex items-center hover:text-gray-300 transition relative">
                <FaShoppingCart className="mr-1" /> Cart
                {cartItems.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {cartItems.reduce((acc, item) => acc + item.qty, 0)}
                  </span>
                )}
              </Link>
            </li>
            <li>
              <Link to="/login" className="flex items-center hover:text-gray-300 transition">
                <FaUser className="mr-1" /> Sign In
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
