import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { AuthContext } from './AuthContext';

export const BookmarkContext = createContext();

export const BookmarkProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [bookmarkedProducts, setBookmarkedProducts] = useState([]);
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());

  const fetchBookmarks = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/products/bookmarks/mine');
      setBookmarkedProducts(data);
      setBookmarkedIds(new Set(data.map((p) => p._id)));
    } catch {
      // Non-critical: leave whatever bookmark state we already have.
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchBookmarks();
    } else {
      // Logged out: clear so a different user's session never sees stale bookmarks.
      setBookmarkedProducts([]);
      setBookmarkedIds(new Set());
    }
  }, [user, fetchBookmarks]);

  const isBookmarked = (productId) => bookmarkedIds.has(productId);

  /**
   * Optimistically flips bookmark state, then confirms with the server.
   * Reverts and shows a toast if the request fails.
   * @param {object} product - full product doc (needed so bookmarkedProducts can render without a refetch)
   */
  const toggleBookmark = async (product) => {
    const wasBookmarked = bookmarkedIds.has(product._id);

    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      wasBookmarked ? next.delete(product._id) : next.add(product._id);
      return next;
    });
    setBookmarkedProducts((prev) =>
      wasBookmarked ? prev.filter((p) => p._id !== product._id) : [...prev, product]
    );

    try {
      await api.post(`/products/${product._id}/bookmark`);
    } catch {
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        wasBookmarked ? next.add(product._id) : next.delete(product._id);
        return next;
      });
      setBookmarkedProducts((prev) =>
        wasBookmarked ? [...prev, product] : prev.filter((p) => p._id !== product._id)
      );
      toast.error('Failed to update bookmark');
    }
  };

  return (
    <BookmarkContext.Provider value={{ bookmarkedProducts, isBookmarked, toggleBookmark }}>
      {children}
    </BookmarkContext.Provider>
  );
};

export default BookmarkContext;
