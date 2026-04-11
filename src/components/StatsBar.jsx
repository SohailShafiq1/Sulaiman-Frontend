import React from 'react';
import '../styles/StatsBar.css';

const StatsBar = ({ tournament, dateIndex }) => {
  if (!tournament) return null;

  const participants = tournament.participants || [];
  const numPigeons = tournament.numPigeons || 0;
  const totalPigeonsPerDay = numPigeons;
  const totalDays = tournament.numDays || 1;

  const loftCount = participants.length;
  
  let totalPigeonsCount = 0;
  let landedCount = 0;
  let remainingCount = 0;

  let effectiveCurrentDay = typeof dateIndex === 'number' ? dateIndex : 0;
  if (dateIndex === 'total') {
    for (let d = totalDays - 1; d >= 0; d--) {
      const hasData = participants.some(p => {
        const dayTimes = (p.pigeonTimes || []).slice(d * totalPigeonsPerDay, (d + 1) * totalPigeonsPerDay);
        return dayTimes.some(t => t && t.trim() !== '' && t !== '-');
      });
      if (hasData) {
        effectiveCurrentDay = d;
        break;
      }
    }
  }

  participants.forEach(p => {
    const times = p.pigeonTimes || [];
    for (let i = 0; i < numPigeons; i++) {
        const tToday = times[effectiveCurrentDay * totalPigeonsPerDay + i];
        if (tToday && tToday.trim() !== '' && tToday !== '-') {
          landedCount++;
        } else {
          remainingCount++;
        }
    }
  });

  totalPigeonsCount = landedCount + remainingCount;

  if (dateIndex === 'total') {
    totalPigeonsCount = participants.length * numPigeons * totalDays;
    let totalLanded = 0;
    participants.forEach(p => {
      totalLanded += (p.pigeonTimes || []).filter((t, idx) => {
        const pIdx = idx % totalPigeonsPerDay;
        return pIdx < numPigeons && t && t.trim() !== '' && t !== '-';
      }).length;
    });
    landedCount = totalLanded;
    remainingCount = totalPigeonsCount - landedCount; 
  }

  const formatDisplayTime = (timeStr) => {
    if (!timeStr) return '-';
    const parts = timeStr.split(':');
    return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : timeStr;
  };

  return (
    <div className="stats-container">
      
      <p className="tournament-name">{tournament.name}</p>
      <p className="start-time">Start time : {formatDisplayTime(tournament.startTime)}</p>
      
      <div className="stats-box">
        <div className="stats-row">
          Lofts: {loftCount}, Total pigeons: {totalPigeonsCount}, Pigeons landed: {landedCount}, Pigeons remaining: {remainingCount}
        </div>
      </div>
    </div>
  );
};

export default StatsBar;
