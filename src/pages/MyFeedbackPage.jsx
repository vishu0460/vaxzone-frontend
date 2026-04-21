import React, { useEffect, useMemo, useState } from 'react';
import { Container, Row, Col, Card, Badge, Spinner, Alert, Button } from 'react-bootstrap';
import { feedbackAPI, unwrapApiData } from '../api/client';
import SearchInput from '../components/SearchInput';
import { DEFAULT_VISIBLE_COUNT, getDisplayedItems, matchesSmartSearch, shouldShowViewMore } from '../utils/listSearch';

export default function MyFeedbackPage() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [visibleCount, setVisibleCount] = useState(DEFAULT_VISIBLE_COUNT);

  useEffect(() => {
    fetchMyFeedback();
  }, []);

  const fetchMyFeedback = async () => {
    try {
      setLoading(true);
      const response = await feedbackAPI.getMyFeedback();
      setFeedback(unwrapApiData(response) || []);
    } catch (err) {
      setError('Failed to load feedback. Please try again.');
      console.error('Error fetching feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      PENDING: 'warning',
      REPLIED: 'success',
      CLOSED: 'secondary'
    };
    return <Badge bg={colors[status] || 'secondary'}>{status || 'PENDING'}</Badge>;
  };

  const filteredFeedback = useMemo(() => feedback.filter((item) =>
    matchesSmartSearch(item, search) && (!statusFilter || item.status === statusFilter)
  ), [feedback, search, statusFilter]);

  const displayedFeedback = useMemo(
    () => getDisplayedItems(filteredFeedback, search, visibleCount),
    [filteredFeedback, search, visibleCount]
  );

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading your feedback...</p>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <h2 className="mb-4">My Feedback & Responses</h2>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      {feedback.length === 0 ? (
        <Card>
          <Card.Body className="text-center py-5">
            <h4>No Feedback Submitted</h4>
            <p className="text-muted">You haven't submitted any feedback yet.</p>
            <Button variant="primary" href="/feedback">Submit Feedback</Button>
          </Card.Body>
        </Card>
      ) : (
        <>
        <div className="row g-3 mb-4">
          <div className="col-lg-8">
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                setVisibleCount(DEFAULT_VISIBLE_COUNT);
              }}
              placeholder="Search feedback by subject, message, or reply"
              icon="search"
              onClear={() => {
                setSearch('');
                setVisibleCount(DEFAULT_VISIBLE_COUNT);
              }}
            />
          </div>
          <div className="col-lg-4">
            <select className="form-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All statuses</option>
              {[...new Set(feedback.map((item) => item.status).filter(Boolean))].sort().map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>
        {filteredFeedback.length === 0 ? (
          <Card>
            <Card.Body className="text-center py-5">
              <h4>No Results Found</h4>
              <p className="text-muted mb-0">Try a different search or filter.</p>
            </Card.Body>
          </Card>
        ) : (
        <Row>
          {displayedFeedback.map((item) => (
            <Col key={item.id} md={6} className="mb-3">
              <Card className="h-100">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <span>Feedback #{item.id}</span>
                  {getStatusBadge(item.status)}
                </Card.Header>
                <Card.Body>
                  <Card.Title>{item.subject}</Card.Title>
                  <Card.Text>{item.message}</Card.Text>
                  
                  {(item.replyMessage || item.response) && (
                    <div className="mt-3 p-3 bg-light rounded">
                      <h6 className="text-success">Admin Response:</h6>
                      <p className="mb-0">{item.replyMessage || item.response}</p>
                    </div>
                  )}
                  
                  <small className="text-muted d-block mt-2">
                    Submitted: {new Date(item.createdAt).toLocaleDateString()}
                  </small>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
        )}
        {shouldShowViewMore(filteredFeedback, search, visibleCount) ? (
          <div className="text-center mt-3">
            <Button variant="outline-primary" onClick={() => setVisibleCount((current) => current + DEFAULT_VISIBLE_COUNT)}>
              View More
            </Button>
          </div>
        ) : null}
        </>
      )}
    </Container>
  );
}
