import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { AuthContext } from '../../../context/AuthContext';
import Pagination from '../../../components/Pagination';

const ROLE_BADGE = {
  admin: 'bg-violet-500/15 text-violet-300',
  seller: 'bg-cyan-500/15 text-cyan-300',
  buyer: 'bg-emerald-500/15 text-emerald-300',
};

const UsersPage = () => {
  const { user: me, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [role, setRole] = useState('');

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users', { params: { page, keyword, role } });
      setUsers(data.users);
      setPages(data.pages);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!me || me.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, me, navigate, page, keyword, role]);

  // Any filter change starts back at page 1 — a stale page number from a
  // wider result set could otherwise land past the end of a narrower one.
  const keywordChangeHandler = (e) => {
    setKeyword(e.target.value);
    setPage(1);
  };
  const roleChangeHandler = (e) => {
    setRole(e.target.value);
    setPage(1);
  };

  const roleHandler = async (userId, role) => {
    setBusyId(userId);
    try {
      await api.put(`/users/${userId}/role`, { role });
      toast.success('Role updated');
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, role } : u)));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role');
    } finally {
      setBusyId(null);
    }
  };

  const deleteHandler = async (userId, name) => {
    if (!window.confirm(`Delete ${name} and all their product listings? This cannot be undone.`)) return;

    setBusyId(userId);
    try {
      await api.delete(`/users/${userId}`);
      toast.success('User removed');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <h2 className="text-center text-xl mt-10">Loading...</h2>;
  if (error) return <h2 className="text-center text-red-400 mt-10">{error}</h2>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <span className="font-mono text-sm text-slate-400">{total} total</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          value={keyword}
          onChange={keywordChangeHandler}
          placeholder="Search by name or email..."
          className="flex-1 px-3 py-2 border border-line rounded text-sm"
        />
        <select
          value={role}
          onChange={roleChangeHandler}
          className="border border-line rounded px-3 py-2 text-sm"
        >
          <option value="">All roles</option>
          <option value="buyer">Buyer</option>
          <option value="seller">Seller</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {users.length === 0 ? (
        <div className="border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 p-3 rounded">
          No users match your search.
        </div>
      ) : (
      <div className="overflow-x-auto bg-card rounded-lg border border-line shadow-xl shadow-black/40">
        <table className="min-w-full">
          <thead>
            <tr className="bg-card-2 text-slate-400 uppercase text-sm leading-normal">
              <th className="py-3 px-6 text-left">Name</th>
              <th className="py-3 px-6 text-left">Email</th>
              <th className="py-3 px-6 text-left">Joined</th>
              <th className="py-3 px-6 text-center">Role</th>
              <th className="py-3 px-6 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="text-slate-400 text-sm">
            {users.map((u) => {
              const isSelf = u._id === me._id;
              return (
                <tr key={u._id} className="border-b border-line hover:bg-card-2">
                  <td className="py-3 px-6 font-medium text-slate-200">
                    {u.name}
                    {isSelf && <span className="ml-2 font-mono text-xs text-slate-500">(you)</span>}
                  </td>
                  <td className="py-3 px-6">{u.email}</td>
                  <td className="py-3 px-6">{u.createdAt?.substring(0, 10)}</td>
                  <td className="py-3 px-6 text-center">
                    {isSelf ? (
                      <span className={`py-1 px-3 rounded-full text-xs ${ROLE_BADGE[u.role]}`}>{u.role}</span>
                    ) : (
                      <select
                        value={u.role}
                        onChange={(e) => roleHandler(u._id, e.target.value)}
                        disabled={busyId === u._id}
                        className="border border-line rounded px-2 py-1 text-xs disabled:opacity-50"
                      >
                        <option value="buyer">buyer</option>
                        <option value="seller">seller</option>
                        <option value="admin">admin</option>
                      </select>
                    )}
                  </td>
                  <td className="py-3 px-6 text-center">
                    {!isSelf && u.role !== 'admin' && (
                      <button
                        onClick={() => deleteHandler(u._id, u.name)}
                        disabled={busyId === u._id}
                        className="bg-red-500 text-white py-1 px-3 rounded text-xs hover:bg-red-600 transition disabled:opacity-50"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      <Pagination page={page} pages={pages} onPageChange={setPage} />
    </div>
  );
};

export default UsersPage;
