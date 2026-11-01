import map from '../data/optimized.json';
import { BASE } from './url';
import { responsive, responsiveHtml } from './opt';

/** {src, srcset} for an image path, using the small WebP copies when available. */
export const pic = (path: string) => responsive(path, map, BASE);

/** Same for every <img> inside imported page HTML. */
export const picHtml = (html: string, sizes = '(max-width: 800px) 100vw, 760px') => responsiveHtml(html, map, BASE, sizes);
export const GALLERY_SIZES = '(max-width: 600px) 50vw, 260px';
