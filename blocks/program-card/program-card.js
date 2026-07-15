/*
 * Program Card Block
 * Promotes a learning program (cohort, course, certification, etc.) with a
 * status badge, format/level/duration meta, description and image.
 *
 * Authoring modes:
 * - Static:  every field is authored directly in the block table.
 * - Dynamic: authored as "Program Card (dynamic)" with a single link to a
 *            page that itself contains a static Program Card block. That
 *            block is fetched and reused here, so the source page stays the
 *            single source of truth. https://www.aem.live/developer/block-collection/fragment
 */
import { createOptimizedPicture } from '../../scripts/aem.js';

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/**
 * Returns a cell's content nodes, unwrapping a single wrapping <p> so text
 * ends up as direct children of whatever inline element it's placed in.
 * @param {Element} cell A value cell from parseFields
 * @returns {Node[]}
 */
function contentNodes(cell) {
  if (cell.children.length === 1 && cell.firstElementChild.tagName === 'P') {
    return [...cell.firstElementChild.childNodes];
  }
  return [...cell.childNodes];
}

/**
 * Reads the authored key/value rows into a lookup of label -> value cell.
 * @param {Element} block The program-card block element
 * @returns {Object<string, Element>}
 */
function parseFields(block) {
  const fields = {};
  [...block.children].forEach((row) => {
    const [labelCell, valueCell] = row.children;
    if (!labelCell || !valueCell) return;
    const label = labelCell.textContent.trim().toLowerCase();
    if (label) fields[label] = valueCell;
  });
  return fields;
}

function buildHeading(fields) {
  const heading = document.createElement('h3');
  heading.className = 'program-card-heading';
  if (!fields.heading) return heading;
  heading.append(...contentNodes(fields.heading));

  const linkHref = fields.link?.querySelector('a')?.href;
  if (linkHref && !heading.querySelector('a')) {
    const a = document.createElement('a');
    a.href = linkHref;
    a.append(...heading.childNodes);
    heading.append(a);
  }
  return heading;
}

function buildStatus(fields) {
  const text = fields.status?.textContent.trim();
  if (!text) return null;
  const status = document.createElement('span');
  status.className = 'program-card-status';
  status.dataset.status = slugify(text);
  status.textContent = text;
  return status;
}

function buildMeta(fields) {
  const items = ['format', 'level', 'duration']
    .map((key) => fields[key]?.textContent.trim())
    .filter(Boolean);
  if (!items.length) return null;
  const list = document.createElement('ul');
  list.className = 'program-card-meta';
  items.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    list.append(li);
  });
  return list;
}

function buildMedia(fields) {
  const img = fields.image?.querySelector('img');
  if (!img) return null;
  const picture = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
  const media = document.createElement('div');
  media.className = 'program-card-media';
  media.append(picture);
  return media;
}

function buildContent(fields) {
  const content = document.createElement('div');
  content.className = 'program-card-content';

  if (fields.category?.textContent.trim()) {
    const eyebrow = document.createElement('p');
    eyebrow.className = 'program-card-eyebrow';
    eyebrow.append(...contentNodes(fields.category));
    content.append(eyebrow);
  }

  const headingRow = document.createElement('div');
  headingRow.className = 'program-card-heading-row';
  headingRow.append(buildHeading(fields));
  const status = buildStatus(fields);
  if (status) headingRow.append(status);
  content.append(headingRow);

  const meta = buildMeta(fields);
  if (meta) content.append(meta);

  if (fields.description) {
    const description = document.createElement('div');
    description.className = 'program-card-description';
    description.append(...fields.description.childNodes);
    content.append(description);
  }

  return content;
}

/**
 * Replaces the authored rows of a program-card block with its final markup.
 * Shared by both the static and (hydrated) dynamic authoring modes.
 * @param {Element} block The program-card block element
 */
function renderCard(block) {
  const fields = parseFields(block);
  const content = buildContent(fields);
  const media = buildMedia(fields);

  block.textContent = '';
  block.append(content);
  if (media) block.append(media);
}

/**
 * Renders a minimal card explaining that the referenced program could not
 * be loaded, so a dynamic card never just disappears from the page.
 * @param {Element} block The program-card block element
 * @param {string} path The source path that failed to load
 */
function renderFallback(block, path) {
  const content = document.createElement('div');
  content.className = 'program-card-content';

  const heading = document.createElement('h3');
  heading.className = 'program-card-heading';
  heading.textContent = 'This program is currently unavailable.';
  content.append(heading);

  if (path) {
    const description = document.createElement('div');
    description.className = 'program-card-description';
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = path;
    a.textContent = 'View the program page';
    p.append('Please try again later, or ', a, '.');
    description.append(p);
    content.append(description);
  }

  block.textContent = '';
  block.append(content);
}

/**
 * Reads the path a dynamic program-card block points to.
 * @param {Element} block The program-card block element
 * @returns {string} the authored path, or an empty string
 */
function getDynamicSourcePath(block) {
  const link = block.querySelector('a[href]');
  return (link ? link.getAttribute('href') : block.textContent).trim();
}

/**
 * Resolves a dynamic program-card block by fetching the referenced page and
 * pulling its own (static) .program-card block into this one.
 * @param {Element} block The program-card block element
 * @param {string} path The site path to fetch
 * @returns {Promise<boolean>} whether hydration succeeded
 */
async function hydrateDynamicCard(block, path) {
  try {
    const resp = await fetch(`${path}.plain.html`);
    if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
    const doc = new DOMParser().parseFromString(await resp.text(), 'text/html');
    const source = doc.querySelector('.program-card');
    if (!source) throw new Error(`no .program-card block found at ${path}`);

    // media referenced by the fetched fragment is relative to its own path
    source.querySelectorAll('img[src^="./media_"], source[srcset^="./media_"]').forEach((el) => {
      const attr = el.tagName === 'SOURCE' ? 'srcset' : 'src';
      el[attr] = new URL(el.getAttribute(attr), new URL(path, window.location)).href;
    });

    block.replaceChildren(...source.childNodes);
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`program-card: failed to load dynamic content from ${path}`, error);
    return false;
  }
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  if (block.classList.contains('dynamic')) {
    const path = getDynamicSourcePath(block);
    if (!path || !path.startsWith('/') || path.startsWith('//')) {
      renderFallback(block, '');
      return;
    }

    block.classList.add('is-loading');
    const hydrated = await hydrateDynamicCard(block, path);
    block.classList.remove('is-loading');

    if (!hydrated) {
      renderFallback(block, path);
      return;
    }
  }
  renderCard(block);
}
