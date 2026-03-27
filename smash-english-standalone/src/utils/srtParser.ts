
export interface SubtitleItem {
  id: number;
  startTime: number; // in seconds
  endTime: number;   // in seconds
  text: string;
}

/**
 * Parses a time string (HH:MM:SS,mmm) into seconds
 */
const parseTime = (timeString: string): number => {
  if (!timeString) return 0;
  
  const [time, ms] = timeString.split(',');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  
  return (hours * 3600) + (minutes * 60) + seconds + (parseInt(ms) / 1000);
};

/**
 * Parses SRT content into structured subtitle items
 */
export const parseSRT = (content: string): SubtitleItem[] => {
  // Normalize line endings and split by double newlines
  const entries = content.replace(/\r\n/g, '\n').trim().split('\n\n');
  
  const subtitles: SubtitleItem[] = [];
  
  entries.forEach((entry) => {
    const lines = entry.split('\n');
    
    // Minimum valid entry is ID, timestamp, and text
    if (lines.length < 3) return;
    
    const id = parseInt(lines[0]);
    if (isNaN(id)) return;
    
    const timeLine = lines[1];
    if (!timeLine.includes('-->')) return;
    
    const [startStr, endStr] = timeLine.split(' --> ');
    const startTime = parseTime(startStr);
    const endTime = parseTime(endStr);
    
    // Join remaining lines as text
    const text = lines.slice(2).join(' '); // Join with space instead of newline for better flow
    
    subtitles.push({
      id,
      startTime,
      endTime,
      text
    });
  });
  
  return subtitles;
};

/**
 * Re-segments subtitles based on sentence endings (. ? !).
 * Interpolates timestamps for split sentences.
 */
export const optimizeSubtitles = (subtitles: SubtitleItem[]): SubtitleItem[] => {
  if (subtitles.length === 0) return [];

  // 1. Flatten into a character stream with timestamps
  type CharData = { char: string; startTime: number; endTime: number };
  const charStream: CharData[] = [];

  subtitles.forEach(sub => {
    const cleanText = sub.text.trim();
    if (!cleanText) return;

    const duration = sub.endTime - sub.startTime;
    const charDuration = duration / cleanText.length;

    for (let i = 0; i < cleanText.length; i++) {
        // Handle consecutive spaces: don't double count duration if we skip them mentally? 
        // No, keep simple linear interpolation.
      charStream.push({
        char: cleanText[i],
        startTime: sub.startTime + (i * charDuration),
        endTime: sub.startTime + ((i + 1) * charDuration)
      });
    }
    // Add a ghost space between subtitles if not present, to separate words
    // But don't assign time duration to it that shifts future subtitles.
    // Actually, usually there is a time gap.
    // We will just handle the text concatenation logic below.
    charStream.push({ char: ' ', startTime: sub.endTime, endTime: sub.endTime }); 
  });

  // 2. Group by sentences
  const newSubtitles: SubtitleItem[] = [];
  let currentSentenceChars: CharData[] = [];
  let currentId = 1;

  for (let i = 0; i < charStream.length; i++) {
    const c = charStream[i];
    currentSentenceChars.push(c);

    // Check for sentence endings
    // We look for . ? ! followed by space or end of stream
    // Also include quotes if they follow punctuation: "Hello." -> end
    const isEndChar = ['.', '?', '!'].includes(c.char);
    
    if (isEndChar) {
       // Look ahead to see if it's really the end (e.g. followed by space or quote then space)
       let isSentenceEnd = false;
       
       // Handle cases like "..."
       if (i + 1 < charStream.length && ['.', '?', '!'].includes(charStream[i+1].char)) {
           continue; // Part of ellipsis or multiple punctuation
       }

       // Check next chars
       // We want to verify we are at a boundary. 
       // If next char is space, likely end.
       // If next char is quote, check after quote.
       
       // Simple heuristic: punctuation followed by space or EOF
       if (i + 1 >= charStream.length || charStream[i+1].char === ' ' || charStream[i+1].char === '\n') {
           isSentenceEnd = true;
       } else if (['"', "'", '”', '’'].includes(charStream[i+1].char)) {
           // Include the quote in this sentence
           i++;
           currentSentenceChars.push(charStream[i]);
           // Now check if space follows
           if (i + 1 >= charStream.length || charStream[i+1].char === ' ') {
               isSentenceEnd = true;
           }
       }

       if (isSentenceEnd) {
           // Create subtitle item
           const text = currentSentenceChars.map(x => x.char).join('').trim();
           if (text.length > 0) {
               newSubtitles.push({
                   id: currentId++,
                   startTime: currentSentenceChars[0].startTime,
                   endTime: currentSentenceChars[currentSentenceChars.length - 1].endTime,
                   text: text
               });
           }
           currentSentenceChars = [];
       }
    }
  }

  // Handle remaining text
  if (currentSentenceChars.length > 0) {
      const text = currentSentenceChars.map(x => x.char).join('').trim();
       if (text.length > 0) {
        newSubtitles.push({
            id: currentId++,
            startTime: currentSentenceChars[0].startTime,
            endTime: currentSentenceChars[currentSentenceChars.length - 1].endTime,
            text: text
        });
       }
  }

  return newSubtitles;
};
