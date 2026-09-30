// src/app/layout.jsx
import { Inter, Great_Vibes } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "../components/ServiceWorkerRegister";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const greatVibes = Great_Vibes({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-greatvibes",
  display: "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// ----------------------------------------------------------
// Metadata
// ----------------------------------------------------------
export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Carnavales Chajarí 2027",
    template: "%s | Carnavales Chajarí",
  },
  description:
    "Sistema de inscripción a comparsas y gestión de bailarines - Carnavales Chajarí 2027.",
  applicationName: "Carnaval Chajarí",
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/favicon-32x32.webp", sizes: "32x32", type: "image/webp" },
      { url: "/favicon-16x16.webp", sizes: "16x16", type: "image/webp" },
    ],
    apple: [{ url: "/apple-touch-icon.webp", type: "image/webp" }],
    other: [{ rel: "mask-icon", url: "/safari-pinned-tab.svg", color: "#000000" }],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Carnavales Chajarí",
    title: "Carnavales Chajarí 2027",
    description: "Sistema de inscripción a comparsas y gestión de bailarines.",
    locale: "es_AR",
    images: [
      {
        url: "/og-image.webp",
        width: 1200,
        height: 630,
        alt: "Carnavales Chajarí 2027",
        type: "image/webp",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Carnavales Chajarí 2027",
    description: "Sistema de inscripción a comparsas y gestión de bailarines.",
    images: ["/og-image.webp"],
    creator: "@carnavalchajari",
  },
  appleWebApp: {
    capable: true,
    title: "Carnaval",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false, email: false, address: false },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  keywords: [
    "carnaval", "chajarí", "comparsas", "inscripción",
    "bailarines", "entre ríos", "2027",
  ],
  authors: [{ name: "Carnavales Chajarí" }],
  creator: "Carnavales Chajarí",
  publisher: "Carnavales Chajarí",
};

// ----------------------------------------------------------
// Viewport
// ----------------------------------------------------------
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  colorScheme: "light",
};

// ----------------------------------------------------------
// JSON-LD (schema.org Event)
// ----------------------------------------------------------
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: "Carnavales Chajarí 2027",
  startDate: "2027-01-24T21:00:00-03:00",
  endDate: "2027-02-14T03:00:00-03:00",
  eventStatus: "https://schema.org/EventScheduled",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  description:
    "Los Carnavales de Chajarí 2027: cuatro noches de música, color y pasión con las comparsas Fénix, Sirirí, Aluminé y Amarú.",
  image: [`${SITE_URL}/og-image.webp`],
  url: SITE_URL,
  location: {
    "@type": "Place",
    name: "Chajarí",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Chajarí",
      addressRegion: "Entre Ríos",
      addressCountry: "AR",
    },
  },
  organizer: {
    "@type": "Organization",
    name: "Carnavales Chajarí",
    url: SITE_URL,
  },
  offers: {
    "@type": "Offer",
    availability: "https://schema.org/InStock",
    price: "0",
    priceCurrency: "ARS",
    url: SITE_URL,
  },
  performer: [
    { "@type": "PerformingGroup", name: "Comparsa Fénix (Ferro)" },
    { "@type": "PerformingGroup", name: "Comparsa Sirirí (Vélez)" },
    { "@type": "PerformingGroup", name: "Comparsa Aluminé (Primero de Mayo)" },
    { "@type": "PerformingGroup", name: "Comparsa Amarú (San Clemente)" },
  ],
};

// ----------------------------------------------------------
// Layout
// ----------------------------------------------------------
export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${greatVibes.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
        <ServiceWorkerRegister />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}