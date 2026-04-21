import React from 'react';
import { Badge, Button } from 'react-bootstrap';
import { FaCheckCircle, FaEdit, FaExclamationTriangle, FaLock, FaPlusCircle, FaShieldAlt, FaSignInAlt, FaSignOutAlt, FaTrashAlt } from 'react-icons/fa';
import Skeleton, { SkeletonCard } from '../Skeleton';

const formatRelativeTime = (value) => {
  if (!value) {
    return 'Just now';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Just now';
  }

  const diffMs = Date.now() - parsed.getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes} min${diffMinutes === 1 ? '' : 's'} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }

  return parsed.toLocaleString();
};

const getTimelineIcon = (actionType) => {
  const normalized = String(actionType || '').toUpperCase();

  if (normalized === 'CREATE') {
    return <FaPlusCircle />;
  }
  if (normalized === 'UPDATE') {
    return <FaEdit />;
  }
  if (normalized === 'DELETE') {
    return <FaTrashAlt />;
  }
  if (normalized === 'LOGIN') {
    return <FaSignInAlt />;
  }
  if (normalized === 'LOGOUT') {
    return <FaSignOutAlt />;
  }
  if (normalized === 'ERROR') {
    return <FaExclamationTriangle />;
  }
  return <FaCheckCircle />;
};

const getTimelineTone = (actionType) => {
  const normalized = String(actionType || '').toUpperCase();

  if (normalized === 'DELETE' || normalized === 'ERROR') {
    return 'danger';
  }
  if (normalized === 'UPDATE') {
    return 'warning';
  }
  if (normalized === 'LOGIN' || normalized === 'LOGOUT') {
    return 'info';
  }
  return 'success';
};

export default function ActivityTimeline({
  entries,
  loading,
  emptyMessage = 'No activity found for the selected filters.',
  onLoadMore,
  hasMore
}) {
  if (loading && (!entries || entries.length === 0)) {
    return (
      <div>
        <Skeleton height={96} borderRadius="20px" />
        <div className="mt-3">
          <SkeletonCard count={3} height={120} />
        </div>
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="logs-empty-state">
        <FaShieldAlt size={34} className="mb-3 text-muted" />
        <p className="text-muted mb-0">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="activity-timeline">
      {entries.map((entry) => {
        const tone = getTimelineTone(entry.actionType);

        return (
          <article key={entry.id} className="activity-timeline__item logs-fade-in">
            <div className={`activity-timeline__icon activity-timeline__icon--${tone}`}>
              {getTimelineIcon(entry.actionType)}
            </div>
            <div className="activity-timeline__card">
              <div className="activity-timeline__meta">
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <Badge bg={tone}>{entry.actionType || 'INFO'}</Badge>
                  {entry.actorRole ? <Badge bg="light" text="dark">{entry.actorRole}</Badge> : null}
                  {entry.category === 'SECURITY' ? <Badge bg="dark">Security</Badge> : null}
                </div>
                <span className="text-muted small">{formatRelativeTime(entry.timestamp)}</span>
              </div>
              <h6 className="activity-timeline__title">{entry.readableMessage}</h6>
              <div className="activity-timeline__details">
                <span>{entry.actorName || 'System'}</span>
                {entry.userEmail ? <span>{entry.userEmail}</span> : null}
                {entry.ipAddress ? <span>IP {entry.ipAddress}</span> : null}
              </div>
              {entry.rawDetails ? (
                <p className="activity-timeline__note mb-0">{entry.rawDetails}</p>
              ) : null}
              {entry.actionType === 'ERROR' ? (
                <div className="activity-timeline__flag">
                  <FaLock />
                  <span>Needs attention</span>
                </div>
              ) : null}
            </div>
          </article>
        );
      })}

      {hasMore ? (
        <div className="text-center pt-2">
          <Button variant="outline-primary" onClick={onLoadMore} style={{ borderRadius: '999px' }}>
            Load older activity
          </Button>
        </div>
      ) : null}
    </div>
  );
}
