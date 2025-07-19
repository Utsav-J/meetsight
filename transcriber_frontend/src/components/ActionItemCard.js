import React from 'react';
import styles from './ActionItemCard.module.css';

const ActionItemCard = ({ title, description }) => (
  <div className={styles['action-item-card']}>
    <b>{title}</b>
    <div>{description}</div>
  </div>
);

export default ActionItemCard; 