import React, { useState } from "react";

export const TopPromoBar: React.FC<{ setPromoVisible?: (v: boolean) => void }> = ({ setPromoVisible }) => {
  return (
    <div className="bg-white text-black text-[11px] md:text-xs font-semibold tracking-wide py-2.5 text-center w-full z-[60] relative border-b border-gray-200">
      <div className="max-w-[1800px] mx-auto px-2 md:px-4">
        ENVÍO GRATIS A PARTIR DE $150.000 (BS. AS. Y SALTA: ENTREGA INCLUIDA)
      </div>
    </div>
  );
};