import './styles/site.css';
import { initInquiry } from './scripts/inquiry.js';
import { initNavigation } from './scripts/navigation.js';
import { initMotion } from './scripts/motion.js';
import { initProjectCards } from './scripts/project-cards.js';
import { initParticles } from './scripts/particles.js';

initNavigation();
initMotion();
initParticles();
initProjectCards();
initInquiry();
document.querySelector('#year').textContent = new Date().getFullYear();
