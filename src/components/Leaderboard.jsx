import React from 'react';
import '../styles/Leaderboard.css';
import {
  calculateTotalTime,
  calculateGrandTotal,
  calculateWinners,
  calculateTotalSeconds,
  calculateGrandTotalSeconds
} from '../utils/calculations';

const Leaderboard = ({ tournament, dateIndex }) => {
  if (!tournament) return null;

  const { participants = [], startTime, numPigeons, numDays } = tournament;
  const pigeonsPerDay = numPigeons || 0;
  const scoringPigeons = tournament.noteTimePigeons || numPigeons || 0;
  const helperPigeons = tournament.helperPigeons || 0;

  // Helper to show HH:MM:SS strings
  const formatDisplayTime = (timeStr) => {
    if (!timeStr || timeStr === '-') return '-';
    return timeStr;
  };

  const formatPlayerName = (name) => {
    if (!name) return "";
    const words = name.split(/\s+/);
    if (words.length <= 3) return name;

    // Split long names ensuring at least 2 words per line
    const midpoint = Math.ceil(words.length / 2);
    const firstPart = words.slice(0, midpoint).join(' ');
    const secondPart = words.slice(midpoint).join(' ');
    return (
      <>
        {firstPart}
        <br />
        <span style={{ fontSize: '0.85em', opacity: 0.9 }}>{secondPart}</span>
      </>
    );
  };

  // Sorting: If total view, sort by Grand Total Seconds. If day view, sort by Daily Total Seconds.
  const sortedParticipants = [...participants].sort((a, b) => {
    let aSecs, bSecs;
    if (dateIndex === 'total') {
      aSecs = calculateGrandTotalSeconds(a.pigeonTimes, pigeonsPerDay, startTime, numDays, scoringPigeons, helperPigeons, a);
      bSecs = calculateGrandTotalSeconds(b.pigeonTimes, pigeonsPerDay, startTime, numDays, scoringPigeons, helperPigeons, b);
    } else {
      const aDayTimes = (a.pigeonTimes || []).slice(dateIndex * pigeonsPerDay, (dateIndex + 1) * pigeonsPerDay);
      const bDayTimes = (b.pigeonTimes || []).slice(dateIndex * pigeonsPerDay, (dateIndex + 1) * pigeonsPerDay);
      const aDayStartTime = (a.dailyStartTimes && a.dailyStartTimes[dateIndex]) || a.startTime || startTime;
      const bDayStartTime = (b.dailyStartTimes && b.dailyStartTimes[dateIndex]) || b.startTime || startTime;
      aSecs = calculateTotalSeconds(aDayStartTime, aDayTimes, scoringPigeons, helperPigeons);
      bSecs = calculateTotalSeconds(bDayStartTime, bDayTimes, scoringPigeons, helperPigeons);
    }
    // Sort descending (longer time is better)
    return bSecs - aSecs;
  });

  const winners = calculateWinners(participants, startTime, dateIndex, pigeonsPerDay);

  return (
    <div className="leaderboard-container">
      {(winners.firstWinner || winners.lastWinner) && (
        <div className="winners-banner">
          {winners.firstWinner && (
            <div className="winner-tag first">
              <span className="label">{dateIndex === 'total' ? 'Overall First Winner' : `Day ${dateIndex + 1} First Winner`}</span>
              <span className="name">
                {winners.firstWinner} {winners.firstTime && `- ${winners.firstTime}`}
              </span>
            </div>
          )}
          {winners.lastWinner && (
            <div className="winner-tag last">
              <span className="label">{dateIndex === 'total' ? 'Overall Last Winner' : `Day ${dateIndex + 1} Last Winner`}</span>
              <span className="name">
                {winners.lastWinner} {winners.lastTime && `- ${winners.lastTime}`}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="table-responsive">
        <table className={`leaderboard-table ${dateIndex === 'total' ? 'total-view' : 'day-view'}`}>
          <thead>
            <tr>
              <th>Sr</th>
              <th>Name</th>
              {dateIndex === 'total' && <th>Piegon</th>}
              {dateIndex !== 'total' && <th>Start</th>}
              {dateIndex !== 'total' ? (
                [...Array(pigeonsPerDay)].map((_, i) => (
                  <th key={i}>P{i + 1}</th>
                ))
              ) : (
                tournament.flyingDates.map((_, idx) => (
                  <th key={idx}>Day {idx + 1}</th>
                ))
              )}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {sortedParticipants.map((p, idx) => (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td className="name-cell">
                  <div className="player-info">
                    <img loading="lazy" src={p.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random`} alt="" className="player-img" />
                    <span>{formatPlayerName(p.name)}</span>
                  </div>
                </td>
                {dateIndex === 'total' && (
                  <td className="piegon-cell">
                    {(p.pigeonTimes || []).filter(t => t && t !== '').length}
                  </td>
                )}
                {dateIndex !== 'total' && <td>{formatDisplayTime((p.dailyStartTimes && p.dailyStartTimes[dateIndex]) || p.startTime || startTime)}</td>}
                {dateIndex !== 'total' ? (
                  [...Array(pigeonsPerDay)].map((_, pIdx) => {
                    const time = p.pigeonTimes[dateIndex * pigeonsPerDay + pIdx];

                    // Logic for blinking winning time
                    let cellClass = "";
                    if (time && time !== '-' && dateIndex !== 'total') {
                      const dayTimes = p.pigeonTimes.slice(dateIndex * pigeonsPerDay, (dateIndex + 1) * pigeonsPerDay).filter(t => t && t !== '');
                      const isLast = time === dayTimes[dayTimes.length - 1];

                      if (isLast && p.name === winners.lastWinner && time === winners.lastTime) {
                        cellClass = "winning-time-cell";
                      }
                    }

                    return <td key={pIdx} className={cellClass}>{formatDisplayTime(time)}</td>;
                  })
                ) : (
                  tournament.flyingDates.map((_, dIdx) => {
                    const dayStartTime = (p.dailyStartTimes && p.dailyStartTimes[dIdx]) || p.startTime || startTime;
                    return (
                      <td key={dIdx}>
                        {calculateTotalTime(dayStartTime, p.pigeonTimes.slice(dIdx * pigeonsPerDay, (dIdx + 1) * pigeonsPerDay), scoringPigeons, helperPigeons)}
                      </td>
                    );
                  })
                )}
                <td className="total-cell">
                  {dateIndex === 'total'
                    ? calculateGrandTotal(p.pigeonTimes, pigeonsPerDay, startTime, numDays, scoringPigeons, helperPigeons, p)
                    : calculateTotalTime(
                      (p.dailyStartTimes && p.dailyStartTimes[dateIndex]) || p.startTime || startTime,
                      p.pigeonTimes.slice(dateIndex * pigeonsPerDay, (dateIndex + 1) * pigeonsPerDay),
                      scoringPigeons,
                      helperPigeons
                    )
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Leaderboard;
