import React from 'react';
import './InfoModal.css';

const difficultyLevels = [
  {
    level: 'Basic',
    color: '#a6ffb5',
    description: 'Foundational concepts that are easy to understand and require no prior technical knowledge.',
  },
  {
    level: 'Intermediate',
    color: '#feffa8',
    description: 'Moderately complex concepts that assume some familiarity with the subject.',
  },
  {
    level: 'Advanced',
    color: '#ffdca8',
    description: 'In-depth technical concepts that require solid prior knowledge and understanding.',
  },
  {
    level: 'Expert',
    color: '#ffc2a8',
    description: 'Highly specialized or complex concepts intended for experienced professionals or subject matter experts.',
  },
];


export default function InfoModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="info-modal-overlay">
      <div className="info-modal glass info-modal-gap">
        <button className="info-modal-close" onClick={onClose}>&times;</button>
        <h3>Difficulty Levels & Colors</h3>
        <table className="info-table">
          <thead>
            <tr>
              <th>Color</th>
              <th>Level</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {difficultyLevels.map(({ level, color, description }) => (
              <tr key={level}>
                <td><span className="color-dot" style={{ background: color }}></span></td>
                <td><b>{level}</b></td>
                <td>{description}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3>How the App Works</h3>
        <ol>
          <li>Start recording your meeting.</li>
          <li>The app transcribes speech and extracts technical terms in real time.</li>
          <li>Definitions and contextual explanations appear in the left and middle columns.</li>
          <li>Action items are suggested in the right column.</li>
        </ol>
      </div>
    </div>
  );
} 