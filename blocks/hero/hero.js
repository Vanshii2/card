const COHORT_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <circle cx="8.5" cy="8" r="3.1" />
  <circle cx="16.5" cy="9.2" r="2.4" />
  <path d="M2.6 18.4c0-3 2.6-4.9 5.9-4.9s5.9 1.9 5.9 4.9" />
  <path d="M15.4 13.8c2.9.1 5 1.9 5 4.6" />
</svg>`;

/** Pull plain text out of an authored cell. */
const cellText = (cell) => (cell ? cell.textContent.trim() : '');

export function readMeta(source) {
  if (!source) return [];
  if (typeof source === 'string') {
    return source.split(/[•|,]/).map((s) => s.trim()).filter(Boolean);
  }
  const items = [...source.querySelectorAll('li')];
  if (items.length) return items.map((li) => li.textContent.trim()).filter(Boolean);
  return readMeta(cellText(source));
}

export function renderHero({
  eyebrow = '', title = '', badge = '', meta = [], description = '', media = null,
} = {}) {
  const fragment = document.createDocumentFragment();

  if (media) {
    const bg = document.createElement('div');
    bg.className = 'hero-bg';
    bg.append(media);
    fragment.append(bg);
  }

  const layout = document.createElement('div');
  layout.className = 'hero-layout';
  fragment.append(layout);

  const text = document.createElement('div');
  text.className = 'hero-text';
  layout.append(text);

  if (eyebrow) {
    const p = document.createElement('p');
    p.className = 'hero-eyebrow';
    p.textContent = eyebrow;
    text.append(p);
  }

  if (title || badge) {
    const headline = document.createElement('div');
    headline.className = 'hero-headline';

    if (title) {
      const h1 = document.createElement('h1');
      h1.className = 'hero-title';
      h1.textContent = title;
      headline.append(h1);
    }
    if (badge) {
      const span = document.createElement('span');
      span.className = 'hero-badge';
      span.textContent = badge;
      headline.append(span);
    }
    text.append(headline);
  }

  if (meta.length) {
    const ul = document.createElement('ul');
    ul.className = 'hero-meta';
    meta.forEach((item, i) => {
      const li = document.createElement('li');
      if (i === 0) li.innerHTML = COHORT_ICON;
      li.append(document.createTextNode(item));
      ul.append(li);
    });
    text.append(ul);
  }

  if (description) {
    const p = document.createElement('p');
    p.className = 'hero-description';
    p.textContent = description;
    text.append(p);
  }

  return fragment;
}

function primeLcp(picture) {
  if (!picture) return;
  const img = picture.querySelector('img') || picture;
  img.setAttribute('loading', 'eager');
  img.setAttribute('fetchpriority', 'high');
}

function isAutoBlocked(block) {
  return block.children.length === 1
    && !!block.querySelector('h1')
    && !!block.querySelector('picture');
}

export default function decorate(block) {
  if (isAutoBlocked(block)) {
    const picture = block.querySelector('picture');
    primeLcp(picture);
    const hero = renderHero({
      title: block.querySelector('h1').textContent.trim(),
      media: picture,
    });
    block.textContent = '';
    block.append(hero);
    return;
  }

  const rows = [...block.children].map((row) => row.firstElementChild);
  const [eyebrow, title, badge, meta, description, image] = rows;

  const picture = image ? image.querySelector('picture, img') : null;
  primeLcp(picture);

  const hero = renderHero({
    eyebrow: cellText(eyebrow),
    title: cellText(title),
    badge: cellText(badge),
    meta: readMeta(meta),
    description: cellText(description),
    media: picture,
  });

  block.textContent = '';
  block.append(hero);
}
