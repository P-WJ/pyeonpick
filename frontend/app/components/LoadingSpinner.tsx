interface LoadingSpinnerProps {
  className?: string;
}

export function LoadingSpinner({ className = "" }: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center py-8 ${className}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-100 border-t-gray-400" />
    </div>
  );
}
