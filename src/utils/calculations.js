export const getSeconds = (timeStr) => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  const s = parts[2] || 0;
  return h * 3600 + m * 60 + s;
};

export const formatTime = (totalSeconds, showSeconds = false) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  
  if (showSeconds) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const calculateTotalSeconds = (startTime, pigeonTimes, scoringCount = 0, helperCount = 0) => {
  const effectiveStartTime = startTime || '06:00';
  const startSeconds = getSeconds(effectiveStartTime);
  let totalSeconds = 0;

  const enteredTimes = (pigeonTimes || []).filter(t => t && t !== '');
  const shouldSkipHelpers = helperCount > 0 && scoringCount > 0 && enteredTimes.length >= scoringCount + helperCount;
  const helperSkips = shouldSkipHelpers ? helperCount : 0;
  const candidateTimes = enteredTimes.slice(helperSkips);
  const k = candidateTimes.length;
  const effectiveScoringCount = scoringCount > 0 ? scoringCount : k;
  const skip = Math.max(0, k - effectiveScoringCount);
  const scoringEntries = candidateTimes.slice(skip);

    scoringEntries.forEach((time) => {
      let landSeconds = getSeconds(time);
      if (landSeconds < startSeconds) {
        landSeconds += 24 * 3600;
      }
      const diff = landSeconds - startSeconds;
      if (diff > 0) totalSeconds += diff;
    });

    return totalSeconds;
};

export const calculateTotalTime = (startTime, pigeonTimes, scoringCount = 0, helperCount = 0) => {
  const totalSeconds = calculateTotalSeconds(startTime, pigeonTimes, scoringCount, helperCount);
    return formatTime(totalSeconds, true);
};

export const calculateGrandTotalSeconds = (pigeonTimes, pigeonsPerDay, startTime, numDays, scoringPigeons, helperPigeons = 0, participant = null) => {
    let totalSeconds = 0;
    for (let d = 0; d < numDays; d++) {
      const dayTimes = (pigeonTimes || []).slice(d * pigeonsPerDay, (d + 1) * pigeonsPerDay);
      // Use individual daily start time if available, otherwise participant overall start time, otherwise tournament start time
      const dayStartTime = (participant?.dailyStartTimes && participant.dailyStartTimes[d]) || participant?.startTime || startTime;
      totalSeconds += calculateTotalSeconds(dayStartTime, dayTimes, scoringPigeons, helperPigeons);
    }
    return totalSeconds;
};

export const calculateGrandTotal = (pigeonTimes, pigeonsPerDay, startTime, numDays, scoringPigeons, helperPigeons = 0, participant = null) => {
    const totalSeconds = calculateGrandTotalSeconds(pigeonTimes, pigeonsPerDay, startTime, numDays, scoringPigeons, helperPigeons, participant);
    return formatTime(totalSeconds, true);
};

export const calculateWinners = (participants, startTime, dateIndex = null, pigeonsPerDay = 0) => {
    let latestFirstElapsed = -1;
    let firstWinnerName = "";
    let firstLandTimeStr = "";
    let latestLastElapsed = -1;
    let lastWinnerName = "";
    let lastLandTimeStr = "";

    (participants || []).forEach(p => {
      // Determine the start time to use for this participant (and optionally for this day)
      const pStartTime = (dateIndex !== null && dateIndex !== 'total' && p.dailyStartTimes) 
        ? (p.dailyStartTimes[dateIndex] || p.startTime || startTime || '06:00')
        : (p.startTime || startTime || '06:00');
        
      const startSeconds = getSeconds(pStartTime);

      let relevantTimes = [];
      if (dateIndex !== null && dateIndex !== 'total') {
        relevantTimes = (p.pigeonTimes || []).slice(dateIndex * pigeonsPerDay, (dateIndex + 1) * pigeonsPerDay).filter(t => t && t !== '');
      } else {
        relevantTimes = (p.pigeonTimes || []).filter(t => t && t !== '');
      }
      
      if (relevantTimes.length > 0) {
        const firstTimeStr = relevantTimes[0];
        let firstLandSeconds = getSeconds(firstTimeStr);
        if (firstLandSeconds < startSeconds) firstLandSeconds += 24 * 3600;
        const firstElapsed = firstLandSeconds - startSeconds;
        
        if (firstElapsed > latestFirstElapsed) {
          latestFirstElapsed = firstElapsed;
          firstWinnerName = p.name;
          firstLandTimeStr = firstTimeStr;
        }

        const lastTimeStr = relevantTimes[relevantTimes.length - 1];
        let lastLandSeconds = getSeconds(lastTimeStr);
        if (lastLandSeconds < startSeconds) lastLandSeconds += 24 * 3600;
        const lastElapsed = lastLandSeconds - startSeconds;

        if (lastElapsed > latestLastElapsed) {
          latestLastElapsed = lastElapsed;
          lastWinnerName = p.name;
          lastLandTimeStr = lastTimeStr;
        }
      }
    });

    return { 
      firstWinner: firstWinnerName, 
      firstTime: latestFirstElapsed >= 0 ? firstLandTimeStr : "",
      lastWinner: lastWinnerName,
      lastTime: latestLastElapsed >= 0 ? lastLandTimeStr : ""
    };
};

