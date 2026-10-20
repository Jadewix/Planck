/** Website links stay native; same-page case-study links open their supplied dialog. */
export function initProjectCards() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('.case-expand');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const href = link.getAttribute('href');
    if (!href?.startsWith('#')) return;
    const dialog = document.getElementById(href.slice(1));
    if (!(dialog instanceof HTMLDialogElement)) return;
    event.preventDefault();
    if (dialog.open) return;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    function onBackdrop(event) {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    }
    function onCloseButton(event) {
      if (event.target.closest('[data-close-case-study]')) dialog.close();
    }
    dialog.addEventListener('click', onBackdrop);
    dialog.addEventListener('click', onCloseButton);
    dialog.addEventListener('close', () => {
      document.body.style.overflow = previousOverflow;
      dialog.removeEventListener('click', onBackdrop);
      dialog.removeEventListener('click', onCloseButton);
      link.focus({ preventScroll: true });
    }, { once: true });
  });
}
