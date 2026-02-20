export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type Channel = {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  created_at: string;
  pdf_count?: number;
  question_count?: number;
};

export type Pdf = {
  id: string;
  channel_id: string;
  user_id: string;
  name: string;
  storage_path: string;
  size_bytes: number;
  page_count: number | null;
  created_at: string;
  indexed: boolean;
};

export type Message = {
  id: string;
  channel_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  source_pdf_name: string | null;
  source_page: number | null;
  web_used: boolean;
  created_at: string;
};

export type ChunkRow = {
  id: string;
  pdf_id: string;
  channel_id: string;
  user_id: string;
  content: string;
  page_number: number;
  embedding: number[];
};
