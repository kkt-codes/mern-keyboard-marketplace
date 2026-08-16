import { useContext } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import BookmarkButton from './BookmarkButton';
import Rating from './Rating';
import { CartContext } from '../context/CartContext';

const Product = ({ product }) => {
  const { cartItems, addToCart } = useContext(CartContext);

  const addToCartHandler = (e) => {
    e.preventDefault();
    const existItem = cartItems.find((x) => x._id === product._id);
    const nextQty = (existItem?.qty || 0) + 1;
    addToCart(product, nextQty);
    toast.success('Added to cart!');
  };

  return (
    <div className="bg-card rounded-lg border border-line shadow-xl shadow-black/40 overflow-hidden hover:border-violet-500/50 hover:shadow-[0_0_30px_rgba(139,92,246,0.18)] transition-all duration-300">
      <Link to={`/product/${product._id}`} className="block group">
        <div className="relative overflow-hidden">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-48 object-cover object-center transition-transform duration-500 group-hover:scale-105"
          />
          <BookmarkButton product={product} className="absolute top-2 right-2" />
          {product.category && (
            <span className="absolute bottom-2 left-2 rounded border border-line bg-abyss/80 backdrop-blur px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-cyan-300">
              {product.category}
            </span>
          )}
        </div>

        <div className="p-4 pb-0">
          <h2 className="text-lg font-semibold text-slate-100 group-hover:text-violet-300 transition truncate">
            {product.name}
          </h2>

          <div className="mt-2 mb-4">
            <Rating value={product.rating} text={`(${product.numReviews || 0} reviews)`} size="text-sm" />
          </div>
        </div>
      </Link>

      <div className="p-4 pt-0 flex justify-between items-center">
        <span className="font-mono text-xl font-bold text-white">${product.price}</span>
        <button
          onClick={addToCartHandler}
          disabled={product.countInStock === 0}
          className="px-3 py-1 bg-violet-600 text-white text-sm rounded hover:bg-violet-500 transition disabled:bg-line disabled:text-slate-400 disabled:cursor-not-allowed"
        >
          {product.countInStock === 0 ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
};

export default Product;
