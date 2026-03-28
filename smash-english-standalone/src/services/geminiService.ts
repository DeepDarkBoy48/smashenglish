import request from "@/utils/request";
import type { 
  AnalysisResult, 
  DictionaryResult, 
  WritingResult, 
  Message, 
  WritingMode, 
  QuickLookupResult, 
  TranslateResult, 
  RapidLookupResult, 
  SavedWordsResponse, 
  SavedWordsExportResponse,
  SavedWordsImportResponse,
  DailyNotesResponse, 
  NoteDetailResponse,
  VideoNotebook,
  VideoNotebookListResponse,
  ReadingNotebook,
  ReadingNotebookListResponse,
  ReadingNotebookUpdate,
  TodayReviewResponse,
  FSRSFeedbackRequest,
  SavedWord
} from "../types";
import type { FeatureLLMConfigResponse } from "../types";

// --- Public Services ---

export const analyzeSentenceService = (sentence: string): Promise<AnalysisResult> => {
  return request.post('/fastapi/analyze', { sentence }, { timeout: 45000 }) as Promise<AnalysisResult>;
};

export const lookupWordService = (word: string): Promise<DictionaryResult> => {
  return request.post('/fastapi/lookup', { word }) as Promise<DictionaryResult>;
};

export const evaluateWritingService = (text: string, mode: WritingMode): Promise<WritingResult> => {
  return request.post('/fastapi/writing', { text, mode }) as Promise<WritingResult>;
};

export const getChatResponseService = async (
  history: Message[],
  contextContent: string | null,
  userMessage: string,
  contextType: 'sentence' | 'word' | 'writing' = 'sentence'
): Promise<string> => {
  const result = await request.post('/fastapi/chat', {
    history,
    contextContent,
    userMessage,
    contextType
  }) as { response: string };
  return result.response;
};

export const quickLookupService = (word: string, context: string, url?: string, reading_id?: number, video_id?: number): Promise<QuickLookupResult> => {
  return request.post('/fastapi/quick-lookup', { word, context, url, reading_id, video_id }) as Promise<QuickLookupResult>;
};

export const translateService = (text: string): Promise<TranslateResult> => {
  return request.post('/fastapi/translate', { text }) as Promise<TranslateResult>;
};

export const translateAdvancedService = (data: { 
  text: string; 
  source_lang: string; 
  target_lang: string; 
}): Promise<TranslateResult> => {
  return request.post('/fastapi/translate-advanced', data) as Promise<TranslateResult>;
};

export const getFeatureLlmConfigsService = (): Promise<FeatureLLMConfigResponse> => {
  return request.get('/fastapi/llm-configs') as Promise<FeatureLLMConfigResponse>;
};

export const rapidLookupService = (word: string, context: string): Promise<RapidLookupResult> => {
  return request.post('/fastapi/rapid-lookup', { word, context }) as Promise<RapidLookupResult>;
};

export const getSavedWordsService = (): Promise<SavedWordsResponse> => {
  return request.get('/fastapi/saved-words') as Promise<SavedWordsResponse>;
};

export const exportSavedWordsService = (): Promise<SavedWordsExportResponse> => {
  return request.get('/fastapi/saved-words/export') as Promise<SavedWordsExportResponse>;
};

export const importSavedWordsService = (payload: { version?: number; exported_at?: string; words: any[] }): Promise<SavedWordsImportResponse> => {
  return request.post('/fastapi/saved-words/import', payload) as Promise<SavedWordsImportResponse>;
};

export const getDailyNotesService = (): Promise<DailyNotesResponse> => {
  return request.get('/fastapi/daily-notes') as Promise<DailyNotesResponse>;
};

export const getNoteDetailService = (noteId: number): Promise<NoteDetailResponse> => {
  return request.get(`/fastapi/daily-notes/${noteId}`) as Promise<NoteDetailResponse>;
};

export const summarizeDailyNoteService = (noteId: number): Promise<{ title: string, summary: string, content: string }> => {
  return request.post(`/fastapi/daily-notes/${noteId}/summarize`) as Promise<{ title: string, summary: string, content: string }>;
};

export const deleteSavedWordService = (wordId: number): Promise<any> => {
  return request.delete(`/fastapi/saved-words/${wordId}`);
};

export const deleteSavedWordEncounterService = (wordId: number, encounterKey: string): Promise<any> => {
  return request.delete(`/fastapi/saved-words/${wordId}/encounters/${encodeURIComponent(encounterKey)}`);
};

export const createSavedWordService = (data: { word: string; context: string; url?: string; data?: any; note_id?: number }): Promise<SavedWord> => {
  return request.post('/fastapi/saved-words', data) as Promise<SavedWord>;
};

export const updateSavedWordService = (wordId: number, data: Partial<{ word: string; context: string; url?: string; data?: any; note_id?: number }>): Promise<SavedWord> => {
  return request.put(`/fastapi/saved-words/${wordId}`, data) as Promise<SavedWord>;
};

export const batchDeleteSavedWordsService = (wordIds: number[]): Promise<any> => {
  return request.post('/fastapi/saved-words/batch-delete', { word_ids: wordIds });
};

// --- Video Notebook Services ---

export const listNotebooksService = (): Promise<VideoNotebookListResponse> => {
  return request.get('/fastapi/notebooks') as Promise<VideoNotebookListResponse>;
};

export const getNotebookDetailService = (notebookId: number): Promise<VideoNotebook> => {
  return request.get(`/fastapi/notebooks/${notebookId}`) as Promise<VideoNotebook>;
};

export const createNotebookService = (data: {
  title: string;
  video_url: string;
  video_id: string | null;
  srt_content: string;
  thumbnail_url: string | null;
}): Promise<VideoNotebook> => {
  return request.post('/fastapi/notebooks', data) as Promise<VideoNotebook>;
};

export const updateNotebookService = (notebookId: number, data: Partial<{
  title: string;
  video_url: string;
  video_id: string | null;
  srt_content: string;
  thumbnail_url: string | null;
}>): Promise<VideoNotebook> => {
  return request.put(`/fastapi/notebooks/${notebookId}`, data) as Promise<VideoNotebook>;
};

export const deleteNotebookService = (notebookId: number): Promise<any> => {
  return request.delete(`/fastapi/notebooks/${notebookId}`);
};

// --- Reading Notebook Services ---

export const listReadingNotebooksService = (): Promise<ReadingNotebookListResponse> => {
  return request.get('/fastapi/reading-notebooks') as Promise<ReadingNotebookListResponse>;
};

export const getReadingNotebookDetailService = (notebookId: number): Promise<ReadingNotebook> => {
  return request.get(`/fastapi/reading-notebooks/${notebookId}`) as Promise<ReadingNotebook>;
};

export const createReadingNotebookService = (data: {
  title: string;
  content: string;
  source_url?: string | null;
  cover_image_url?: string | null;
  description?: string | null;
  word_count?: number;
}): Promise<ReadingNotebook> => {
  return request.post('/fastapi/reading-notebooks', data) as Promise<ReadingNotebook>;
};

export const updateReadingNotebookService = (notebookId: number, data: ReadingNotebookUpdate): Promise<ReadingNotebook> => {
  return request.put(`/fastapi/reading-notebooks/${notebookId}`, data) as Promise<ReadingNotebook>;
};

export const deleteReadingNotebookService = (notebookId: number): Promise<any> => {
  return request.delete(`/fastapi/reading-notebooks/${notebookId}`);
};

// --- FSRS Review Services ---

export const getTodayReviewService = (): Promise<TodayReviewResponse> => {
  return request.get('/fastapi/review/today') as Promise<TodayReviewResponse>;
};

export const getReviewPromptService = (): Promise<{ prompt: string }> => {
  return request.get('/fastapi/review/prompt') as Promise<{ prompt: string }>;
};

export const importReviewArticleService = (data: { title: string; content: string; article_type: string; words_ids: number[] }): Promise<any> => {
  return request.post('/fastapi/review/import', data);
};

export const submitReviewFeedbackService = (data: FSRSFeedbackRequest): Promise<any> => {
  return request.post('/fastapi/review/feedback', data);
};

export const getReviewReadAloudAudioService = (text: string): Promise<Blob> => {
  return request.post(
    '/fastapi/review/read-aloud',
    { text },
    { responseType: 'blob', timeout: 60000 }
  ) as Promise<Blob>;
};
