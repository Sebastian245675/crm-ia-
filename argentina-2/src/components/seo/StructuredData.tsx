import { useEffect } from 'react';

interface StoreSchemaProps {
  name?: string;
  description?: string;
  url?: string;
  logo?: string;
  address?: {
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry?: string;
  };
  contactPoint?: {
    telephone?: string;
    contactType?: string;
    areaServed?: string;
  };
}

interface ProductSchemaProps {
  name: string;
  description: string;
  image: string | string[];
  price: number;
  currency?: string;
  availability?: string;
  sku?: string;
  brand?: string;
  category?: string;
  url?: string;
}

export const StoreStructuredData: React.FC<StoreSchemaProps> = ({
  name = 'OmniShop',
  description = 'OmniShop es tu tienda online de confianza para tecnología, moda, hogar, deportes, belleza y más.',
  url = typeof window !== 'undefined' ? window.location.origin : 'https://omnishop.com',
  logo = typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : 'https://omnishop.com/logo.png',
  address = {
    addressCountry: 'AR'
  },
  contactPoint = {
    contactType: 'customer service',
    areaServed: 'AR'
  }
}) => {
  useEffect(() => {
    // Eliminar schema existente si hay
    const existingScript = document.querySelector('script[type="application/ld+json"][data-store-schema]');
    if (existingScript) {
      existingScript.remove();
    }

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Store',
      name,
      description,
      url,
      logo,
      image: logo,
      address: {
        '@type': 'PostalAddress',
        addressCountry: address.addressCountry || 'AR',
        ...(address.streetAddress && { streetAddress: address.streetAddress }),
        ...(address.addressLocality && { addressLocality: address.addressLocality }),
        ...(address.addressRegion && { addressRegion: address.addressRegion }),
        ...(address.postalCode && { postalCode: address.postalCode })
      },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: contactPoint.contactType || 'customer service',
        areaServed: contactPoint.areaServed || 'AR',
        ...(contactPoint.telephone && { telephone: contactPoint.telephone })
      },
      sameAs: [
        // Enlaces a redes sociales de la tienda
      ],
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${url}/?search={search_term_string}`
        },
        'query-input': 'required name=search_term_string'
      }
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-store-schema', 'true');
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => {
      const scriptToRemove = document.querySelector('script[type="application/ld+json"][data-store-schema]');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [name, description, url, logo, address, contactPoint]);

  return null;
};

export const ProductStructuredData: React.FC<ProductSchemaProps> = ({
  name,
  description,
  image,
  price,
  currency = 'ARS',
  availability = 'https://schema.org/InStock',
  sku,
  brand = 'OmniShop',
  category,
  url = typeof window !== 'undefined' ? window.location.href : ''
}) => {
  useEffect(() => {
    // Eliminar schema existente si hay
    const existingScript = document.querySelector('script[type="application/ld+json"][data-product-schema]');
    if (existingScript) {
      existingScript.remove();
    }

    const images = Array.isArray(image) ? image : [image];

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name,
      description,
      image: images,
      brand: {
        '@type': 'Brand',
        name: brand
      },
      offers: {
        '@type': 'Offer',
        price,
        priceCurrency: currency,
        availability: availability,
        url: url,
        ...(sku && { sku })
      },
      ...(category && { category })
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-product-schema', 'true');
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => {
      const scriptToRemove = document.querySelector('script[type="application/ld+json"][data-product-schema]');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [name, description, image, price, currency, availability, sku, brand, category, url]);

  return null;
};

export const BreadcrumbStructuredData: React.FC<{ items: Array<{ name: string; url: string }> }> = ({ items }) => {
  useEffect(() => {
    const existingScript = document.querySelector('script[type="application/ld+json"][data-breadcrumb-schema]');
    if (existingScript) {
      existingScript.remove();
    }

    const schema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url
      }))
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-breadcrumb-schema', 'true');
    script.text = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => {
      const scriptToRemove = document.querySelector('script[type="application/ld+json"][data-breadcrumb-schema]');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [items]);

  return null;
};

