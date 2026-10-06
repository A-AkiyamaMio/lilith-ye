type MotionRoot = Document | Element;

export function initMotion(root: MotionRoot = document): () => void {
  if (typeof window === 'undefined') return () => {};

  const documentRoot = root instanceof Document ? root.documentElement : root;
  if (documentRoot.hasAttribute('data-motion-ready')) return () => {};
  documentRoot.setAttribute('data-motion-ready', 'true');

  const elements = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduced || !('IntersectionObserver' in window)) {
    elements.forEach((element) => element.setAttribute('data-reveal', 'visible'));
    return () => {};
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.setAttribute('data-reveal', 'visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.14 });

  elements.forEach((element, index) => {
    element.style.transitionDelay = `${Math.min(index * 70, 420)}ms`;
    observer.observe(element);
  });

  return () => observer.disconnect();
}
