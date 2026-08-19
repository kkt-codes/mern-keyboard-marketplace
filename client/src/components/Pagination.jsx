/**
 * Numbered page buttons matching the ProductsScreen style. Renders nothing
 * when there's only one page, so callers can include it unconditionally.
 */
const Pagination = ({ page, pages, onPageChange, className = '' }) => {
  if (pages <= 1) return null;

  return (
    <div className={`flex flex-wrap justify-center gap-2 mt-6 ${className}`}>
      {[...Array(pages).keys()].map((x) => (
        <button
          key={x + 1}
          onClick={() => onPageChange(x + 1)}
          aria-current={page === x + 1 ? 'page' : undefined}
          className={`w-9 h-9 rounded-lg text-sm font-medium transition ${
            page === x + 1
              ? 'bg-violet-600 text-white shadow-[0_0_16px_rgba(139,92,246,0.4)]'
              : 'bg-card border border-line text-slate-300 hover:bg-card-2'
          }`}
        >
          {x + 1}
        </button>
      ))}
    </div>
  );
};

export default Pagination;
