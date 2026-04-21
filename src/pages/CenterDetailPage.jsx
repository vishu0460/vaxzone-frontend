import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { publicAPI, reviewAPI, unwrapApiData } from '../api/client';
import Rating from '../components/Rating';
import Skeleton from '../components/Skeleton';

export default function CenterDetailPage() {
  const { id } = useParams();
  const [center, setCenter] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });

  useEffect(() => {
    fetchCenter();
    fetchReviews();
  }, [id]);

  const fetchCenter = async () => {
    try {
      const response = await publicAPI.getCenterDetail(id);
      setCenter(unwrapApiData(response));
    } catch (err) {
      console.error('Failed to fetch center:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await reviewAPI.getCenterReviews(id);
      setReviews(unwrapApiData(response) || []);
    } catch (err) {
      console.error('Failed to fetch reviews');
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    try {
      await reviewAPI.submitReview({
        centerId: Number(id),
        rating: reviewData.rating,
        comment: reviewData.comment
      });
      setShowReviewForm(false);
      setReviewData({ rating: 5, comment: '' });
      fetchReviews();
    } catch (err) {
      console.error('Failed to submit review');
    }
  };

  if (loading) {
    return (
      <div className="container py-5">
        <Skeleton height="500px" />
      </div>
    );
  }

  if (!center) {
    return <div className="container py-5">Center not found</div>;
  }

  return (
    <div className="container py-5">
      <div className="row">
        <div className="col-md-8">
          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <h2>{center.name}</h2>
              <p className="text-muted">
                {center.address}, {center.city}, {center.state} {center.pincode}
              </p>
              {center.rating && (
                <div className="mb-3">
                  <Rating value={Math.round(center.rating)} readonly size="lg" />
                  <span className="ms-2">({center.reviewCount || reviews.length} reviews)</span>
                </div>
              )}
              <hr />
              <div className="row">
                <div className="col-md-6">
                  <p><strong>Phone:</strong> {center.phone}</p>
                  <p><strong>Email:</strong> {center.email}</p>
                </div>
                <div className="col-md-6">
                  <p><strong>Working Hours:</strong> {center.workingHours}</p>
                  <p><strong>Daily Capacity:</strong> {center.dailyCapacity}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Reviews</h5>
              <button className="btn btn-sm btn-primary" onClick={() => setShowReviewForm(!showReviewForm)}>
                Write a Review
              </button>
            </div>
            <div className="card-body">
              {showReviewForm && (
                <form onSubmit={submitReview} className="mb-4 p-3 border rounded">
                  <div className="mb-3">
                    <label className="form-label">Rating</label>
                    <Rating value={reviewData.rating} onChange={(r) => setReviewData({ ...reviewData, rating: r })} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Comment</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={reviewData.comment}
                      onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                      required
                    ></textarea>
                  </div>
                  <button type="submit" className="btn btn-primary">Submit Review</button>
                </form>
              )}

              {reviews.length === 0 ? (
                <p className="text-muted">No reviews yet. Be the first to review!</p>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="border-bottom pb-3 mb-3">
                    <div className="d-flex justify-content-between">
                      <Rating value={review.rating} readonly size="sm" />
                      <small className="text-muted">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </small>
                    </div>
                    <p className="mt-2">{review.comment}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
