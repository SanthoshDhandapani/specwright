const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 4 }, (_, i) => CURRENT_YEAR - i);

interface Props {
  selectedYear: number;
  onYearChange: (year: number) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function YearPagination({ selectedYear, onYearChange, page, totalPages, onPageChange }: Props) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Year tabs */}
      <div data-testid="year-pagination" className="flex gap-2">
        {YEARS.map((year) => (
          <button
            key={year}
            onClick={() => onYearChange(year)}
            data-testid={`year-tab-${year}`}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              selectedYear === year
                ? 'bg-brand-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Page navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          data-testid="page-prev"
          className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← Prev
        </button>
        <span data-testid="page-indicator" className="text-sm text-gray-400">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          data-testid="page-next"
          className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
