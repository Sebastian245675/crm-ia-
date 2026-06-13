import React, { useEffect, useRef } from 'react';

interface CustomCodeTiendaProps {
  htmlCode?: string;
  cssCode?: string;
  jsCode?: string;
  elementId: string;
}

export const CustomCodeTienda: React.FC<CustomCodeTiendaProps> = ({
  htmlCode = '',
  cssCode = '',
  jsCode = '',
  elementId
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous elements inside container
    containerRef.current.innerHTML = '';

    // Create wrapper for the custom HTML
    const wrapper = document.createElement('div');
    wrapper.id = `custom-code-wrapper-${elementId}`;
    wrapper.innerHTML = htmlCode;

    // Inject custom CSS
    const styleId = `style-${elementId}`;
    let styleTag = document.getElementById(styleId) as HTMLStyleElement;
    if (cssCode) {
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = styleId;
        document.head.appendChild(styleTag);
      }
      styleTag.innerHTML = cssCode;
    } else if (styleTag) {
      styleTag.remove();
    }

    containerRef.current.appendChild(wrapper);

    // Execute custom JS
    const scriptId = `script-${elementId}`;
    const oldScript = document.getElementById(scriptId);
    if (oldScript) {
      oldScript.remove();
    }

    if (jsCode) {
      const scriptTag = document.createElement('script');
      scriptTag.id = scriptId;
      scriptTag.innerHTML = `
        (function() {
          try {
            ${jsCode}
          } catch(err) {
            console.error("Error en JS Personalizado [${elementId}]:", err);
          }
        })();
      `;
      document.body.appendChild(scriptTag);
    }

    // Cleanup styles and scripts when updating or unmounting
    return () => {
      const styleToClean = document.getElementById(`style-${elementId}`);
      if (styleToClean) {
        styleToClean.remove();
      }
      const scriptToClean = document.getElementById(`script-${elementId}`);
      if (scriptToClean) {
        scriptToClean.remove();
      }
    };
  }, [htmlCode, cssCode, jsCode, elementId]);

  return (
    <div className="w-full relative" ref={containerRef} />
  );
};
