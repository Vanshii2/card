/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  // static authoring needs no JS: hero.css styles the authored picture/heading directly
  if (!block.classList.contains('dynamic')) return;

  const link = block.querySelector('a[href]');
  const path = link ? link.getAttribute('href') : block.textContent.trim();
  if (!path || !path.startsWith('/') || path.startsWith('//')) return;

  try {
    const resp = await fetch(`${path}.plain.html`);
    if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
    const doc = new DOMParser().parseFromString(await resp.text(), 'text/html');
    const source = doc.querySelector('.hero');
    if (!source) throw new Error(`no .hero block found at ${path}`);

    // media referenced by the fetched fragment is relative to its own path
    source.querySelectorAll('img[src^="./media_"], source[srcset^="./media_"]').forEach((el) => {
      const attr = el.tagName === 'SOURCE' ? 'srcset' : 'src';
      el[attr] = new URL(el.getAttribute(attr), new URL(path, window.location)).href;
    });

    block.replaceChildren(...source.childNodes);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`hero: failed to load dynamic content from ${path}`, error);
  }
}
