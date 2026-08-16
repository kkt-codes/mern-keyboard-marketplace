import { Link } from 'react-router-dom';
import { FaGithub, FaKeyboard } from 'react-icons/fa';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-line/70 bg-abyss/60">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-flex items-center hover:opacity-90 transition">
              <img
                src="/MERN-Keyboards-logo-transparent.png"
                alt="MERN Keyboards"
                className="h-10 w-auto"
              />
            </Link>
            <p className="mt-3 text-sm text-slate-400 max-w-sm leading-relaxed">
              Mechanical keyboards from independent sellers — browse builds, compare
              specs, and order straight from the people who make them.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-md border border-line bg-card px-3 py-1.5 font-mono text-xs text-slate-400">
              <FaKeyboard className="text-violet-400" />
              MongoDB · Express · React · Node
            </p>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-500 mb-3">
              Shop
            </h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/products" className="text-slate-300 hover:text-cyan-300 transition">All Keyboards</Link></li>
              <li><Link to="/products?category=Mechanical" className="text-slate-300 hover:text-cyan-300 transition">Mechanical</Link></li>
              <li><Link to="/products?category=Custom" className="text-slate-300 hover:text-cyan-300 transition">Custom Builds</Link></li>
              <li><Link to="/cart" className="text-slate-300 hover:text-cyan-300 transition">Cart</Link></li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-500 mb-3">
              Info
            </h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="text-slate-300 hover:text-cyan-300 transition">About Us</Link></li>
              <li><Link to="/contact" className="text-slate-300 hover:text-cyan-300 transition">Contact</Link></li>
              <li><Link to="/faq" className="text-slate-300 hover:text-cyan-300 transition">FAQ</Link></li>
              <li><Link to="/terms" className="text-slate-300 hover:text-cyan-300 transition">Terms & Privacy</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-line/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500 font-mono">
            © {currentYear} MERN Keyboard Marketplace. All rights reserved.
          </p>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <FaGithub /> Built with ❤️ for learning the MERN stack
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
