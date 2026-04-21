export default function EmptyState({ 
  icon, 
  title, 
  description, 
  actionText, 
  onAction 
}) {
  return (
    <div className="empty-state text-center py-5">
      {icon && <div className="empty-state-icon mb-3">{icon}</div>}
      <h4 className="empty-state-title">{title}</h4>
      {description && <p className="empty-state-description text-muted">{description}</p>}
      {actionText && onAction && (
        <button className="btn btn-primary mt-3" onClick={onAction}>
          {actionText}
        </button>
      )}
    </div>
  );
}
