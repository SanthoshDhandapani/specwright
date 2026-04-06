interface Props {
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center" data-testid="error-message">
      <p className="mb-4 text-lg text-red-400">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700"
          data-testid="retry-button"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
