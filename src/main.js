import './styles/site.css';
import { initNavigation } from './scripts/navigation.js';
import { initMotion } from './scripts/motion.js';
import { initProjectCards } from './scripts/project-cards.js';
import { initParticles } from './scripts/particles.js';

initNavigation();
initMotion();
initParticles();
initProjectCards();
document.querySelector('#year').textContent = new Date().getFullYear();
