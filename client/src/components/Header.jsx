import { Link, useNavigate } from 'react-router-dom';
import { FaShoppingCart, FaUser, FaSignOutAlt, FaSearch, FaChevronDown, FaBars, FaTimes } from 'react-icons/fa';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [keyword, setKeyword] = useState('');

  const userMenuRef = useRef(null);
  const infoMenuRef = useRef(null);
  useClickOutside(userMenuRef, () => setDropdownOpen(false));
  useClickOutside(infoMenuRef, () => setInfoDropdownOpen(false));

  const cartCount = cartItems.reduce((acc, item) => acc + item.qty, 0);

  const logoutHandler = () => {
    logout();
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    navigate('/login');
  };

  const searchHandler = (e) => {
    e.preventDefault();
    navigate(keyword.trim() ? `/products?keyword=${encodeURIComponent(keyword.trim())}` : '/products');
    setMobileMenuOpen(false);
  };

  const SearchInput = () => (
    <div className="relative">
      <input
        type="text"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="Search keyboards..."
        className="w-full pl-3 pr-9 py-1.5 rounded-md bg-card-2 text-white placeholder-slate-500 border border-line focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
      />
      <button
        type="submit"
        aria-label="Search"
        className="absolute right-0 top-0 h-full px-3 text-slate-500 hover:text-white transition"
      >
        <FaSearch />
      </button>
    </div>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-abyss/85 backdrop-blur-md text-white">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center hover:opacity-90 transition shrink-0">
            <img
              src="/MERN-Keyboards-logo-transparent.png"
              alt="MERN Keyboards"
              className="h-8 sm:h-10 md:h-12 w-auto"
            />
          </Link>

          {/* Search - desktop only, inline */}
          <form onSubmit={searchHandler} className="hidden md:block flex-1 max-w-md">
            <SearchInput />
          </form>

          {/* Desktop nav */}
          <nav className="hidden md:block">
            <ul className="flex space-x-6 items-center">
              <li>
                <Link to="/" className="hover:text-cyan-300 transition">
                  Home
                </Link>
              </li>

              <li>
                <Link to="/products" className="hover:text-cyan-300 transition">
                  Products
                </Link>
              </li>

              <li>
                <Link to="/cart" className="flex items-center hover:text-cyan-300 transition relative">
                  <FaShoppingCart className="mr-1" /> Cart
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-gradient-to-r from-violet-500 to-cyan-400 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-[0_0_10px_rgba(139,92,246,0.6)]">
                      {cartCount}
                    </span>
                  )}
                </Link>
              </li>

              <li className="relative" ref={infoMenuRef}>
                <button
                  onClick={() => setInfoDropdownOpen(!infoDropdownOpen)}
                  className="flex items-center hover:text-cyan-300 transition focus:outline-none"
                >
                  Info <FaChevronDown className="ml-1 text-xs" />
                </button>

                {infoDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-40 bg-card rounded-md border border-line shadow-xl shadow-black/40 py-1 z-10 text-slate-100">
                    <Link to="/about" className="block px-4 py-2 hover:bg-card-2" onClick={() => setInfoDropdownOpen(false)}>
                      About Us
                    </Link>
                    <Link to="/contact" className="block px-4 py-2 hover:bg-card-2" onClick={() => setInfoDropdownOpen(false)}>
                      Contact
                    </Link>
                    <Link to="/faq" className="block px-4 py-2 hover:bg-card-2" onClick={() => setInfoDropdownOpen(false)}>
                      FAQ
                    </Link>
                    <Link to="/terms" className="block px-4 py-2 hover:bg-card-2" onClick={() => setInfoDropdownOpen(false)}>
                      Terms & Privacy
                    </Link>
                  </div>
                )}
              </li>

              {user ? (
                <li className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center hover:text-cyan-300 transition focus:outline-none"
                  >
                    <FaUser className="mr-1" /> {user.name}
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-card rounded-md border border-line shadow-xl shadow-black/40 py-1 z-10 text-slate-100">
                      <Link
                        to="/dashboard"
                        className="block px-4 py-2 hover:bg-card-2"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Dashboard
                      </Link>
                      <Link
                        to="/profile"
                        className="block px-4 py-2 hover:bg-card-2"
                        onClick={() => setDropdownOpen(false)}
                      >
                        Profile
                      </Link>
                      <button
                        onClick={logoutHandler}
                        className="block w-full text-left px-4 py-2 hover:bg-card-2 text-red-400"
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
                  <Link to="/login" className="flex items-center hover:text-cyan-300 transition">
                    <FaUser className="mr-1" /> Sign In
                  </Link>
                </li>
              )}
            </ul>
          </nav>

          {/* Mobile: Cart + Hamburger */}
          <div className="flex items-center gap-4 md:hidden">
            <Link to="/cart" className="relative">
              <FaShoppingCart className="text-xl" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-gradient-to-r from-violet-500 to-cyan-400 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-[0_0_10px_rgba(139,92,246,0.6)]">
                  {cartCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <FaTimes className="text-xl" /> : <FaBars className="text-xl" />}
            </button>
          </div>
        </div>

        {/* Search - mobile only, always visible below the logo row */}
        <form onSubmit={searchHandler} className="md:hidden mt-3">
          <SearchInput />
        </form>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-line space-y-1">
            <Link to="/" className="block py-2" onClick={() => setMobileMenuOpen(false)}>
              Home
            </Link>
            <Link to="/products" className="block py-2" onClick={() => setMobileMenuOpen(false)}>
              Products
            </Link>

            <div className="py-2">
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Info</p>
              <Link to="/about" className="block py-1.5 pl-2 text-slate-300" onClick={() => setMobileMenuOpen(false)}>
                About Us
              </Link>
              <Link to="/contact" className="block py-1.5 pl-2 text-slate-300" onClick={() => setMobileMenuOpen(false)}>
                Contact
              </Link>
              <Link to="/faq" className="block py-1.5 pl-2 text-slate-300" onClick={() => setMobileMenuOpen(false)}>
                FAQ
              </Link>
              <Link to="/terms" className="block py-1.5 pl-2 text-slate-300" onClick={() => setMobileMenuOpen(false)}>
                Terms & Privacy
              </Link>
            </div>

            <div className="pt-2 border-t border-line">
              {user ? (
                <>
                  <Link to="/dashboard" className="block py-2" onClick={() => setMobileMenuOpen(false)}>
                    Dashboard
                  </Link>
                  <Link to="/profile" className="block py-2" onClick={() => setMobileMenuOpen(false)}>
                    Profile
                  </Link>
                  <button onClick={logoutHandler} className="block w-full text-left py-2 text-red-400">
                    Logout
                  </button>
                </>
              ) : (
                <Link to="/login" className="block py-2" onClick={() => setMobileMenuOpen(false)}>
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
