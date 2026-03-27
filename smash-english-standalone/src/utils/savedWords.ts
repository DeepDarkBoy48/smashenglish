import type { QuickLookupResult, SavedWord, SavedWordEncounter } from '../types';

const sortEncountersDesc = (a: SavedWordEncounter, b: SavedWordEncounter) =>
  (b.created_at || '').localeCompare(a.created_at || '');

const normalizeSavedWord = (value: string | undefined) => (value || '').trim().toLowerCase();

export const getSavedWordEncounters = (word: Pick<SavedWord, 'data'>): SavedWordEncounter[] => {
  if (!Array.isArray(word.data?.encounters)) {
    return [];
  }

  return [...word.data.encounters].sort(sortEncountersDesc);
};

export const getSavedWordLatestEncounter = (word: Pick<SavedWord, 'data'>): SavedWordEncounter | null =>
  getSavedWordEncounters(word)[0] ?? null;

export const getSavedWordLatestLookup = (word: Pick<SavedWord, 'data'>): QuickLookupResult | null =>
  getSavedWordLatestEncounter(word)?.lookup ?? null;

export const buildLocalEncounter = (
  word: string,
  context: string,
  lookup: QuickLookupResult,
  options: {
    url?: string;
    note_id?: number;
    reading_id?: number;
    video_id?: number;
    created_at?: string;
  } = {}
): SavedWordEncounter => ({
  key: `local-${word.toLowerCase()}-${Date.now()}`,
  context,
  url: options.url,
  note_id: options.note_id,
  reading_id: options.reading_id,
  video_id: options.video_id,
  created_at: options.created_at || new Date().toISOString().slice(0, 19).replace('T', ' '),
  lookup
});

export const buildLocalSavedWordData = (_lookup: QuickLookupResult, encounter: SavedWordEncounter) => ({
  schemaVersion: 2,
  encounters: [encounter]
});

export const upsertLocalSavedWord = <T extends { word?: string; data?: SavedWord['data'] }>(
  words: T[],
  word: string,
  encounter: SavedWordEncounter
): T[] => {
  const normalized = normalizeSavedWord(word);
  let matched = false;

  const nextWords = words.map((item) => {
    if (matched || normalizeSavedWord(item.word) !== normalized) {
      return item;
    }

    matched = true;

    return {
      ...item,
      word,
      data: {
        schemaVersion: 2,
        encounters: [encounter, ...(item.data ? getSavedWordEncounters(item as Pick<SavedWord, 'data'>) : [])]
      }
    };
  });

  if (matched) {
    return nextWords;
  }

  return [
    ...words,
    {
      word,
      data: buildLocalSavedWordData(encounter.lookup, encounter)
    } as T
  ];
};
