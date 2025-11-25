import { useRef, useCallback } from 'react';
import { Animated, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

interface UseScrollAnimationProps {
  headerHeight: number;
}

export function useScrollAnimation({ headerHeight }: UseScrollAnimationProps) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const scrollDirection = useRef<'up' | 'down'>('down');

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, headerHeight],
    outputRange: [0, -headerHeight],
    extrapolate: 'clamp',
  });

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    
    // Determine scroll direction
    if (currentScrollY > lastScrollY.current && currentScrollY > 0) {
      scrollDirection.current = 'down';
    } else if (currentScrollY < lastScrollY.current) {
      scrollDirection.current = 'up';
    }
    
    lastScrollY.current = currentScrollY;
    
    // Update animated value
    scrollY.setValue(currentScrollY);
  }, [scrollY]);

  const scrollEventThrottle = 16; // ~60fps

  return {
    scrollY,
    headerTranslateY,
    handleScroll,
    scrollEventThrottle,
  };
}
