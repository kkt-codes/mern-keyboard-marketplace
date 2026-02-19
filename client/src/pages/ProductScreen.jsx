import { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CartContext } from '../context/CartContext';

const ProductScreen = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useContext(CartContext);

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data } = await axios.get(`/api/products/${id}`);
        setProduct(data);
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.message || err.message);
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleAddToCart = () => {
    addToCart(product, Number(qty));
    navigate('/cart');
  };

  if (loading) return <h2 className="text-center text-xl mt-10">Loading...</h2>;
  if (error) return <h2 className="text-center text-red-500 mt-10">{error}</h2>;
  if (!product) return <h2 className="text-center text-xl mt-10">Product not found</h2>;

  return (
    <div className="container mx-auto mt-10">
      <Link to="/" className="inline-block mb-6 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition">
        &larr; Go Back
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Product Image */}
        <div className="flex justify-center">
          <img
            src={product.image}
            alt={product.name}
            className="w-full max-w-md rounded-lg shadow-lg object-cover"
          />
        </div>

        {/* Product Details */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
          <p className="text-sm text-gray-500 mb-4">Brand: {product.brand}</p>
          
          <div className="flex items-center mb-4">
             <span className="text-yellow-500 text-lg">★★★★☆</span>
             <span className="text-gray-600 ml-2">({product.numReviews || 0} reviews)</span>
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
    </div>
  );
};

export default ProductScreen;
