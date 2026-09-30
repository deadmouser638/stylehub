import React, { useEffect } from 'react';

/**
 * Helper component to set meta tags, title, OG tags, Twitter cards, canonical link, and JSON-LD schema dynamically.
 */
export default function SEO({
  title = 'ElectroHub - Electronics Online Store | Smartphones, Laptops, TVs & Appliances',
  description = 'Shop the latest smartphones, laptops, 4K TVs, cameras, refrigerators, and smart home electronics on ElectroHub. Best prices, 100% genuine products, free delivery, and instant warranty.',
  keywords = 'electronics online, buy smartphone, buy laptop online, 4K smart TV, home appliances, camera store, ElectroHub',
  image = 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1200&q=80',
  url = window.location.href,
  type = 'website',
  schemaJson = null,
}) {
  useEffect(() => {
    // 1. Update Document Title
    const fullTitle = title.includes('ElectroHub') ? title : `${title} | ElectroHub`;
    document.title = fullTitle;

    // 2. Helper function to update or create meta elements
    const setMeta = (attr, attrValue, content) => {
      let element = document.querySelector(`meta[${attr}="${attrValue}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, attrValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // 3. Helper function to update or create link elements
    const setLink = (rel, href) => {
      let element = document.querySelector(`link[rel="${rel}"]`);
      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', rel);
        document.head.appendChild(element);
      }
      element.setAttribute('href', href);
    };

    // Standard Meta Tags
    setMeta('name', 'description', description);
    setMeta('name', 'keywords', keywords);
    setMeta('name', 'robots', 'index, follow');

    // Open Graph Tags
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:image', image);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:type', type);
    setMeta('property', 'og:site_name', 'ElectroHub');

    // Twitter Tags
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', image);

    // Canonical Tag
    setLink('canonical', url);

    // JSON-LD Structured Data Injection
    let scriptTag = document.getElementById('json-ld-schema');
    if (schemaJson) {
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = 'json-ld-schema';
        scriptTag.type = 'application/ld+json';
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(schemaJson);
    } else if (scriptTag) {
      scriptTag.remove();
    }
  }, [title, description, keywords, image, url, type, schemaJson]);

  return null;
}
