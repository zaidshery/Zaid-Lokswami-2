export type EPaperStatus = 'draft' | 'published';

export interface EPaperPageData {
  pageNumber: number;
  imagePath?: string;
  width?: number;
  height?: number;
}

export interface EPaperRecord {
  _id: string;
  citySlug: string;
  cityName: string;
  title: string;
  publishDate: string;
  pdfPath: string;
  thumbnailPath: string;
  pageCount: number;
  pages: EPaperPageData[];
  status: EPaperStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface EPaperArticleHotspot {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface EPaperArticleRecord {
  _id: string;
  epaperId: string;
  pageNumber: number;
  title: string;
  slug: string;
  excerpt?: string;
  contentHtml?: string;
  coverImagePath?: string;
  hotspot: EPaperArticleHotspot;
  createdAt?: string;
  updatedAt?: string;
}
