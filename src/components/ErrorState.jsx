export default function ErrorState({ 
  title = 'Something went wrong',
  message = 'An error occurred while loading this content.',
  onRetry 
}) {
  return (
    <div className="error-state text-center py-5">
      <div className="error-state-icon mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--danger-color)' }}>
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h4 className="error-state-title">{title}</h4>
      <p className="error-state-message text-muted">{message}</p>
      {onRetry && (
        <button className="btn btn-outline-primary mt-3" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
}
