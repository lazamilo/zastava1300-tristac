import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { Flip } from 'gsap/Flip';
import { CustomEase } from 'gsap/CustomEase';

let registered = false;

// Registers plugins and the custom eases shared by every entrance animation.
export function registerGsap() {
  if (registered) return;
  registered = true;
  gsap.registerPlugin(ScrollTrigger, SplitText, Flip, CustomEase);
  CustomEase.create('tristac', 'M0,0 C0.16,1 0.3,1 1,1');
  CustomEase.create('tristac-soft', 'M0,0 C0.4,0 0.1,1 1,1');
  gsap.defaults({ ease: 'tristac', duration: 1.2 });
}

// Global ScrollTrigger behaviour: no refresh on mobile toolbar resize, no lag smoothing.
export function configureScrollTrigger() {
  ScrollTrigger.config({ ignoreMobileResize: true, autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load' });
  gsap.ticker.lagSmoothing(0);
}

export { gsap, ScrollTrigger, SplitText, Flip, CustomEase };
