import map from '../data/optimized.json';
import { BASE } from './url';
import { responsive, responsiveHtml } from './opt';
import { withBase } from './base';

/** {src, srcset} for an image path, using the small WebP copies when available. */
export const pic = (path: string) => responsive(path, map, BASE);

/** Imported page HTML ready to render: site base added to links/images, images pointed at the WebP copies. */
export const picHtml = (html: string, sizes = '(max-width: 800px) 100vw, 760px') => responsiveHtml(withBase(html, BASE), map, BASE, sizes);
export const GALLERY_SIZES = '(max-width: 600px) 50vw, 260px';
