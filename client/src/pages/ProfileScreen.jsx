import { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

const ROLE_STYLES = {
  buyer: 'border border-cyan-500/30 bg-cyan-500/10 text-cyan-200',
  seller: 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  admin: 'bg-purple-100 text-purple-700',
};

/**
 * Pure identity page: view/edit name & email, see role and member-since date.
 * Order history and other account activity live on /dashboard instead.
 */
const ProfileScreen = () => {
  const { user, loading, updateUser, updateAccessToken } = useContext(AuthContext);
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [loggingOutOthers, setLoggingOutOthers] = useState(false);

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

  const passwordSubmitHandler = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmNewPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      const { data } = await api.put('/auth/password', { currentPassword, newPassword });
      // Changing the password revokes every session, including this one's
      // refresh token — swap in the fresh access token the server hands
      // back or the next silent refresh would fail and log this tab out too.
      updateAccessToken(data.accessToken);
      toast.success('Password updated. You have been logged out of all other devices.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setChangingPassword(false);
    }
  };

  const logoutOthersHandler = async () => {
    setLoggingOutOthers(true);
    try {
      const { data } = await api.post('/auth/logout-others');
      updateAccessToken(data.accessToken);
      toast.success('Logged out of all other devices');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to log out other devices');
    } finally {
      setLoggingOutOthers(false);
    }
  };

  if (fetching || !profile) return <h2 className="text-center text-xl mt-10">Loading...</h2>;

  return (
    <div className="flex justify-center mt-10">
      <div className="w-full max-w-lg bg-card p-8 rounded-lg border border-line shadow-xl shadow-black/40">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Profile</h1>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${ROLE_STYLES[profile.role]}`}>
            {profile.role}
          </span>
        </div>

        <p className="text-sm text-slate-400 mb-6">
          Member since {new Date(profile.createdAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>

        <form onSubmit={submitHandler}>
          <div className="mb-4">
            <label className="block text-slate-300 text-sm font-bold mb-2" htmlFor="name">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-slate-300 text-sm font-bold mb-2" htmlFor="email">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary w-full py-2.5 px-4"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        <div className="border-t border-line mt-8 pt-6">
          <h2 className="text-lg font-bold mb-4">Change Password</h2>

          <form onSubmit={passwordSubmitHandler}>
            <div className="mb-4">
              <label className="block text-slate-300 text-sm font-bold mb-2" htmlFor="currentPassword">
                Current Password
              </label>
              <input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-slate-300 text-sm font-bold mb-2" htmlFor="newPassword">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-slate-300 text-sm font-bold mb-2" htmlFor="confirmNewPassword">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmNewPassword"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                minLength={6}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={changingPassword}
              className="btn-primary w-full py-2.5 px-4"
            >
              {changingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        <div className="border-t border-line mt-8 pt-6">
          <h2 className="text-lg font-bold mb-2">Sessions</h2>
          <p className="text-sm text-slate-400 mb-4">
            If you think someone else is signed into your account on another device, you
            can sign them out without changing your password. This device stays signed in.
          </p>
          <button
            type="button"
            onClick={logoutOthersHandler}
            disabled={loggingOutOthers}
            className="w-full py-2.5 px-4 rounded-lg border border-red-500/40 text-red-300 font-medium transition hover:bg-red-500/10 disabled:opacity-50"
          >
            {loggingOutOthers ? 'Logging out other devices...' : 'Log Out Other Devices'}
          </button>
        </div>

        <Link to="/dashboard" className="block text-center text-sm text-violet-400 hover:underline mt-6">
          Go to Dashboard &rarr;
        </Link>
      </div>
    </div>
  );
};

export default ProfileScreen;
