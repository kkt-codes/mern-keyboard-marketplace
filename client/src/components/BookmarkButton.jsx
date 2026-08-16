import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaBookmark, FaRegBookmark } from 'react-icons/fa';
import { AuthContext } from '../context/AuthContext';
import { BookmarkContext } from '../context/BookmarkContext';

/**
 * Bookmark-ribbon toggle. Meant to be positioned absolutely by the
 * caller (e.g. top-right of a product image) via `className`.
 * Guests are redirected to log in instead of toggling anything.
 */
const BookmarkButton = ({ product, className = '' }) => {
  const { user } = useContext(AuthContext);
  const { isBookmarked, toggleBookmark } = useContext(BookmarkContext);
  const navigate = useNavigate();

  const bookmarked = isBookmarked(product._id);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      navigate('/login');
      return;
    }
    toggleBookmark(product);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this product'}
      aria-pressed={bookmarked}
      className={`bg-card/95 backdrop-blur border border-line rounded-full p-2 shadow hover:scale-110 hover:border-violet-500/60 transition ${className}`}
    >
      {bookmarked ? <FaBookmark className="text-violet-400" /> : <FaRegBookmark className="text-slate-400" />}
    </button>
  );
};

export default BookmarkButton;
