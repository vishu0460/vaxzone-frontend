import React from 'react';
import { Badge, Button, Table } from 'react-bootstrap';
import { FaClipboardList, FaShieldAlt } from 'react-icons/fa';
import Skeleton, { SkeletonTable } from '../Skeleton';

const formatDateTime = (value) => {
  if (!value) {
    return 'N/A';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'N/A' : parsed.toLocaleString();
};

const humanizeSystemMessage = (entry) => {
  const message = String(entry?.message || entry?.raw || '').trim();
  const userLabel = entry?.userEmail || 'An authenticated user';

  if (!message) {
    return 'System event recorded';
  }

  if (/authentication failed/i.test(message)) {
    return `${userLabel} had a failed login attempt`;
  }
  if (/account locked/i.test(message)) {
    return `${userLabel} triggered an account lock`;
  }
  if (/disabled account login attempt/i.test(message)) {
    return `${userLabel} tried to sign in while the account was disabled`;
  }
  if (/created/i.test(message)) {
    return `${userLabel} triggered a create event`;
  }
  if (/updated/i.test(message)) {
    return `${userLabel} triggered an update event`;
  }
  if (/deleted|soft deleted/i.test(message)) {
    return `${userLabel} triggered a delete event`;
  }

  const normalized = message.replace(/[_=]+/g, ' ').replace(/\s+/g, ' ').trim();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const levelBadge = (level) => {
  const normalized = String(level || 'INFO').toUpperCase();
  const variant = normalized === 'ERROR'
    ? 'danger'
    : normalized === 'WARN'
      ? 'warning'
      : normalized === 'DEBUG'
        ? 'secondary'
        : 'info';
  return <Badge bg={variant}>{normalized}</Badge>;
};

export default function LogsTable({
  entries,
  loading,
  mode = 'system',
  emptyMessage = 'No logs found for the selected filters.',
  hasMore,
  onLoadMore
}) {
  if (loading && (!entries || entries.length === 0)) {
    return (
      <div>
        <Skeleton height={72} borderRadius="16px" />
        <div className="mt-3">
          <SkeletonTable rows={5} columns={mode === 'security' ? 6 : 6} />
        </div>
      </div>
    );
  }

  return (
    <div className="logs-table-card">
      <div className="table-responsive">
        <Table hover className="mb-0 logs-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>{mode === 'security' ? 'Action' : 'Level'}</th>
              <th>Summary</th>
              <th>{mode === 'security' ? 'Actor' : 'Request'}</th>
              <th>{mode === 'security' ? 'Security Context' : 'User'}</th>
              <th>{mode === 'security' ? 'Resource' : 'Source'}</th>
            </tr>
          </thead>
          <tbody>
            {(!entries || entries.length === 0) ? (
              <tr>
                <td colSpan="6" className="text-center py-5">
                  {mode === 'security' ? <FaShieldAlt size={40} className="text-muted mb-3 d-block mx-auto" /> : <FaClipboardList size={40} className="text-muted mb-3 d-block mx-auto" />}
                  <p className="text-muted mb-0">{emptyMessage}</p>
                </td>
              </tr>
            ) : entries.map((entry, index) => (
              <tr key={entry.id || `${entry.timestamp || 'log'}-${index}`} className="logs-fade-in">
                <td className="ps-4 logs-table__time-cell">
                  <div className="fw-medium">{formatDateTime(entry.timestamp)}</div>
                  <small className="text-muted">{entry.source || entry.service || 'Backend'}</small>
                </td>
                <td className="logs-table__level-cell">{levelBadge(mode === 'security' ? entry.actionType : entry.level)}</td>
                <td className="logs-table__summary-cell" style={{ minWidth: '320px' }}>
                  <div className="fw-medium">{mode === 'security' ? entry.readableMessage : humanizeSystemMessage(entry)}</div>
                  <small className="text-muted d-block mt-1">{mode === 'security' ? entry.rawDetails : entry.message || entry.raw || 'N/A'}</small>
                  {entry.stackTrace ? (
                    <details className="mt-2">
                      <summary className="small text-muted">View stack trace</summary>
                      <pre className="mt-2 mb-0 p-2 bg-light border rounded small text-wrap" style={{ whiteSpace: 'pre-wrap', maxHeight: '10rem', overflow: 'auto' }}>
                        {entry.stackTrace}
                      </pre>
                    </details>
                  ) : null}
                </td>
                <td className="logs-table__context-cell">
                  {mode === 'security' ? (
                    <>
                      <div>{entry.actorName || 'System'}</div>
                      <small className="text-muted">{entry.actorRole || 'User'}</small>
                    </>
                  ) : (
                    <>
                      <div>{entry.httpMethod || 'N/A'} {entry.requestPath || ''}</div>
                      <small className="text-muted">requestId: {entry.requestId || 'N/A'}</small>
                    </>
                  )}
                </td>
                <td className="logs-table__user-cell">
                  {mode === 'security' ? (
                    <>
                      <div>{entry.userEmail || 'N/A'}</div>
                      <small className="text-muted">IP: {entry.ipAddress || 'N/A'}</small>
                    </>
                  ) : (
                    <>
                      <div>{entry.userEmail || 'Anonymous'}</div>
                      <small className="text-muted">userId: {entry.userId || 'N/A'}</small>
                    </>
                  )}
                </td>
                <td className="pe-4 logs-table__source-cell">
                  {mode === 'security' ? (
                    <>
                      <div>{entry.resource || 'AUTH'}</div>
                      <small className="text-muted">resourceId: {entry.resourceId || 'N/A'}</small>
                    </>
                  ) : (
                    <small className="text-muted">{entry.logger || entry.service || 'N/A'}</small>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {hasMore || loading ? (
        <div className="p-3 text-center border-top">
          <Button variant="outline-primary" onClick={onLoadMore} disabled={loading || !hasMore} style={{ borderRadius: '999px' }}>
            {loading ? 'Loading...' : hasMore ? 'Load Older Logs' : 'No More Logs'}
          </Button>
        </div>
      ) : entries?.length ? (
        <div className="p-3 text-center border-top text-muted small">
          No more logs
        </div>
      ) : null}
    </div>
  );
}
