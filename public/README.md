# 📦 Paquete de Íconos Web

Incluye todos los íconos estándar en versiones Light y Dark.

## Archivos incluidos
- favicon-16x16.webp
- favicon-32x32.webp
- apple-touch-icon.webp
- android-chrome-192x192.webp
- android-chrome-512x512.webp
- og-image.webp
- safari-pinned-tab.svg
- site.webmanifest
- ...y sus equivalentes *-dark.webp*

## Uso en HTML clásico
```html
<link rel="icon" href="/favicon-32x32.webp" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.webp">
<link rel="manifest" href="/site.webmanifest">
<link rel="mask-icon" href="/safari-pinned-tab.svg" color="#000000">
<meta property="og:image" content="/og-image.webp">
```

## Uso en Next.js 15 (App Router)
En `layout.jsx`:

```js
export const metadata = {
  title: "Mi Sitio",
  description: "Descripción de mi sitio",
  icons: {
    icon: [
      { url: "/favicon-32x32.webp", media: "(prefers-color-scheme: light)" },
      { url: "/favicon-32x32-dark.webp", media: "(prefers-color-scheme: dark)" }
    ],
    apple: [
      { url: "/apple-touch-icon.webp", media: "(prefers-color-scheme: light)" },
      { url: "/apple-touch-icon-dark.webp", media: "(prefers-color-scheme: dark)" }
    ]
  },
  manifest: "/site.webmanifest",
  openGraph: {
    images: ["/og-image.webp"]
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-image.webp"]
  }
};
```
