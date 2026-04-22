import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Container, Row, Col, Card, Badge, Alert, Button, Form } from 'react-bootstrap';
import { contactAPI, getErrorMessage, unwrapApiData, userAPI } from '../api/client';
import SearchInput from '../components/SearchInput';
import { SkeletonHistoryCards } from '../components/Skeleton';
import { DEFAULT_VISIBLE_COUNT, getDisplayedItems, matchesSmartSearch, shouldShowViewMore } from '../utils/listSearch';

const notifyDataUpdated = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vaxzone:data-updated'));
  }
};

export default function MyContactPage() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [visibleCount, setVisibleCount] = useState(DEFAULT_VISIBLE_COUNT);
  const requestInFlight = useRef(false);

  const fetchMyContacts = useCallback(async (nextUserId, options = {}) => {
    const { silent = false } = options;
    if (requestInFlight.current) {
      return;
    }
    requestInFlight.current = true;
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      if (!nextUserId) {
        const fallbackResponse = await contactAPI.getMyInquiries();
        setContacts(unwrapApiData(fallbackResponse) || []);
        return;
      }
      const response = await contactAPI.getUserHistory(nextUserId);
      setContacts(unwrapApiData(response) || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load your inquiries.'));
      setContacts([]);
    } finally {
      requestInFlight.current = false;
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const loadUserAndHistory = async () => {
      try {
        const response = await userAPI.getProfile();
        const nextProfile = unwrapApiData(response);
        const nextUserId = nextProfile?.id || null;
        setProfile(nextProfile || null);
        setUserId(nextUserId);
        setFormData((current) => ({
          ...current,
          name: current.name || nextProfile?.fullName || '',
          email: current.email || nextProfile?.email || ''
        }));
        await fetchMyContacts(nextUserId);
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load your profile.'));
        setLoading(false);
      }
    };

    loadUserAndHistory();
  }, [fetchMyContacts]);

  useEffect(() => {
    const handleDataUpdated = () => {
      fetchMyContacts(userId, { silent: true });
    };

    const handleFocus = () => {
      fetchMyContacts(userId, { silent: true });
    };

    const intervalId = window.setInterval(() => fetchMyContacts(userId, { silent: true }), 30000);
    window.addEventListener('vaxzone:data-updated', handleDataUpdated);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('vaxzone:data-updated', handleDataUpdated);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchMyContacts, userId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    
    try {
      await contactAPI.submitContact(formData);
      setSuccess('Your inquiry has been submitted successfully!');
      setShowForm(false);
      setFormData({
        name: profile?.fullName || '',
        email: profile?.email || '',
        subject: '',
        message: ''
      });
      notifyDataUpdated();
      await fetchMyContacts(userId);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to submit inquiry. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      PENDING: 'warning',
      REPLIED: 'success',
      CLOSED: 'secondary'
    };
    return <Badge bg={colors[status] || 'secondary'}>{status}</Badge>;
  };

  const filteredContacts = useMemo(() => contacts.filter((item) =>
    matchesSmartSearch(item, search) && (!statusFilter || item.status === statusFilter)
  ), [contacts, search, statusFilter]);

  const displayedContacts = useMemo(
    () => getDisplayedItems(filteredContacts, search, visibleCount),
    [filteredContacts, search, visibleCount]
  );

  if (loading) {
    return (
      <Container className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>Contact History</h2>
          <Button variant="primary" disabled>New Inquiry</Button>
        </div>
        <SkeletonHistoryCards />
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Contact History</h2>
        <Button variant="primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'New Inquiry'}
        </Button>
      </div>
      
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}
      
      {showForm && (
        <Card className="mb-4">
          <Card.Header>Submit New Inquiry</Card.Header>
          <Card.Body>
            <Form onSubmit={handleSubmit}>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Name</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group className="mb-3">
                <Form.Label>Subject</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Message</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  required
                />
              </Form.Group>
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Inquiry'}
              </Button>
            </Form>
          </Card.Body>
        </Card>
      )}
      
      {contacts.length === 0 && !showForm ? (
        <Card>
          <Card.Body className="text-center py-5">
            <h4>No Contact History Yet</h4>
            <p className="text-muted">Your submitted inquiries will appear here with dates and reply status.</p>
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
              placeholder="Search inquiries by subject, message, or reply"
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
              {[...new Set(contacts.map((item) => item.status).filter(Boolean))].sort().map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>
        {filteredContacts.length === 0 ? (
          <Card>
            <Card.Body className="text-center py-5">
              <h4>No Results Found</h4>
              <p className="text-muted mb-0">Try a different search or filter.</p>
            </Card.Body>
          </Card>
        ) : (
        <Row>
          {displayedContacts.map((item) => (
            <Col key={item.id} md={6} className="mb-3">
              <Card className="h-100">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <span>{item.subject}</span>
                  {getStatusBadge(item.status)}
                </Card.Header>
                <Card.Body>
                  <Card.Text>{item.message}</Card.Text>
                  
                  {(item.replyMessage || item.response) && (
                    <div className="mt-3 p-3 bg-light rounded">
                      <h6 className="text-success">Admin Reply:</h6>
                      <p className="mb-0">{item.replyMessage || item.response}</p>
                    </div>
                  )}
                  
                  <small className="text-muted d-block mt-2">
                    Submitted: {new Date(item.createdAt).toLocaleString()}
                  </small>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
        )}
        {shouldShowViewMore(filteredContacts, search, visibleCount) ? (
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
