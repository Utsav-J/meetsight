import React from 'react';

const ContextCard = ({ term, contextual_explanation, example_quote }) => (
  <div className="card context-card">
    <div className="card-term">{term || <i>Unknown term</i>}</div>
    <div className="card-context">{contextual_explanation || <i>No context</i>}</div>
    {example_quote && <div className="card-example"><b>Example:</b> "{example_quote}"</div>}
  </div>
);

export default ContextCard; 