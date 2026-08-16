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
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <Link to={`/product/${product._id}`} className="block">
        <div className="relative">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-48 object-cover object-center"
          />
          <BookmarkButton product={product} className="absolute top-2 right-2" />
        </div>

        <div className="p-4 pb-0">
          <h2 className="text-lg font-semibold text-gray-800 hover:text-indigo-600 truncate">
            {product.name}
          </h2>

          <div className="mt-2 mb-4">
            <Rating value={product.rating} text={`(${product.numReviews || 0} reviews)`} size="text-sm" />
          </div>
        </div>
      </Link>

      <div className="p-4 pt-0 flex justify-between items-center">
        <span className="text-xl font-bold text-gray-900">${product.price}</span>
        <button
          onClick={addToCartHandler}
          disabled={product.countInStock === 0}
          className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
        >
          {product.countInStock === 0 ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
};

export default Product;
