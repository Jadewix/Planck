import './styles/site.css';
import { initNavigation } from './scripts/navigation.js';
import { initMotion } from './scripts/motion.js';
import { initParticles } from './scripts/particles.js';

initNavigation();
initMotion();
initParticles();
document.querySelector('#year').textContent = new Date().getFullYear();
