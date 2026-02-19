import { Link } from 'react-router-dom';

const Product = ({ product }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <Link to={`/product/${product._id}`}>
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-48 object-cover object-center"
        />
      </Link>

      <div className="p-4">
        <Link to={`/product/${product._id}`}>
          <h2 className="text-lg font-semibold text-gray-800 hover:text-indigo-600 truncate">
            {product.name}
          </h2>
        </Link>

        <div className="flex items-center mt-2 mb-4">
            {/* Placeholder for Rating component later */}
            <span className="text-yellow-500 text-sm">★★★★☆</span>
            <span className="text-gray-600 text-xs ml-1">({product.numReviews || 0} reviews)</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-xl font-bold text-gray-900">${product.price}</span>
          <Link 
            to={`/product/${product._id}`}
            className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300 transition"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Product;
