import React from 'react';

const DefinitionCard = ({ term, definition }) => (
  <div className="card definition-card">
    <div className="card-term">{term || <i>Unknown term</i>}</div>
    <div className="card-definition">{definition || <i>No definition</i>}</div>
  </div>
);

export default DefinitionCard; 