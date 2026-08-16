import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FaTimes } from 'react-icons/fa';
import api from '../services/api';

/**
 * Single form for both creating and editing a product.
 * Edit mode is detected purely from the presence of the :id route param —
 * no separate "create" component needed since the fields are identical.
 */
const ProductEditScreen = () => {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [countInStock, setCountInStock] = useState('');

  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isEditMode) return;

    const fetchProduct = async () => {
      try {
        const { data } = await api.get(`/products/${id}`);
        setName(data.name);
        setImage(data.image);
        setBrand(data.brand);
        setCategory(data.category);
        setDescription(data.description);
        setPrice(data.price);
        setCountInStock(data.countInStock);
      } catch (err) {
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, isEditMode]);

  const imageChangeHandler = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    setUploading(true);
    try {
      // No explicit Content-Type here — axios/the browser must generate it
      // themselves so it includes the multipart boundary; setting it
      // manually would produce a boundary-less header the server can't parse.
      const { data } = await api.post('/upload', formData);
      setImage(data.url);
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeImageHandler = () => {
    setImage('');
    // Reset the input's value too, or re-selecting the exact same file
    // afterward wouldn't fire a new onChange event.
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const submitHandler = async (e) => {
    e.preventDefault();

    if (!image) {
      toast.error('Please upload a product image');
      return;
    }

    setSubmitting(true);

    const payload = {
      name,
      image,
      brand,
      category,
      description,
      price: Number(price),
      countInStock: Number(countInStock),
    };

    try {
      if (isEditMode) {
        await api.put(`/products/${id}`, payload);
        toast.success('Product updated');
      } else {
        await api.post('/products', payload);
        toast.success('Product created');
      }
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <h2 className="text-center text-xl mt-10">Loading...</h2>;
  if (error) return <h2 className="text-center text-red-400 mt-10">{error}</h2>;

  return (
    <div className="flex justify-center mt-10">
      <div className="w-full max-w-lg bg-card p-8 rounded-lg border border-line shadow-xl shadow-black/40">
        <Link to="/dashboard" className="inline-block mb-6 text-violet-400 hover:underline">
          &larr; Back to Dashboard
        </Link>

        <h1 className="text-2xl font-bold mb-6">{isEditMode ? 'Edit Product' : 'Add Product'}</h1>

        <form onSubmit={submitHandler}>
          <div className="mb-4">
            <label className="block text-slate-300 text-sm font-bold mb-2" htmlFor="name">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-slate-300 text-sm font-bold mb-2" htmlFor="image">
              Product Image
            </label>

            {image && (
              <div className="relative mb-2">
                <img src={image} alt="Product preview" className="w-full h-40 object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={removeImageHandler}
                  aria-label="Remove image"
                  className="absolute top-2 right-2 bg-card/95 backdrop-blur rounded-full p-2 shadow hover:scale-110 transition"
                >
                  <FaTimes className="text-slate-400" />
                </button>
              </div>
            )}

            <input
              type="file"
              id="image"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={imageChangeHandler}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            {uploading && <p className="text-sm text-slate-400 mt-1">Uploading...</p>}
          </div>

          <div className="mb-4">
            <label className="block text-slate-300 text-sm font-bold mb-2" htmlFor="brand">
              Brand
            </label>
            <input
              type="text"
              id="brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-slate-300 text-sm font-bold mb-2" htmlFor="category">
              Category
            </label>
            <input
              type="text"
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-slate-300 text-sm font-bold mb-2" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-slate-300 text-sm font-bold mb-2" htmlFor="price">
                Price
              </label>
              <input
                type="number"
                id="price"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                required
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-bold mb-2" htmlFor="countInStock">
                Stock
              </label>
              <input
                type="number"
                id="countInStock"
                min="0"
                step="1"
                value={countInStock}
                onChange={(e) => setCountInStock(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || uploading}
            className="btn-primary w-full py-2.5 px-4"
          >
            {submitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Product'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProductEditScreen;
