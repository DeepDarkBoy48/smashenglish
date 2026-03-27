
export interface AnalysisChunk {
  text: string;
  grammarDescription: string;
  partOfSpeech: string;
  role: string;
}

export interface DetailedToken {
  text: string;
  partOfSpeech: string;
  role: string;
  explanation: string;
  meaning: string; // New: Contextual meaning
}

export interface CorrectionChange {
  type: 'add' | 'remove' | 'keep';
  text: string;
}

export interface Correction {
  original: string;
  corrected: string;
  errorType: string;
  reason: string;
  changes: CorrectionChange[];
}

export interface AnalysisResult {
  chunks: AnalysisChunk[];
  detailedTokens: DetailedToken[];
  chineseTranslation: string;
  englishSentence: string;
  correction?: Correction;
  sentencePattern?: string; // e.g., "S + V + O"
  mainTense?: string;      // e.g., "Present Perfect"
}

// --- Dictionary Types ---

export interface DictionaryDefinition {
  meaning: string;         // Chinese meaning
  explanation: string;     // English/Chinese explanation
  example: string;         // English example sentence
  exampleTranslation: string; // Chinese translation of example
}

export interface DictionaryCollocation {
  phrase: string;
  meaning: string;
  example: string;
  exampleTranslation: string;
}

export interface DictionaryEntry {
  partOfSpeech: string;    // e.g., "noun", "verb"
  cocaFrequency?: string;  // New: POS-specific frequency, e.g. "Rank 1029"
  definitions: DictionaryDefinition[];
}

export interface DictionaryResult {
  word: string;
  phonetic: string;        // IPA
  entries: DictionaryEntry[];
  collocations?: DictionaryCollocation[];
}

// --- Writing Analysis Types ---

export type WritingMode = 'fix' | 'ielts-5.5' | 'ielts-6.0' | 'ielts-6.5' | 'ielts-7.0' | 'ielts-7.5' | 'ielts-8.0';

export interface WritingSegment {
  type: 'unchanged' | 'change';
  text: string;          // The text to display (corrected version)
  original?: string;     // The original text (if changed)
  reason?: string;       // Why it was changed
  category?: 'grammar' | 'vocabulary' | 'style' | 'collocation' | 'punctuation';
}

export interface WritingResult {
  mode: WritingMode;
  generalFeedback: string;
  segments: WritingSegment[]; // Replaces simple improvedText + suggestions list
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  data?: any;
  type?: 'text' | 'analysis_result' | 'dictionary_result' | 'quick_lookup_result' | 'video_control';
}

// --- LLM Configuration ---
export type ThinkingLevel = 'default' | 'minimal' | 'low' | 'medium' | 'high';
export type LlmFeatureKey =
  | 'analysis'
  | 'dictionary'
  | 'writing'
  | 'chat'
  | 'quick_lookup'
  | 'rapid_lookup'
  | 'translate'
  | 'translate_advanced'
  | 'daily_summary'
  | 'review_article';

export interface FeatureLLMConfig {
  feature: LlmFeatureKey;
  label: string;
  description: string;
  model: string;
  thinking_level: ThinkingLevel;
}

export interface FeatureLLMConfigResponse {
  features: FeatureLLMConfig[];
}

export type UserFeatureLLMOverride = Partial<Pick<FeatureLLMConfig, 'model' | 'thinking_level'>>;
export type UserFeatureLLMOverrides = Partial<Record<LlmFeatureKey, UserFeatureLLMOverride>>;

// --- Page Mode ---
export type PageMode = 'writing' | 'reading';  // 写作纠错 | 文章精读

export interface OtherMeaning {
  meaning: string;
  partOfSpeech: string;
  example: string;
}

export interface OtherForm {
  form: string;
  partOfSpeech?: string;
  meaning?: string;
}


// --- Quick Lookup Result ---
export interface QuickLookupResult {
  word: string;
  contextMeaning: string;  // 在此上下文中的释义
  englishDefinition?: string; // 英英释义
  partOfSpeech: string;    // 词性缩写
  grammarRole: string;     // 语法角色
  explanation: string;     // 解释为什么是这个意思
  baseForm?: string;       // 原型/词典原形
  otherForms?: Array<OtherForm | string>;   // 其他常见变形（兼容旧字符串数据）
  otherMeanings?: OtherMeaning[]; // 其他常见释义
  originalSentence?: string; // 原句内容
  url?: string;             // 原始链接
  reading_id?: number;      // 关联精读笔记本 ID
  video_id?: number;        // 关联视频笔记本 ID
}


// --- Rapid Lookup (Ultra Fast) ---
export interface RapidLookupResult {
  m: string; // meaning
  p: string; // partOfSpeech
}

// --- Multi-thread AI Assistant ---
export interface Thread {
  id: string;
  title: string;
  messages: Message[];
  context: string | null;
  contextType: 'sentence' | 'word' | 'writing';
  timestamp: number;
}

// --- Translation ---
export interface TranslateResult {
  translation: string;
}

export interface SavedWord {
  id: number;
  word: string;
  context: string;
  url?: string;
  data: any; // QuickLookupResult data
  encounters: SavedWordEncounter[];
  created_at?: string;
  note_id?: number;
  reading_id?: number;
  video_id?: number;
  // FSRS fields
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  last_review?: string;
  reps: number;
  state: number;
}

export interface SavedWordEncounter {
  key: string;
  context: string;
  url?: string;
  note_id?: number;
  reading_id?: number;
  video_id?: number;
  created_at?: string;
  lookup: QuickLookupResult;
}

export interface SavedWordsResponse {
  words: SavedWord[];
}

export interface SavedWordsExportResponse {
  version: number;
  exported_at: string;
  words: SavedWord[];
}

export interface SavedWordsImportResponse {
  total: number;
  imported: number;
  merged: number;
  skipped: number;
}

export interface DailyNote {
  id: number;
  title: string | null;
  day: string;
  summary: string | null;
  content: string | null;
  word_count: number;
  created_at: string;
}

export interface DailyNotesResponse {
  notes: DailyNote[];
}

export interface NoteDetailResponse {
  note: DailyNote;
  words: SavedWord[];
}

export interface VideoNotebookUpdate {
  title?: string;
  video_url?: string;
  video_id?: string | null;
  srt_content?: string;
  thumbnail_url?: string | null;
}

// --- FSRS Review Interface ---
export interface ReviewArticle {
  id?: number;
  title: string;
  content: string;
  article_type: string;
  words_json: number[];
  is_completed: boolean;
  created_at?: string;
}

export interface TodayReviewResponse {
  article: ReviewArticle;
  words: SavedWord[];
  is_new_article: boolean;
}

export interface FSRSFeedbackRequest {
  word_id: number;
  rating: number; // 1: Again, 2: Good, 3: Easy
}

export interface VideoNotebook {
  id: number;
  title: string;
  video_url: string;
  video_id: string | null;
  srt_content: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface VideoNotebookListResponse {
  notebooks: VideoNotebook[];
}

export interface ReadingNotebook {
  id: number;
  title: string;
  content: string | null;
  source_url: string | null;
  cover_image_url: string | null;
  description: string | null;
  word_count: number;
  created_at: string;
  updated_at: string;
}

export interface ReadingNotebookListResponse {
  notebooks: ReadingNotebook[];
}

export interface ReadingNotebookUpdate {
  title?: string;
  content?: string;
  source_url?: string | null;
  cover_image_url?: string | null;
  description?: string | null;
  word_count?: number;
}
