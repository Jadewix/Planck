document.getElementById('year').textContent = new Date().getFullYear();
const links = [...document.querySelectorAll('.rail nav a')];
const observer = new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) {
    links.forEach(link => link.classList.toggle('active', link.hash === '#' + entry.target.id));
  }
}, {rootMargin: '-10% 0px -55% 0px'});
document.querySelectorAll('main > section[id]').forEach(section => observer.observe(section));
