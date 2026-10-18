import React from 'react';

export default function BrandPageHeader({ title, subtitle, trailing, className = '', sticky = true }) {
  return (
    <header className={`brand-page-header ${sticky ? 'is-sticky' : ''} ${className}`}>
      <div className="brand-page-heading">
        <img src="/bekasikab.png" alt="Lambang Kabupaten Bekasi" />
        <div className="min-w-0">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {trailing && <div className="brand-page-trailing">{trailing}</div>}
    </header>
  );
}
