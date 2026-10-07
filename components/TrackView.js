'use client';
import { useEffect } from 'react';
import { viewContent } from '@/lib/metaPixel';

export default function TrackView({ product }) {
  useEffect(() => { viewContent(product); }, [product]);
  return null;
}
