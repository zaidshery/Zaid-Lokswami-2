import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lokswami',
    short_name: 'Lokswami',
    description: 'Lokswami news platform',
    start_url: '/',
    display: 'standalone',
    background_color: '#111111',
    theme_color: '#e72129',
    icons: [
      {
        src: '/logo-icon-final.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/logo-icon-final.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
