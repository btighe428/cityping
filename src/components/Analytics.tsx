'use client'

import Script from 'next/script'

// Google Analytics & Google Tag
const GA_ID = 'G-H62TBZYY9K'
const GT_ID = 'GT-NC6ZMGQ5'

export default function Analytics() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
          gtag('config', '${GT_ID}');
        `}
      </Script>
    </>
  )
}
