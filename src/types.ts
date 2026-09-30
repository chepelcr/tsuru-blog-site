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
export interface NavbarContent {
  brand: Localized;
  links: Record<'features' | 'plans' | 'fairs' | 'community' | 'examples' | 'nosotros' | 'about' | 'contact' | 'blog', Localized>;
  login: Localized;
  register: Localized;
}
export interface BrandingContent {
  logoUrl: string;
  logoUrlDark: string;
  faviconUrl: string;
  faviconUrlDark: string;
  adminLoginUrl: string;
  adminRegisterUrl: string;
}
export interface FooterContent {
  brand: Localized;
  description: Localized;
  groups: Record<'product' | 'company' | 'legal', Localized>;
  links: Record<'features' | 'plans' | 'fairs' | 'community' | 'examples' | 'about' | 'blog' | 'contact' | 'terms' | 'privacy' | 'cookies', Localized>;
  copyright: Localized;
  madeBy: { label: Localized; name: string; url: string; logoUrl: string };
}
