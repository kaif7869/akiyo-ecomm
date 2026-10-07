import type { Metadata } from "next";
import { Newsreader, Red_Hat_Text } from "next/font/google";
import Script from "next/script";
import { CartProvider } from "@/lib/cart-context";
import { FirstOrderPromo } from "@/components/promo/first-order-promo";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-heading",
  display: "swap",
});

const redHatText = Red_Hat_Text({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Akiyo · Museum-quality wallpapers",
  description:
    "Exclusive impasto wallpapers for desktop and mobile. Created in exceptional 4K–6K+ resolution to preserve every brushstroke.",
  icons: {
    icon: "https://akiyo.co.uk/cdn/shop/files/favicon_2.png?crop=center&height=32&v=1784570322&width=32",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${redHatText.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <CartProvider>
          {children}
          <FirstOrderPromo />
        </CartProvider>
        {/* PhonePe Mercury Standard Checkout Web Bundle */}
        <Script
          src="https://mercury.phonepe.com/web/bundle/checkout.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
