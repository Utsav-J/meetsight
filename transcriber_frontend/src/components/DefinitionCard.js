import React from 'react';
import styles from './DefinitionCard.module.css';

// Map difficulty (1-4) to color
const difficultyColor = {
  1: '#a6ffb5',    // green
  2: '#feffa8',    // yellow
  3: '#ffdca8',    // orange
  4: '#ffc2a8',    // red
};

const DefinitionCard = ({ term, definition, difficulty }) => (
  <div
    className={styles.card + ' ' + styles['definition-card']}
    style={{ backgroundColor: difficultyColor[difficulty] || '#fff' }}
  >
    <div className={styles['card-term']}>{term || <i>Unknown term</i>}</div>
    <div className={styles['card-definition']}>{definition || <i>No definition</i>}</div>
  </div>
);

export default DefinitionCard; 