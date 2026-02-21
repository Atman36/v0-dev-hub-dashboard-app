'use client';

import { ImgHTMLAttributes, ReactNode, useEffect, useState } from 'react';

interface ImageWithFallbackProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  fallback: ReactNode;
}

export function ImageWithFallback({
  src,
  fallback,
  onError,
  ...props
}: ImageWithFallbackProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return <>{fallback}</>;
  }

  return (
    <img
      loading="lazy"
      {...props}
      src={src}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}
