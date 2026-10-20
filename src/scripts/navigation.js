/** A full-screen menu with focus containment, Escape, and focus restoration. */
export function initNavigation() {
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.querySelector('#menu');
  const main = document.querySelector('main');
  const footer = document.querySelector('footer');
  const home = document.querySelector('header a');
  const links = [...menu.querySelectorAll('a')];
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
}
