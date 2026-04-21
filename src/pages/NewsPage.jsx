import React, { useEffect, useMemo, useState } from 'react';
import { newsAPI, unwrapApiData } from '../api/client';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import SearchInput from '../components/SearchInput';
import Modal from '../components/ui/Modal';
import { DEFAULT_VISIBLE_COUNT, getDisplayedItems, matchesSmartSearch, shouldShowViewMore } from '../utils/listSearch';

export default function NewsPage() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNews, setSelectedNews] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [visibleCount, setVisibleCount] = useState(DEFAULT_VISIBLE_COUNT);

  const formatNewsDate = (item) => {
    const value = item?.publishedAt || item?.updatedAt || item?.createdAt;
    if (!value) {
      return "";
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleDateString();
  };

  useEffect(() => {
    fetchNews();
  }, []);

  useEffect(() => {
    const handleDataUpdated = () => {
      fetchNews();
    };

    window.addEventListener('vaxzone:data-updated', handleDataUpdated);
    return () => window.removeEventListener('vaxzone:data-updated', handleDataUpdated);
  }, []);

  const fetchNews = async () => {
    try {
      const response = await newsAPI.getAllNews(0, 20);
      const payload = unwrapApiData(response) || [];
      setNews(Array.isArray(payload) ? payload : []);
    } catch (err) {
      console.error('Failed to fetch news');
      setNews([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredNews = useMemo(() => news.filter((item) =>
    matchesSmartSearch(item, search)
      && (!category || item.category === category)
  ), [news, search, category]);

  const displayedNews = useMemo(
    () => getDisplayedItems(filteredNews, search, visibleCount),
    [filteredNews, search, visibleCount]
  );

  if (loading) {
    return (
      <div className="container py-5">
        <div className="row">
          {[1, 2, 3].map((i) => (
            <div key={i} className="col-md-4 mb-4">
              <Skeleton height="250px" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="container py-5">
        <EmptyState
          title="No News Available"
          description="Check back later for updates and announcements."
        />
      </div>
    );
  }

  return (
    <div className="container py-5">
      <h2 className="mb-4">Latest News & Announcements</h2>
      <div className="row g-3 mb-4">
        <div className="col-lg-8">
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setVisibleCount(DEFAULT_VISIBLE_COUNT);
            }}
            placeholder="Search news by title, content, or category"
            icon="search"
            onClear={() => {
              setSearch('');
              setVisibleCount(DEFAULT_VISIBLE_COUNT);
            }}
          />
        </div>
        <div className="col-lg-4">
          <select
            className="form-select"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setVisibleCount(DEFAULT_VISIBLE_COUNT);
            }}
          >
            <option value="">All categories</option>
            {[...new Set(news.map((item) => item.category).filter(Boolean))].sort().map((itemCategory) => (
              <option key={itemCategory} value={itemCategory}>{itemCategory}</option>
            ))}
          </select>
        </div>
      </div>
      {filteredNews.length === 0 ? (
        <EmptyState
          title="No Results Found"
          description="Try a different search or filter."
        />
      ) : (
      <>
      <div className="row">
        {displayedNews.map((item) => (
          <div key={item.id} className="col-md-4 mb-4">
            <div className="card h-100 shadow-sm news-card" onClick={() => setSelectedNews(item)}>
              {item.imageUrl && (
                <img src={item.imageUrl} className="card-img-top" alt={item.title} style={{ height: '180px', objectFit: 'cover' }} />
              )}
              <div className="card-body">
                <span className="badge bg-primary mb-2">{item.category}</span>
                <h5 className="card-title">{item.title}</h5>
                <p className="card-text text-muted">{item.content?.substring(0, 100)}...</p>
                <small className="text-muted">
                  {item.createdAt ? new Date(item.createdAt).toLocaleString() : formatNewsDate(item)}
                </small>
              </div>
            </div>
          </div>
        ))}
      </div>
      {shouldShowViewMore(filteredNews, search, visibleCount) ? (
        <div className="text-center mt-2">
          <button className="btn btn-outline-primary" onClick={() => setVisibleCount((current) => current + DEFAULT_VISIBLE_COUNT)}>
            View More
          </button>
        </div>
      ) : null}
      </>
      )}

      {selectedNews && (
        <Modal show={Boolean(selectedNews)} onHide={() => setSelectedNews(null)} size="lg" centered>
          <Modal.Header closeButton>
            <Modal.Title>{selectedNews.title}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedNews.imageUrl && (
              <img src={selectedNews.imageUrl} className="img-fluid mb-3 rounded-4" alt={selectedNews.title} />
            )}
            <p>{selectedNews.content}</p>
            <small className="text-muted">
              Published: {selectedNews.createdAt ? new Date(selectedNews.createdAt).toLocaleString() : formatNewsDate(selectedNews)}
            </small>
          </Modal.Body>
        </Modal>
      )}
    </div>
  );
}
