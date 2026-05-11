import { useEffect } from 'react';

export const useMousePosition = () => {
  useEffect(() => {
    const handleMouseMove = (e) => {
      // Update CSS variables for raw mouse position on the body
      document.body.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.body.style.setProperty('--mouse-y', `${e.clientY}px`);
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
};

export const GlobalMouseTracker = () => {
  useMousePosition();
  return null;
};
