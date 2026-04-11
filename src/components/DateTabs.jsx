import React from 'react';
import '../styles/DateTabs.css';

const DateTabs = ({ dates = [], activeDateIndex, onDateChange }) => {
  if (!dates || dates.length === 0) return null;

  return (
    <div className="date-tabs-container">
      <div className="date-tabs">
        {dates.map((date, idx) => {
          const dateStr = new Date(date).toISOString().split('T')[0];
          const [year, month, day] = dateStr.split('-');
          return (
            <button
              key={idx}
              className={`date-tab ${activeDateIndex === idx ? 'active' : ''}`}
              onClick={() => onDateChange(idx)}
            >
              <span className="tab-year">{year}</span>
              <span className="tab-date">{month}-{day}</span>
            </button>
          );
        })}
        <button
          className={`date-tab total-tab ${activeDateIndex === 'total' ? 'active' : ''}`}
          onClick={() => onDateChange('total')}
        >
          <span className="total-text">Total</span>
        </button>
      </div>
    </div>
  );
};

export default DateTabs;
