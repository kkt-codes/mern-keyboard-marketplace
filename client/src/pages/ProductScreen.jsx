import { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FaStar } from 'react-icons/fa';
import { CartContext } from '../context/CartContext';
import { AuthContext } from '../context/AuthContext';
import BookmarkButton from '../components/BookmarkButton';
import Rating from '../components/Rating';

const ProductScreen = () => {
  const { id } = useParams();
  const { addToCart } = useContext(CartContext);
  const { user } = useContext(AuthContext);

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qty, setQty] = useState(1);

  const [reviewRating, setReviewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchProduct = async () => {
    try {
      const { data } = await api.get(`/products/${id}`);
      setProduct(data);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleAddToCart = () => {
    addToCart(product, Number(qty));
    toast.success('Added to cart!');
  };

  const submitReviewHandler = async (e) => {
    e.preventDefault();

    if (reviewRating === 0) {
      toast.error('Please select a star rating');
      return;
    }

    setSubmittingReview(true);
    try {
      const { data } = await api.post(`/products/${id}/reviews`, {
        rating: reviewRating,
        comment: reviewComment,
      });
      setProduct(data);
      setReviewRating(0);
      setReviewComment('');
      toast.success('Review submitted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return <h2 className="text-center text-xl mt-10">Loading...</h2>;
  if (error) return <h2 className="text-center text-red-500 mt-10">{error}</h2>;
  if (!product) return <h2 className="text-center text-xl mt-10">Product not found</h2>;

  const alreadyReviewed = user && product.reviews.some((r) => r.user === user._id);

  return (
    <div className="container mx-auto mt-10">
      <Link to="/" className="inline-block mb-6 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition">
        &larr; Go Back
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Product Image */}
        <div className="flex justify-center">
          <div className="relative w-full max-w-md">
            <img
              src={product.image}
              alt={product.name}
              className="w-full rounded-lg shadow-lg object-cover"
            />
            <BookmarkButton product={product} className="absolute top-2 right-2" />
          </div>
        </div>

        {/* Product Details */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
          <p className="text-sm text-gray-500 mb-4">Brand: {product.brand}</p>

          <div className="mb-4">
            <Rating value={product.rating} text={`(${product.numReviews} review${product.numReviews === 1 ? '' : 's'})`} />
          </div>

          <p className="text-2xl font-bold text-gray-900 mb-4">${product.price}</p>

          <p className="text-gray-700 mb-6 leading-relaxed">
            {product.description}
          </p>

          {/* Stock & Add to Cart */}
          <div className="border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-600">Status:</span>
              <span className={`font-semibold ${product.countInStock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {product.countInStock > 0 ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>

            {product.countInStock > 0 && (
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-600">Quantity:</span>
                <select
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1"
                >
                  {[...Array(product.countInStock).keys()].map((x) => (
                    <option key={x + 1} value={x + 1}>
                      {x + 1}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={handleAddToCart}
              className={`w-full py-3 rounded-lg font-semibold text-white transition ${
                product.countInStock > 0
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
              disabled={product.countInStock === 0}
            >
              {product.countInStock > 0 ? 'Add to Cart' : 'Out of Stock'}
            </button>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
        <div>
          <h2 className="text-2xl font-bold mb-4">Reviews</h2>

          {product.reviews.length === 0 && (
            <div className="bg-blue-100 text-blue-700 p-3 rounded">No reviews yet.</div>
          )}

          <div className="space-y-4">
            {product.reviews.map((review) => (
              <div key={review._id} className="border-b border-gray-200 pb-4">
                <div className="flex items-center justify-between mb-1">
                  <strong className="text-gray-800">{review.name}</strong>
                  <span className="text-xs text-gray-400">{review.createdAt.substring(0, 10)}</span>
                </div>
                <Rating value={review.rating} size="text-sm" />
                <p className="text-gray-700 mt-1">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Write a Review</h2>

          {!user ? (
            <div className="bg-blue-100 text-blue-700 p-3 rounded">
              <Link to="/login" className="underline font-bold">Sign in</Link> to write a review.
            </div>
          ) : alreadyReviewed ? (
            <div className="bg-blue-100 text-blue-700 p-3 rounded">You've already reviewed this product.</div>
          ) : (
            <form onSubmit={submitReviewHandler} className="bg-white p-6 rounded-lg shadow-md">
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      aria-label={`Rate ${star} out of 5`}
                      className="text-2xl focus:outline-none"
                    >
                      <FaStar className={star <= (hoverRating || reviewRating) ? 'text-yellow-500' : 'text-gray-300'} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="comment">
                  Comment
                </label>
                <textarea
                  id="comment"
                  rows={4}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submittingReview}
                className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded hover:bg-indigo-700 transition duration-300 disabled:opacity-50"
              >
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductScreen;
