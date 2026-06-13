import { useEffect } from 'react';
import { StoreStructuredData } from './StructuredData';

interface MetaTagsProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  noindex?: boolean;
}

export const MetaTags: React.FC<MetaTagsProps> = ({
  title = 'OmniShop - Tu Tienda Online Multirrubro',
  description = 'OmniShop es tu tienda online de confianza para tecnología, moda, hogar, deportes, belleza y más. Envíos rápidos, domicilios gratis y los mejores precios.',
  keywords = 'tienda online, ecommerce, saas, compras online, tecnologia, moda, hogar, deportes, belleza, Argentina',
  image,
  url,
  type = 'website',
  noindex = false
}) => {
  useEffect(() => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://omnishop.com';
    const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : baseUrl);
    const ogImage = image || `${baseUrl}/logo.png`;

    // Actualizar título
    document.title = title;

    // Función helper para actualizar o crear meta tags
    const setMetaTag = (name: string, content: string, isProperty = false) => {
      const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let meta = document.querySelector(selector) as HTMLMetaElement;

      if (!meta) {
        meta = document.createElement('meta');
        if (isProperty) {
          meta.setAttribute('property', name);
        } else {
          meta.setAttribute('name', name);
        }
        document.head.appendChild(meta);
      }

      meta.setAttribute('content', content);
    };

    // Meta tags básicos
    setMetaTag('description', description);
    setMetaTag('keywords', keywords);
    if (noindex) {
      setMetaTag('robots', 'noindex, nofollow');
    }

    // Open Graph
    setMetaTag('og:title', title, true);
    setMetaTag('og:description', description, true);
    setMetaTag('og:type', type, true);
    setMetaTag('og:url', currentUrl, true);
    setMetaTag('og:image', ogImage, true);
    setMetaTag('og:image:width', '1200', true);
    setMetaTag('og:image:height', '630', true);
    setMetaTag('og:site_name', 'OmniShop', true);
    setMetaTag('og:locale', 'es_AR', true);

    // Twitter Card
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', title);
    setMetaTag('twitter:description', description);
    setMetaTag('twitter:image', ogImage);
    setMetaTag('twitter:url', currentUrl);

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', currentUrl);

    // Schema.org (via StoreStructuredData component)
  }, [title, description, keywords, image, url, type, noindex]);

  return (
    <>
      <StoreStructuredData
        name="OmniShop"
        description={description}
        url={url || (typeof window !== 'undefined' ? window.location.origin : 'https://omnishop.com')}
      />
    </>
  );
};

