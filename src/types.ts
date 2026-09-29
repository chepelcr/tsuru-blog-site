export type Localized = { es: string; en: string };
export type Lang = keyof Localized;
export interface BlogBlock {
  type: 'paragraph' | 'heading' | 'list' | 'quote' | 'divider' | 'callout' | 'image' | 'image_text' | 'embed';
  text?: Localized;
  mediaId?: string;
  layout?: 'full' | 'wide' | 'left' | 'right';
  alt?: Localized;
  caption?: Localized;
  url?: string;
}
export interface BlogPost {
  id: string;
  slug: string;
  authorName: string;
  authorType: 'team' | 'user';
  publishedAt: string;
  media: Record<string, string>;
  revision: { document: { schemaVersion: 1; title: Localized; excerpt: Localized; blocks: BlogBlock[]; coverMediaId?: string } };
}
export interface BlogList { data: BlogPost[]; page: number; pageSize: number }
export interface BlogChrome {
  badge: Localized;
  title: Localized;
  subtitle: Localized;
  readMore: Localized;
  backToBlog: Localized;
}
