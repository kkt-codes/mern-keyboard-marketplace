import { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

const ROLE_STYLES = {
  buyer: 'bg-blue-100 text-blue-700',
  seller: 'bg-green-100 text-green-700',
  admin: 'bg-purple-100 text-purple-700',
};

/**
 * Pure identity page: view/edit name & email, see role and member-since date.
 * Order history and other account activity live on /dashboard instead.
 */
const ProfileScreen = () => {
  const { user, loading, updateUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        const { data } = await api.get('/auth/profile');
        setProfile(data);
        setName(data.name);
        setEmail(data.email);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load profile');
      } finally {
        setFetching(false);
      }
    };

    fetchProfile();
  }, [navigate, user, loading]);

  const submitHandler = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data } = await api.put('/auth/profile', { name, email });
      setProfile(data);
      updateUser({ name: data.name, email: data.email });
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (fetching || !profile) return <h2 className="text-center text-xl mt-10">Loading...</h2>;

  return (
    <div className="flex justify-center mt-10">
      <div className="w-full max-w-lg bg-white p-8 rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Profile</h1>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${ROLE_STYLES[profile.role]}`}>
            {profile.role}
          </span>
        </div>

        <p className="text-sm text-gray-500 mb-6">
          Member since {new Date(profile.createdAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>

        <form onSubmit={submitHandler}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded hover:bg-indigo-700 transition duration-300 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        <Link to="/dashboard" className="block text-center text-sm text-indigo-600 hover:underline mt-6">
          Go to Dashboard &rarr;
        </Link>
      </div>
    </div>
  );
};

export default ProfileScreen;
