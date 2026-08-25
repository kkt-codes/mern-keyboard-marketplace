import { useState, useContext, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { safeRedirect } from '../utils/safeRedirect';

const RegisterScreen = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('buyer');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState('');

  const { register, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const redirect = safeRedirect(searchParams.get('redirect'));

  // Carry the destination across to Login, encoded so paths containing
  // `&` or `?` survive the round trip.
  const loginLink =
    redirect === '/' ? '/login' : `/login?redirect=${encodeURIComponent(redirect)}`;

  useEffect(() => {
    if (user) {
      navigate(redirect);
    }
  }, [navigate, user, redirect]);

  const submitHandler = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
    } else {
      try {
        await register(name, email, password, role);
      } catch (err) {
        setError(err.response?.data?.message || 'Registration failed');
      }
    }
  };

  return (
    <div className="flex justify-center items-center mt-10">
      <div className="w-full max-w-md bg-card p-8 rounded-lg border border-line shadow-xl shadow-black/40">
        <h1 className="text-2xl font-bold mb-6 text-center">Sign Up</h1>
        
        {message && <div className="border border-red-500/30 bg-red-500/10 text-red-300 p-3 rounded mb-4">{message}</div>}
        {error && <div className="border border-red-500/30 bg-red-500/10 text-red-300 p-3 rounded mb-4">{error}</div>}

        <form onSubmit={submitHandler}>
          <div className="mb-4">
            <label className="block text-slate-300 text-sm font-bold mb-2" htmlFor="name">
              Name
            </label>
            <input
              type="text"
              id="name"
              placeholder="Enter name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-slate-300 text-sm font-bold mb-2" htmlFor="email">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-slate-300 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <input
              type="password"
              id="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-slate-300 text-sm font-bold mb-2" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-slate-300 text-sm font-bold mb-2">I want to</label>
            <div className="flex items-center mb-2">
              <input
                type="radio"
                id="roleBuyer"
                name="role"
                value="buyer"
                checked={role === 'buyer'}
                onChange={(e) => setRole(e.target.value)}
                className="h-4 w-4 text-violet-400 focus:ring-violet-500 border-line"
              />
              <label htmlFor="roleBuyer" className="ml-3 block text-slate-300">
                Buy keyboards
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="radio"
                id="roleSeller"
                name="role"
                value="seller"
                checked={role === 'seller'}
                onChange={(e) => setRole(e.target.value)}
                className="h-4 w-4 text-violet-400 focus:ring-violet-500 border-line"
              />
              <label htmlFor="roleSeller" className="ml-3 block text-slate-300">
                Sell keyboards
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary w-full py-2.5 px-4"
          >
            Register
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-sm text-slate-400">
            Have an Account?{' '}
            <Link to={loginLink} className="text-violet-400 hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterScreen;
