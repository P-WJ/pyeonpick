interface LoadingSpinnerProps {
  className?: string;
}

export function LoadingSpinner({ className = "" }: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center py-8 ${className}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
    </div>
  );
}
