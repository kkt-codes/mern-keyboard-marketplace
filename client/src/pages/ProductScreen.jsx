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
  if (error) return <h2 className="text-center text-red-400 mt-10">{error}</h2>;
  if (!product) return <h2 className="text-center text-xl mt-10">Product not found</h2>;

  const alreadyReviewed = user && product.reviews.some((r) => r.user === user._id);

  return (
    <div className="container mx-auto mt-10">
      <Link to="/products" className="btn-ghost mb-6 px-4 py-2 text-sm">
        &larr; Back to Products
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Product Image */}
        <div className="flex justify-center">
          <div className="relative w-full max-w-md">
            <img
              src={product.image}
              alt={product.name}
              className="w-full rounded-lg border border-line shadow-xl shadow-black/40 object-cover"
            />
            <BookmarkButton product={product} className="absolute top-2 right-2" />
          </div>
        </div>

        {/* Product Details */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{product.name}</h1>
          <p className="mb-4 font-mono text-xs uppercase tracking-widest text-cyan-300">
            {product.brand}{product.category ? ` · ${product.category}` : ''}
          </p>

          <div className="mb-4">
            <Rating value={product.rating} text={`(${product.numReviews} review${product.numReviews === 1 ? '' : 's'})`} />
          </div>

          <p className="font-mono text-3xl font-bold text-white mb-4">${product.price}</p>

          <p className="text-slate-300 mb-6 leading-relaxed">
            {product.description}
          </p>

          {/* Stock & Add to Cart */}
          <div className="bg-card border border-line rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-400">Status:</span>
              <span className={`font-semibold ${product.countInStock > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {product.countInStock > 0 ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>

            {product.countInStock > 0 && (
              <div className="flex justify-between items-center mb-4">
                <span className="text-slate-400">Quantity:</span>
                <select
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  className="border border-line rounded px-2 py-1"
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
              className="btn-primary w-full py-3"
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
            <div className="border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 p-3 rounded">No reviews yet.</div>
          )}

          <div className="space-y-4">
            {product.reviews.map((review) => (
              <div key={review._id} className="border-b border-line pb-4">
                <div className="flex items-center justify-between mb-1">
                  <strong className="text-slate-100">{review.name}</strong>
                  <span className="text-xs text-slate-500">{review.createdAt.substring(0, 10)}</span>
                </div>
                <Rating value={review.rating} size="text-sm" />
                <p className="text-slate-300 mt-1">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Write a Review</h2>

          {!user ? (
            <div className="border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 p-3 rounded">
              <Link to="/login" className="underline font-bold">Sign in</Link> to write a review.
            </div>
          ) : alreadyReviewed ? (
            <div className="border border-cyan-500/30 bg-cyan-500/10 text-cyan-200 p-3 rounded">You've already reviewed this product.</div>
          ) : (
            <form onSubmit={submitReviewHandler} className="bg-card p-6 rounded-lg border border-line shadow-xl shadow-black/40">
              <div className="mb-4">
                <label className="block text-slate-300 text-sm font-bold mb-2">Rating</label>
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
                <label className="block text-slate-300 text-sm font-bold mb-2" htmlFor="comment">
                  Comment
                </label>
                <textarea
                  id="comment"
                  rows={4}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submittingReview}
                className="btn-primary w-full py-2.5 px-4"
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
