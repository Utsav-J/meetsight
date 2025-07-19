import React from 'react';
import styles from './ContextCard.module.css';

// Map difficulty (1-4) to color
const difficultyColor = {
  1: '#a6ffb5',    // green
  2: '#feffa8',    // yellow
  3: '#ffdca8',    // orange
  4: '#ffc2a8',    // red
};

const ContextCard = ({ term, contextual_explanation, example_quote, difficulty }) => (
  <div
    className={styles.card + ' ' + styles['context-card']}
    style={{ backgroundColor: difficultyColor[difficulty] || '#fff' }}
  >
    <div className={styles['card-term']}>{term || <i>Unknown term</i>}</div>
    <div className={styles['card-context']}>{contextual_explanation || <i>No context</i>}</div>
    {example_quote && <div className={styles['card-example']}><b>Example:</b> "{example_quote}"</div>}
  </div>
);

export default ContextCard; 