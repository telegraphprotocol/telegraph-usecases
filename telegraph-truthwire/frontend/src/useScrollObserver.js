import { useEffect } from 'react';

export const useScrollObserver = () => {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          // Optional: Stop observing once visible if you only want it to happen once
          // observer.unobserve(entry.target);
        } else {
          // Optional: remove if you want elements to animate out when scrolling away
          entry.target.classList.remove('is-visible');
        }
      });
    }, {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    });

    const hiddenElements = document.querySelectorAll('.animate-on-scroll');
    hiddenElements.forEach((el) => observer.observe(el));

    // Cleanup
    return () => {
      hiddenElements.forEach((el) => observer.unobserve(el));
      observer.disconnect();
    };
  }, []); // Note: this runs once on mount. If DOM changes dynamically, you'd need to re-run it.
};
