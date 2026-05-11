export type MediaType = "image" | "video" | "gif";

export interface PostMedia {
  type: MediaType;
  url: string;
  previewUrl?: string;
}

export interface XPostDetails {
  id: string;
  authorHandle?: string;
  text: string;
  media: PostMedia[];
  sourceUrl: string;
}

export interface FetchMeta {
  fetchedAt: string;
  provider: string;
}
