type MotionRoot = Document | Element;

export function initMotion(root: MotionRoot = document): () => void {
  if (typeof window === 'undefined') return () => {};

  const documentRoot = root instanceof Document ? root.documentElement : root;
  if (documentRoot.hasAttribute('data-motion-ready')) return () => {};
  documentRoot.setAttribute('data-motion-ready', 'true');

  const elements = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const cleanups: Array<() => void> = [];

  let observer: IntersectionObserver | undefined;
  if (reduced || !('IntersectionObserver' in window)) {
    elements.forEach((element) => element.setAttribute('data-reveal', 'visible'));
  } else {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove('motion-pending');
        entry.target.setAttribute('data-reveal', 'visible');
        observer?.unobserve(entry.target);
      });
    }, { threshold: 0.14 });

    elements.forEach((element, index) => {
      element.style.transitionDelay = `${Math.min(index * 70, 420)}ms`;
      element.classList.add('motion-pending');
      observer?.observe(element);
    });

    const revealFallback = window.setTimeout(() => {
      elements.forEach((element) => {
        element.classList.remove('motion-pending');
        element.setAttribute('data-reveal', 'visible');
      });
    }, 1400);
    cleanups.push(() => window.clearTimeout(revealFallback));
  }

  if (!reduced && finePointer) {
    const html = document.documentElement;
    const onPointerMove = (event: PointerEvent) => {
      html.style.setProperty('--pointer-x', `${(event.clientX / window.innerWidth) * 100}%`);
      html.style.setProperty('--pointer-y', `${(event.clientY / window.innerHeight) * 100}%`);
      html.style.setProperty('--pointer-x-px', `${event.clientX}px`);
      html.style.setProperty('--pointer-y-px', `${event.clientY}px`);
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    cleanups.push(() => window.removeEventListener('pointermove', onPointerMove));

    root.querySelectorAll<HTMLElement>('[data-tilt]').forEach((card) => {
      const onMove = (event: PointerEvent) => {
        const bounds = card.getBoundingClientRect();
        const localX = ((event.clientX - bounds.left) / bounds.width) * 100;
        const localY = ((event.clientY - bounds.top) / bounds.height) * 100;
        card.style.setProperty('--local-x', `${localX}%`);
        card.style.setProperty('--local-y', `${localY}%`);
        card.style.setProperty('--tilt-x', `${(50 - localY) * 0.055}deg`);
        card.style.setProperty('--tilt-y', `${(localX - 50) * 0.055}deg`);
      };
      const onLeave = () => {
        card.style.setProperty('--tilt-x', '0deg');
        card.style.setProperty('--tilt-y', '0deg');
      };
      card.addEventListener('pointermove', onMove);
      card.addEventListener('pointerleave', onLeave);
      cleanups.push(() => {
        card.removeEventListener('pointermove', onMove);
        card.removeEventListener('pointerleave', onLeave);
      });
    });
  }

  return () => {
    observer?.disconnect();
    cleanups.forEach((cleanup) => cleanup());
    documentRoot.removeAttribute('data-motion-ready');
  };
}
