import { useContext } from 'react';
import { BookmarkContext } from '../../context/BookmarkContext';
import Product from '../../components/Product';

/**
 * Shared between buyers and sellers — bookmarking isn't tied to a role.
 */
const BookmarksPage = () => {
  const { bookmarkedProducts } = useContext(BookmarkContext);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Bookmarked Products</h1>

      {bookmarkedProducts.length === 0 ? (
        <div className="bg-blue-100 text-blue-700 p-3 rounded">
          No bookmarks yet. Tap the bookmark icon on any product to save it here.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookmarkedProducts.map((product) => (
            <Product key={product._id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default BookmarksPage;
