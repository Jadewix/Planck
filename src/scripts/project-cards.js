import { caseStudies } from '../content/case-studies.js';

function setImage(element, image) {
  element.src = image.src;
  element.alt = image.alt;
  element.width = image.width;
  element.height = image.height;
}

/** Mobile-first projects show portrait screens in the same phone frames as their project row. */
function createPhones(screens) {
  const set = document.createElement('div');
  set.className = 'phone-set';
  screens.forEach((screen) => {
    const phone = document.createElement('span');
    const img = document.createElement('img');
    phone.className = 'phone';
    img.loading = 'lazy';
    img.decoding = 'async';
    setImage(img, screen);
    phone.append(img);
    set.append(phone);
  });
  return set;
}

/** Render every study from the same template; project facts are kept separately. */
function renderCaseStudies() {
  const template = document.querySelector('#case-study-template');
  caseStudies.forEach((study, index) => {
    const fragment = template.content.cloneNode(true);
    const dialog = fragment.querySelector('dialog');
    dialog.id = `case-study-${study.id}`;
    dialog.setAttribute('aria-labelledby', `${dialog.id}-title`);
    const title = dialog.querySelector('.study-title');
    title.id = `${dialog.id}-title`;
    title.textContent = study.name;
    const text = {
      '.study-index': `0${index + 1} / CASE STUDY`,
      '.study-category': study.category,
      '.study-headline': study.headline,
      '[data-study-role]': study.role,
      '[data-study-deliverable]': study.deliverable,
      '[data-study-brief]': study.brief,
      '[data-study-delivery]': study.delivery,
      '[data-study-outcome]': study.outcome,
      '.study-cover figcaption': study.image.caption,
    };
    Object.entries(text).forEach(([selector, value]) => { dialog.querySelector(selector).textContent = value; });
    const timeline = dialog.querySelector('[data-study-timeline]');
    if (study.timeline) {
      timeline.hidden = false;
      timeline.querySelector('dd').textContent = study.timeline;
    }
    const website = dialog.querySelector('.study-website');
    if (study.website) website.href = study.website;
    else website.closest('div').hidden = true;
    const cover = dialog.querySelector('.study-cover img');
    if (study.image.screens) cover.replaceWith(createPhones(study.image.screens));
    else setImage(cover, study.image);
    study.scope.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      dialog.querySelector('.study-scope').append(li);
    });
    const metrics = dialog.querySelector('.study-metrics');
    metrics.hidden = !study.metrics.length;
    study.metrics.forEach((metric) => {
      const item = document.createElement('div');
      const value = document.createElement('dd');
      const label = document.createElement('dt');
      const note = document.createElement('small');
      value.textContent = metric.value;
      label.textContent = metric.label;
      note.textContent = metric.note;
      item.append(label, value, note);
      metrics.append(item);
    });
    const gallery = dialog.querySelector('.study-gallery');
    gallery.hidden = !study.gallery.length;
    study.gallery.forEach((image) => {
      const figure = document.createElement('figure');
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      setImage(img, image);
      const caption = document.createElement('figcaption');
      caption.textContent = image.caption;
      figure.append(img, caption);
      gallery.append(figure);
    });
    document.body.append(fragment);
    document.querySelectorAll(`[data-case-study="${study.id}"]`).forEach((button) => { button.hidden = false; });
  });
}

/** Website controls stay native; study buttons and matching fragment links open cards. */
export function initProjectCards() {
  renderCaseStudies();
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('.case-expand, [data-case-study]');
    if (!trigger || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const href = trigger.getAttribute('href');
    const id = trigger.dataset.caseStudy ? `case-study-${trigger.dataset.caseStudy}` : href?.startsWith('#') ? href.slice(1) : null;
    if (!id) return;
    const dialog = document.getElementById(id);
    if (!(dialog instanceof HTMLDialogElement) || dialog.open) return;
    event.preventDefault();
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    const scroll = dialog.querySelector('.study-scroll');
    if (scroll) scroll.scrollTop = 0;
    // Start long-form studies at their title, not at a link halfway through the card.
    dialog.querySelector('.study-title')?.focus({ preventScroll: true });
    document.body.style.overflow = 'hidden';
    function onBackdrop(event) {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    }
    function onCloseButton(event) {
      if (event.target.closest('[data-close-case-study]')) dialog.close();
    }
    function containFocus(event) {
      if (event.key !== 'Tab') return;
      const controls = [...dialog.querySelectorAll('a[href], button:not([disabled]), [tabindex="0"]')]
        .filter((element) => element.getClientRects().length > 0);
      const first = controls[0], last = controls.at(-1);
      if (!first) return;
      const current = document.activeElement;
      if (!controls.includes(current) || (event.shiftKey && current === first) || (!event.shiftKey && current === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    }
    dialog.addEventListener('keydown', containFocus);
    dialog.addEventListener('click', onBackdrop);
    dialog.addEventListener('click', onCloseButton);
    dialog.addEventListener('close', () => {
      document.body.style.overflow = previousOverflow;
      dialog.removeEventListener('click', onBackdrop);
      dialog.removeEventListener('click', onCloseButton);
      dialog.removeEventListener('keydown', containFocus);
      trigger.focus({ preventScroll: true });
    }, { once: true });
  });
}
