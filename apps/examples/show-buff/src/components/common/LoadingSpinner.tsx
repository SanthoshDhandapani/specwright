export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20" data-testid="loading-spinner">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
    </div>
  );
}
