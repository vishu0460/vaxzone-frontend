import React, { useState } from 'react';

const STARS = [1, 2, 3, 4, 5];

export default function Rating({ value = 0, onChange, readonly = false, size = 'md' }) {
  const [hover, setHover] = useState(0);

  const sizes = {
    sm: '16px',
    md: '24px',
    lg: '32px'
  };

  const starSize = sizes[size] || sizes.md;

  return (
    <div className="rating">
      {STARS.map((star) => (
        <span
          key={star}
          className={`star ${star <= (hover || value) ? 'filled' : ''} ${!readonly ? 'clickable' : ''}`}
          style={{
            fontSize: starSize,
            cursor: readonly ? 'default' : 'pointer',
            color: star <= (hover || value) ? 'var(--star-filled)' : 'var(--star-empty)',
            transition: 'color 0.2s'
          }}
          onClick={() => !readonly && onChange && onChange(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
        >
          &#9733;
        </span>
      ))}
    </div>
  );
}
