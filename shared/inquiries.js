export const projectTypes = {
  mobile: { label: 'Mobile application', description: 'An app for your customers or your team.', fields: [
    { name: 'platform', label: 'Which platforms do you need?', options: ['iOS', 'Android', 'Both iOS and Android', 'Help me decide'] },
    { name: 'stage', label: 'Where is the project now?', options: ['A new idea', 'Designs are ready', 'An existing app needs work', 'Not sure yet'] },
  ] },
  web: { label: 'Website or web application', description: 'A website, customer platform, or internal tool.', fields: [
    { name: 'websiteType', label: 'What are you planning?', options: ['A business website', 'An online store', 'A customer-facing web app', 'An internal business tool', 'Not sure yet'] },
    { name: 'integrations', label: 'Does it need to connect to other tools? (optional)', placeholder: 'For example, payments, WhatsApp, bookings, or your existing software.', multiline: true, optional: true },
  ] },
  design: { label: 'UI/UX design', description: 'A new interface or a redesign of an existing product.', fields: [
    { name: 'designTarget', label: 'What needs designing?', options: ['A website', 'A mobile app', 'A web application', 'More than one of these', 'Help me decide'] },
    { name: 'designScope', label: 'What would you like us to handle?', options: ['Design only', 'Design and development', 'Help me define the scope'] },
    { name: 'existingUrl', label: 'Existing website or product link (optional)', placeholder: 'https://example.com', type: 'url', optional: true },
  ] },
  unsure: { label: 'I’d like your advice', description: 'You know the problem. We can help define the project.', fields: [
    { name: 'guidance', label: 'Where would advice help most?', options: ['Choosing what to build', 'Defining the features and scope', 'Improving an existing product', 'Something else'] },
  ] },
};

const limits = { name: 120, email: 254, company: 160, description: 4000, budget: 160, timeline: 160 };
export function validateInquiry(input) {
  const errors = {};
  const data = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { errors: { form: 'Please check your project details.' } };
  for (const [key, max] of Object.entries(limits)) {
    const value = typeof input[key] === 'string' ? input[key].trim() : '';
    data[key] = value;
    if (key !== 'company' && !value) errors[key] = 'Please complete this field.';
    if (value.length > max) errors[key] = `Please keep this under ${max} characters.`;
  }
  if (data.name && data.name.length < 2) errors.name = 'Please enter your name.';
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Please enter a valid email address.';
  if (data.description && data.description.length < 20) errors.description = 'Tell us a little more (at least 20 characters).';
  data.projectType = input.projectType;
  const type = Object.hasOwn(projectTypes, data.projectType) ? projectTypes[data.projectType] : null;
  if (!type) errors.projectType = 'Please choose a project type.';
  data.answers = {};
  for (const field of type?.fields ?? []) {
    const value = typeof input.answers?.[field.name] === 'string' ? input.answers[field.name].trim() : '';
    if (!value && !field.optional) errors[field.name] = 'Please choose an answer.';
    if (value.length > 2000) errors[field.name] = 'Please keep this under 2,000 characters.';
    if (value && field.options && !field.options.includes(value)) errors[field.name] = 'Please select one of the available options.';
    if (value && field.type === 'url') {
      try { if (!['http:', 'https:'].includes(new URL(value).protocol)) throw new Error(); }
      catch { errors[field.name] = 'Please use a full http:// or https:// address.'; }
    }
    data.answers[field.name] = value;
  }
  if (input.consent !== true) errors.consent = 'Please confirm we can contact you about your project.';
  data.consent = input.consent === true;
  if (typeof input.id !== 'string' || !/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(input.id)) errors.form = 'Please reload the form and try again.';
  data.id = input.id;
  if (input.companyWebsiteConfirmation) errors.form = 'Please check your details and try again.';
  return Object.keys(errors).length ? { errors } : { data };
}
