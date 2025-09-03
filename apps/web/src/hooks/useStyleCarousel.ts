import { useState, useEffect } from 'react';

export const useStyleCarousel = <T>(items: T[], interval: number = 4000) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (items.length === 0) return;

    const intervalId = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, interval);

    return () => clearInterval(intervalId);
  }, [items.length, interval]);

  const goToIndex = (index: number) => {
    if (index >= 0 && index < items.length) {
      setCurrentIndex(index);
    }
  };

  const currentItem = items[currentIndex];

  return {
    currentIndex,
    currentItem,
    goToIndex,
  };
};