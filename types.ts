export type MotionEffect = 'none' | 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'pan-up' | 'pan-down' | 'rotate';
export type TransitionEffect = 'fade' | 'slide' | 'zoom-in' | 'zoom-out';

export interface ImageSlide {
  id: string;
  file: File;
  objectUrl: string;
  motion: MotionEffect;
}

export interface SlideshowSettings {
  slideDuration: number; // in seconds
  transitionDuration: number; // in seconds
  transitionEffect: TransitionEffect;
}
