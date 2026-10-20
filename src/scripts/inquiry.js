import { projectTypes } from '../../shared/inquiries.js';

export function initInquiry() {
  const dialog = document.querySelector('#inquiry-dialog');
  const form = document.querySelector('#inquiry-form');
  const steps = [...form.querySelectorAll('.inquiry-step')];
  const progress = document.querySelector('.inquiry-progress');
  const next = form.querySelector('[data-inquiry-next]');
  const back = form.querySelector('[data-inquiry-back]');
  const submit = form.querySelector('[data-inquiry-submit]');
  const error = form.querySelector('.inquiry-error');
  const success = dialog.querySelector('.inquiry-success');
  const questions = document.querySelector('#project-questions');
  let step = 0, selectedType = '', pending = false, previousOverflow = '', opener;
  let lastFingerprint = '', submissionId = '';

  Object.entries(projectTypes).forEach(([key, type]) => {
    const label = document.createElement('label');
    label.className = 'project-type-option';
    const input = document.createElement('input');
    input.type = 'radio'; input.name = 'projectType'; input.value = key; input.required = true;
    const copy = document.createElement('span');
    const title = document.createElement('strong'); title.textContent = type.label;
    const description = document.createElement('small'); description.textContent = type.description;
    copy.append(title, description); label.append(input, copy);
    form.querySelector('.project-type-options').append(label);
  });

  function value(name) { return form.elements.namedItem(name)?.value ?? ''; }
  function renderQuestions() {
    const type = value('projectType');
    if (type === selectedType) return;
    selectedType = type;
    questions.replaceChildren();
    for (const field of projectTypes[type]?.fields ?? []) {
      const label = document.createElement('label');
      label.htmlFor = `inquiry-${field.name}`; label.textContent = field.label;
      let input;
      if (field.options) {
        input = document.createElement('select');
        input.add(new Option('Choose an answer', ''));
        field.options.forEach((option) => input.add(new Option(option, option)));
      } else input = document.createElement(field.multiline ? 'textarea' : 'input');
      input.id = label.htmlFor; input.name = field.name; input.required = !field.optional;
      if (!field.options) { input.maxLength = 2000; input.placeholder = field.placeholder; }
      if (field.type) input.type = field.type;
      if (field.multiline) input.rows = 3;
      questions.append(label, input);
    }
  }
  function showStep(number, focus = true) {
    step = number;
    steps.forEach((fieldset, index) => { fieldset.hidden = index !== step; fieldset.disabled = index !== step || pending; });
    [...progress.children].forEach((item, index) => {
      if (index === step) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current');
    });
    back.hidden = step === 0; next.hidden = step === 2; submit.hidden = step !== 2;
    error.hidden = true;
    if (focus && dialog.open) {
      dialog.querySelector('.inquiry-scroll').scrollTop = 0;
      const legend = steps[step].querySelector('legend'); legend.tabIndex = -1; legend.focus({ preventScroll: true });
    }
  }
  function validStep() {
    return [...steps[step].querySelectorAll('input, textarea, select')].every((input) => !input.willValidate || input.reportValidity());
  }
  function open(trigger) {
    opener = trigger;
    if (!success.hidden) {
      form.reset(); selectedType = ''; questions.replaceChildren();
      form.hidden = false; progress.hidden = false; success.hidden = true;
      lastFingerprint = ''; submissionId = ''; showStep(0, false);
    }
    previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    showStep(step);
  }
  document.querySelectorAll('[data-open-inquiry]').forEach((button) => { button.hidden = false; });
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-open-inquiry]');
    if (!trigger || dialog.open) return;
    const study = trigger.closest('dialog');
    if (study?.open) {
      const returnTo = document.querySelector(`[aria-controls="${study.id}"]`) || trigger;
      study.addEventListener('close', () => open(returnTo), { once: true });
      study.close();
    } else open(trigger);
  });
  dialog.querySelectorAll('[data-close-inquiry]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => { document.body.style.overflow = previousOverflow; opener?.focus({ preventScroll: true }); });
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll('button, input, select, textarea, a[href]')].filter((el) => !el.matches(':disabled') && !el.closest('[hidden], .inquiry-trap') && el.getClientRects().length);
    const first = controls[0], last = controls.at(-1), current = document.activeElement;
    if (!first) return;
    if (!controls.includes(current) || (event.shiftKey && current === first) || (!event.shiftKey && current === last)) {
      event.preventDefault(); (event.shiftKey ? last : first).focus();
    }
  });
  next.addEventListener('click', () => { if (validStep()) { renderQuestions(); showStep(step + 1); } });
  back.addEventListener('click', () => showStep(step - 1));
  form.addEventListener('input', (event) => { event.target.setCustomValidity?.(''); event.target.removeAttribute('aria-invalid'); error.hidden = true; });
  form.addEventListener('change', (event) => { if (event.target.name === 'projectType') renderQuestions(); });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (pending || !validStep()) return;
    if (step < 2) { renderQuestions(); showStep(step + 1); return; }
    const fields = ['name', 'email', 'company', 'description', 'budget', 'timeline', 'projectType', 'companyWebsiteConfirmation'];
    const payload = Object.fromEntries(fields.map((name) => [name, value(name)]));
    payload.answers = Object.fromEntries(projectTypes[selectedType].fields.map((field) => [field.name, value(field.name)]));
    payload.consent = form.elements.namedItem('consent').checked;
    const fingerprint = JSON.stringify(payload);
    if (fingerprint !== lastFingerprint) { submissionId = crypto.randomUUID(); lastFingerprint = fingerprint; }
    payload.id = submissionId;
    pending = true; submit.disabled = true; back.disabled = true; steps[step].disabled = true; submit.textContent = 'Sending…'; error.hidden = true;
    try {
      const response = await fetch('/api/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(20000) });
      const result = await response.json().catch(() => { throw new Error('We couldn’t send your inquiry. Please try again or contact us by email.'); });
      if (!response.ok || result.ok !== true || result.id !== payload.id) {
        if (result.fields) {
          let invalidStep;
          for (const [name, message] of Object.entries(result.fields)) {
            const input = form.elements.namedItem(name);
            if (input instanceof HTMLElement && input.setCustomValidity) {
              input.setCustomValidity(message); input.setAttribute('aria-invalid', 'true');
              invalidStep ??= Number(input.closest('[data-step]')?.dataset.step);
            }
          }
          if (Number.isInteger(invalidStep)) showStep(invalidStep);
        }
        throw new Error(result.error || 'We couldn’t confirm your inquiry was saved. Please try again.');
      }
      form.hidden = true; progress.hidden = true; success.hidden = false;
      if (dialog.open) success.focus({ preventScroll: true });
    } catch (failure) {
      error.querySelector('p').textContent = failure.name === 'TimeoutError' || failure instanceof TypeError ? 'We couldn’t confirm your inquiry was saved. Please try again. Your details are still here.' : failure.message;
      error.hidden = false;
      if (dialog.open) error.scrollIntoView({ block: 'nearest' });
    } finally {
      pending = false; submit.disabled = false; back.disabled = false; steps[step].disabled = false; submit.textContent = 'Send project inquiry';
    }
  });
}
