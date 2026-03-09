import React from 'react';

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Reusable Container component for consistent max-width and padding
 * Removes the need to repeat: max-w-6xl mx-auto px-4 sm:px-6 lg:px-8
 */
export default function Container({ children, className = '' }: ContainerProps) {
  return (
    <div className={`mx-auto w-full max-w-[86rem] px-3 sm:px-5 lg:px-6 xl:px-8 ${className}`}>
      {children}
    </div>
  );
}
