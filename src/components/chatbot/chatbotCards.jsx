import React from "react";
import { maskSensitiveValue } from "./chatbotSecurity";

const renderValueLines = (items, privacyMode) =>
  items.map((item, index) => (
    <div className="vaxzone-chatbot__card-line" key={`${item.label}-${index}`}>
      <span>{item.label}</span>
      <strong>{maskSensitiveValue(item.label, item.value, privacyMode)}</strong>
    </div>
  ));

export function ChatbotCard({ card, onAction, privacyMode = false }) {
  const actionItems = Array.isArray(card.actions) ? card.actions : [];
  const metricItems = Array.isArray(card.metrics) ? card.metrics : [];
  const lineItems = Array.isArray(card.lines) ? card.lines : [];
  const tagItems = Array.isArray(card.tags) ? card.tags : [];
  const timelineItems = Array.isArray(card.timeline) ? card.timeline : [];

  return (
    <article className={`vaxzone-chatbot__card vaxzone-chatbot__card--${card.type || "record"}`}>
      <div className="vaxzone-chatbot__card-topline">
        <div className="vaxzone-chatbot__card-copy">
          {card.eyebrow ? <div className="vaxzone-chatbot__card-eyebrow">{card.eyebrow}</div> : null}
          {card.icon ? <div className="vaxzone-chatbot__card-icon"><i className={card.icon}></i></div> : null}
          <h4 className="vaxzone-chatbot__card-title">{card.title}</h4>
          {card.subtitle ? <p className="vaxzone-chatbot__card-subtitle">{card.subtitle}</p> : null}
        </div>
        {card.badge ? <span className="vaxzone-chatbot__card-badge">{card.badge}</span> : null}
      </div>

      {tagItems.length ? (
        <div className="vaxzone-chatbot__card-tags">
          {tagItems.map((tag, index) => <span className="vaxzone-chatbot__card-tag" key={`${card.id}-tag-${index}`}>{tag}</span>)}
        </div>
      ) : null}

      {metricItems.length ? (
        <div className="vaxzone-chatbot__stats-grid">
          {metricItems.map((metric) => (
            <div className="vaxzone-chatbot__stats-item" key={`${card.id}-${metric.label}`}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
          ))}
        </div>
      ) : null}

      {lineItems.length ? (
        <div className="vaxzone-chatbot__card-lines">
          {renderValueLines(lineItems, privacyMode)}
        </div>
      ) : null}

      {timelineItems.length ? (
        <div className="vaxzone-chatbot__timeline">
          {timelineItems.map((item, index) => (
            <div className={`vaxzone-chatbot__timeline-item ${item.active ? "is-active" : ""}`} key={`${card.id}-timeline-${index}`}>
              <span className="vaxzone-chatbot__timeline-dot" />
              <strong>{item.label}</strong>
            </div>
          ))}
        </div>
      ) : null}

      {actionItems.length ? (
        <div className="vaxzone-chatbot__card-actions">
          {actionItems.map((action, index) => (
            <button
              type="button"
              key={`${card.id}-action-${index}`}
              className={`vaxzone-chatbot__card-button ${index > 0 ? "is-secondary" : ""}`}
              onClick={() => onAction(action)}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export default ChatbotCard;
