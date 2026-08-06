import { Link, useNavigate } from 'react-router-dom';
import { FaShoppingCart, FaUser, FaSignOutAlt, FaSearch, FaChevronDown } from 'react-icons/fa';
import { useContext, useState, useRef } from 'react';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import useClickOutside from '../hooks/useClickOutside';

const Header = () => {
  const { cartItems } = useContext(CartContext);
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [infoDropdownOpen, setInfoDropdownOpen] = useState(false);
  const [keyword, setKeyword] = useState('');

  const userMenuRef = useRef(null);
  const infoMenuRef = useRef(null);
  useClickOutside(userMenuRef, () => setDropdownOpen(false));
  useClickOutside(infoMenuRef, () => setInfoDropdownOpen(false));

  const logoutHandler = () => {
    logout();
    setDropdownOpen(false);
    navigate('/login');
  };

  const searchHandler = (e) => {
    e.preventDefault();
    navigate(keyword.trim() ? `/?keyword=${encodeURIComponent(keyword.trim())}` : '/');
  };

  return (
    <header className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center hover:opacity-90 transition">
          <img
            src="/MERN-Keyboards-logo-transparent.png"
            alt="MERN Keyboards"
            className="h-8 sm:h-10 md:h-12 w-auto"
          />
        </Link>

        {/* Search */}
        <form onSubmit={searchHandler} className="order-3 md:order-none flex-1 min-w-[180px] max-w-md">
          <div className="relative">
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Search keyboards..."
              className="w-full pl-3 pr-9 py-1.5 rounded-md bg-gray-800 text-white placeholder-gray-400 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              aria-label="Search"
              className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white transition"
            >
              <FaSearch />
            </button>
          </div>
        </form>

        {/* Navigation Links */}
        <nav>
          <ul className="flex space-x-6 items-center">
            <li>
              <Link to="/" className="hover:text-gray-300 transition">
                Home
              </Link>
            </li>

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

            <li className="relative" ref={infoMenuRef}>
              <button
                onClick={() => setInfoDropdownOpen(!infoDropdownOpen)}
                className="flex items-center hover:text-gray-300 transition focus:outline-none"
              >
                Info <FaChevronDown className="ml-1 text-xs" />
              </button>

              {infoDropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg py-1 z-10 text-gray-800">
                  <Link to="/about" className="block px-4 py-2 hover:bg-gray-100" onClick={() => setInfoDropdownOpen(false)}>
                    About Us
                  </Link>
                  <Link to="/contact" className="block px-4 py-2 hover:bg-gray-100" onClick={() => setInfoDropdownOpen(false)}>
                    Contact
                  </Link>
                  <Link to="/faq" className="block px-4 py-2 hover:bg-gray-100" onClick={() => setInfoDropdownOpen(false)}>
                    FAQ
                  </Link>
                  <Link to="/terms" className="block px-4 py-2 hover:bg-gray-100" onClick={() => setInfoDropdownOpen(false)}>
                    Terms & Privacy
                  </Link>
                </div>
              )}
            </li>

            {user ? (
              <li className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center hover:text-gray-300 transition focus:outline-none"
                >
                  <FaUser className="mr-1" /> {user.name}
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 text-gray-800">
                    <Link
                      to="/dashboard"
                      className="block px-4 py-2 hover:bg-gray-100"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/profile"
                      className="block px-4 py-2 hover:bg-gray-100"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Profile
                    </Link>
                    <button
                      onClick={logoutHandler}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
                    >
                      <div className="flex items-center">
                        <FaSignOutAlt className="mr-2" /> Logout
                      </div>
                    </button>
                  </div>
                )}
              </li>
            ) : (
              <li>
                <Link to="/login" className="flex items-center hover:text-gray-300 transition">
                  <FaUser className="mr-1" /> Sign In
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
