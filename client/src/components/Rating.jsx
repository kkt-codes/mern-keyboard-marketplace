/**
 * Renders a 1-5 star rating, rounded to the nearest whole star.
 * `value` is expected to already be the average (Product.rating).
 */
const Rating = ({ value = 0, text, size = 'text-lg' }) => {
  const rounded = Math.round(value);

  return (
    <div className="flex items-center">
      <span className={`text-yellow-500 ${size}`} aria-label={`${value.toFixed(1)} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((star) => (star <= rounded ? '★' : '☆')).join('')}
      </span>
      {text && <span className="text-gray-600 ml-2 text-sm">{text}</span>}
    </div>
  );
};

export default Rating;
