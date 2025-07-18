import React from 'react';

const ActionItemCard = ({ title, description }) => (
  <div className="action-item-card">
    <b>{title}</b>
    <div>{description}</div>
  </div>
);

export default ActionItemCard; 