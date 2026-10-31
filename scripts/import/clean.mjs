// Turns Elementor/WordPress page HTML into clean, semantic HTML for the new site.
import * as cheerio from 'cheerio';
import { pathFromLink, isOllieTree } from '../lib/paths.mjs';

const KEEP_CLASSES = new Set(['row', 'col', 'block', 'gallery', 'btn', 'video', 'map', 'form-placeholder', 'counter', 'counter-num', 'counter-label', 'notice', 'accordion']);
const KEEP_ATTRS = new Set(['href', 'src', 'srcset', 'sizes', 'alt', 'title', 'width', 'height', 'target', 'rel', 'colspan', 'rowspan', 'allowfullscreen', 'allow', 'loading', 'controls', 'poster', 'open', 'datetime', 'start', 'type', 'frameborder']);
const PLACEHOLDER = {
  'zh-CN': '报名表即将上线（占位）',
  en: 'Registration form coming soon (placeholder)',
};

const load = (html) => cheerio.load(html, null, false);
const isUploads = (u) => /\/wp-content\/uploads\//.test(u);
const localUrl = (base, path) => base + encodeURI(path);

function youtubeId(url) {
  const m = String(url || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function convertWidgets($) {
  $('[data-widget_type]').each((_, el) => {
    const w = $(el);
    const type = w.attr('data-widget_type');
    if (type === 'spacer.default') return void w.remove();
    if (type === 'video.default') {
      let settings = {};
      try { settings = JSON.parse(w.attr('data-settings') || '{}'); } catch {}
      const id = youtubeId(settings.youtube_url);
      const hosted = w.find('video').attr('src');
      if (id) w.replaceWith(`<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="YouTube video" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`);
      else if (hosted) w.replaceWith(`<div class="video"><video src="${hosted}" controls></video></div>`);
      return;
    }
    if (type === 'google_maps.default') {
      const src = w.find('iframe').attr('src');
      if (src) w.replaceWith(`<div class="map"><iframe src="${src}" title="Map" loading="lazy"></iframe></div>`);
      return;
    }
    if (/^(image-carousel|image-gallery|smartslider)/.test(type)) {
      w.find('.swiper-slide-duplicate').remove();
      const imgs = w.find('img').toArray().map((i) => $.html(i));
      w.replaceWith(`<div class="gallery">${imgs.join('')}</div>`);
      return;
    }
    if (type === 'counter.default') {
      const num = w.find('.elementor-counter-number');
      if (num.attr('data-to-value')) num.text(num.attr('data-to-value'));
      const prefix = w.find('.elementor-counter-number-prefix').text();
      const suffix = w.find('.elementor-counter-number-suffix').text();
      const label = w.find('.elementor-counter-title').text();
      w.replaceWith(`<div class="counter"><span class="counter-num">${prefix}${num.text()}${suffix}</span><span class="counter-label">${label}</span></div>`);
      return;
    }
    if (type === 'accordion.default' || type === 'toggle.default') {
      const items = w.find('.elementor-accordion-item, .elementor-toggle-item').toArray().map((item) => {
        const t = $(item).find('.elementor-tab-title').first().text().trim();
        const c = $(item).find('.elementor-tab-content').first().html() || '';
        return `<details><summary>${t}</summary>${c}</details>`;
      });
      w.replaceWith(`<div class="accordion">${items.join('')}</div>`);
      return;
    }
    if (type === 'button.default') {
      const a = w.find('a').first();
      const label = w.text().replace(/\s+/g, ' ').trim();
      if (a.length && label) w.replaceWith(`<p><a class="btn" href="${a.attr('href') || '#'}">${label}</a></p>`);
      else if (label) w.replaceWith(`<p>${label}</p>`);
      else w.remove();
      return;
    }
    if (type === 'divider.default' && !w.text().trim()) return void w.replaceWith('<hr>');
  });
}

/** Columns of an Elementor section/container, or [] when it isn't one. */
function columnsOf($, el) {
  const e = $(el);
  if (e.hasClass('elementor-section')) return e.children('.elementor-container').children('.elementor-column').toArray();
  if (e.hasClass('e-con')) {
    const inner = e.children('.e-con-inner');
    return (inner.length ? inner : e).children('.e-con').toArray();
  }
  return [];
}

function convertLayout($) {
  const sections = $('.elementor-section, .e-con').toArray().reverse();
  for (const el of sections) {
    const cols = columnsOf($, el);
    const topLevel = $(el).parents('.elementor-section, .e-con, .row, .block').length === 0;
    if (cols.length > 1) {
      const row = $(`<${topLevel ? 'section' : 'div'} class="row cols-${cols.length}"></${topLevel ? 'section' : 'div'}>`);
      for (const c of cols) row.append($('<div class="col"></div>').append($(c).contents()));
      $(el).replaceWith(row);
    } else if (topLevel) {
      $(el).replaceWith($('<section class="block"></section>').append($(el).contents()));
    }
  }
}

function unwrapAndStrip($) {
  // Unwrap every leftover builder wrapper, innermost first.
  const wrappers = $('div, span, section').toArray().reverse()
    .filter((el) => /(^|\s)(elementor|e-con|e-flex|e-child|swiper|ehf|ast-|give-)/.test($(el).attr('class') || '') && !KEEP_CLASSES.has(($(el).attr('class') || '').split(' ')[0]));
  for (const el of wrappers) $(el).replaceWith($(el).contents());

  $('*').each((_, el) => {
    for (const name of Object.keys(el.attribs || {})) {
      if (name === 'class') {
        const kept = el.attribs.class.split(/\s+/).filter((c) => KEEP_CLASSES.has(c) || /^cols-\d+$/.test(c));
        if (kept.length) el.attribs.class = kept.join(' ');
        else delete el.attribs.class;
      } else if (!KEEP_ATTRS.has(name)) delete el.attribs[name];
    }
  });
}

function removeEmpty($) {
  let changed = true;
  while (changed) {
    changed = false;
    $('div, p, span, section, h1, h2, h3, h4, h5, h6, li, ul, ol, a, strong, em, b').each((_, el) => {
      const e = $(el);
      if (!e.text().trim() && !e.find('img, iframe, video, hr, br, table').length && !['IMG'].includes(el.tagName)) {
        e.remove();
        changed = true;
      }
    });
  }
}

export function stripElementor(html) {
  const $ = load(html);
  $('script, style, noscript, link, meta, svg, i[class*="fa-"], .elementor-icon i, .screen-reader-text').remove();
  convertWidgets($);
  convertLayout($);
  unwrapAndStrip($);
  removeEmpty($);
  return $.html();
}

export function replaceForms(html, lang) {
  const $ = load(html);
  let hasForm = false;
  const label = PLACEHOLDER[lang] ?? PLACEHOLDER.en;
  $('form.post-password-form').each((_, f) => {
    const note = $(f).find('p').first().text().trim();
    $(f).replaceWith(`<p class="notice">${note}</p>`);
  });
  const sel = '.wpforms-container, .give-form-wrap, .give-embed-form-wrapper, iframe[src*="give-embed"], form';
  // outermost matches only, so a container and its inner <form> become one placeholder
  $(sel).filter((_, el) => $(el).parents(sel).length === 0).each((_, el) => {
    hasForm = true;
    $(el).replaceWith(`<div class="form-placeholder"><p>${label}</p></div>`);
  });
  // two forms side by side become one placeholder
  $('.form-placeholder + .form-placeholder').remove();
  return { html: $.html(), hasForm };
}

export function rewriteMedia(html, base, localMedia) {
  const $ = load(html);
  const map = (u) => {
    if (!u || !isOllieTree(u) || !isUploads(u)) return u;
    const p = pathFromLink(u);
    return localMedia.has(p) ? localUrl(base, p) : null;
  };
  $('img').each((_, el) => {
    const e = $(el);
    const src = e.attr('data-src') || e.attr('data-lazy-src') || e.attr('src');
    let mapped = map(src);
    if (mapped === null) {
      // fall back to the unsized original when a sized variant is missing
      const original = src.replace(/-\d+x\d+(?=\.[a-z]+$)/i, '').replace(/-scaled(?=\.[a-z]+$)/i, '');
      mapped = map(original);
    }
    if (mapped === null) return void e.remove();
    e.attr('src', mapped);
    const srcset = e.attr('srcset');
    if (srcset) {
      const kept = srcset.split(',').map((s) => s.trim()).filter(Boolean).map((entry) => {
        const [u, d] = entry.split(/\s+/);
        const m = map(u);
        return m ? `${m}${d ? ' ' + d : ''}` : null;
      }).filter(Boolean);
      if (kept.length) e.attr('srcset', kept.join(', '));
      else { e.removeAttr('srcset'); e.removeAttr('sizes'); }
    }
  });
  $('a[href], video[src], source[src], video[poster]').each((_, el) => {
    for (const attr of ['href', 'src', 'poster']) {
      const v = $(el).attr(attr);
      if (!v || !isUploads(v)) continue;
      const m = map(v);
      if (m) $(el).attr(attr, m);
    }
  });
  return $.html();
}

export function rewriteLinks(html, base) {
  const $ = load(html);
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || href.startsWith('#') || href.startsWith(base + '/') || isUploads(href)) return;
    if (!isOllieTree(href) && !href.startsWith('/')) return;
    const u = new URL(href, 'https://www.ollietree.org');
    $(el).attr('href', localUrl(base, pathFromLink(u.href)) + u.hash);
  });
  return $.html();
}

const visibleText = (html) => load(html).root().text().replace(/\s+/g, ' ').trim();

export function cleanContent(html, { site, base, localMedia }) {
  const lang = site === 'en' ? 'en' : 'zh-CN';
  const forms = replaceForms(stripElementor(html), lang);
  const out = rewriteLinks(rewriteMedia(forms.html, base, localMedia), base);
  const $ = load(out);
  const imgs = $('img').toArray();
  const firstSrc = imgs.length ? $(imgs[0]).attr('src') : null;
  return {
    html: out,
    hasForm: forms.hasForm,
    gallery: imgs.length >= 6 && visibleText(out).length < 300,
    hero: firstSrc ? decodeURI(firstSrc.slice(base.length)) : undefined,
  };
}
