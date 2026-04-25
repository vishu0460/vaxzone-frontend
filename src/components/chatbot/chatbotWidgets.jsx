import React from "react";

export default function ChatbotWidgets({ widgets = [], onPrompt }) {
  if (!widgets.length) {
    return null;
  }

  return (
    <div className="vaxzone-chatbot__widgets">
      {widgets.map((widget) => (
        <section key={widget.id} className="vaxzone-chatbot__widget">
          <div className="vaxzone-chatbot__widget-topline">
            <strong>{widget.title}</strong>
            {widget.badge ? <span>{widget.badge}</span> : null}
          </div>
          {widget.text ? <p className="vaxzone-chatbot__widget-copy">{widget.text}</p> : null}
          {Array.isArray(widget.bars) ? (
            <div className="vaxzone-chatbot__widget-bars">
              {widget.bars.map((bar) => (
                <div key={`${widget.id}-${bar.label}`} className="vaxzone-chatbot__widget-bar-row">
                  <span>{bar.label}</span>
                  <div className="vaxzone-chatbot__widget-bar-track">
                    <div className="vaxzone-chatbot__widget-bar-fill" style={{ width: `${Math.max(8, Math.min(100, Number(bar.value) || 0))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {Array.isArray(widget.actions) ? (
            <div className="vaxzone-chatbot__widget-actions">
              {widget.actions.map((action) => (
                <button key={`${widget.id}-${action.label}`} type="button" onClick={() => onPrompt(action.prompt)}>
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}
