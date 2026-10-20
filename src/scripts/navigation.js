/** A full-screen menu with focus containment, Escape, and focus restoration. */
export function initNavigation() {
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.querySelector('#menu');
  const main = document.querySelector('main');
  const footer = document.querySelector('footer');
  const home = document.querySelector('header a');
  const links = [...menu.querySelectorAll('a')];
  const desktop = matchMedia('(min-width: 751px)');
  const desktopLinks = [...document.querySelectorAll('.desktop-nav a')];
  let previousOverflow = '';

  function close({ restoreFocus = true } = {}) {
    if (menu.hidden) return;
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    document.body.style.overflow = previousOverflow;
    [main, footer, home].forEach((el) => { el.inert = false; });
    if (restoreFocus) toggle.focus({ preventScroll: true });
  }

  toggle.addEventListener('click', () => {
    if (desktop.matches) return;
    if (!menu.hidden) return close();
    previousOverflow = document.body.style.overflow;
    menu.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    document.body.style.overflow = 'hidden';
    [main, footer, home].forEach((el) => { el.inert = true; });
    links[0].focus();
  });

  links.forEach((link) => link.addEventListener('click', () => {
    close({ restoreFocus: false });
    const section = document.querySelector(link.hash);
    section.tabIndex = -1;
    section.focus({ preventScroll: true });
  }));

  document.addEventListener('keydown', (event) => {
    if (menu.hidden) return;
    if (event.key === 'Escape') close();
    if (event.key !== 'Tab') return;
    const focusable = [toggle, ...links];
    const index = focusable.indexOf(document.activeElement);
    event.preventDefault();
    focusable[(index + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length].focus();
  });

  // Restore page interaction when resizing out of an open mobile menu.
  desktop.addEventListener('change', () => {
    if (!desktop.matches || menu.hidden) return;
    close({ restoreFocus: false });
    desktopLinks.find((link) => link.hasAttribute('aria-current'))?.focus({ preventScroll: true });
  });

  const sections = [...document.querySelectorAll('main > section[id]')];
  let scheduled = false;
  function updateCurrent() {
    scheduled = false;
    let current = sections[0].id;
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= 140) current = section.id;
    }
    if (scrollY + innerHeight >= document.documentElement.scrollHeight - 2) current = 'contact';
    [...desktopLinks, ...links].forEach((link) => {
      if (link.hash === `#${current}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function requestUpdate() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(updateCurrent);
  }
  addEventListener('scroll', requestUpdate, { passive: true });
  addEventListener('resize', requestUpdate);
  updateCurrent();

}
