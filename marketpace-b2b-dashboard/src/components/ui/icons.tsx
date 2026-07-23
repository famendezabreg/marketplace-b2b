interface IconProps {
  className?: string;
}

const base = {
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** Resumen / dashboard: cuadrante de manometro */
export function IconDial({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M3.5 14.5a6.5 6.5 0 1 1 13 0" />
      <path d="M10 14.5 13.2 9" />
      <circle cx="10" cy="14.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Contenedor de carga: usado para "mis productos" */
export function IconContainer({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <rect x="3.5" y="4" width="13" height="12" rx="0.5" />
      <path d="M7 4v12M10 4v12M13 4v12" />
    </svg>
  );
}

/** Tarima / pallet: rejilla con cruces, usado para catalogo */
export function IconPallet({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <rect x="3" y="3" width="14" height="14" />
      <path d="M10 3v14M3 10h14" />
      <path d="M5 5l3 3M8 5l-3 3M12 5l3 3M15 5l-3 3M5 12l3 3M8 12l-3 3M12 12l3 3M15 12l-3 3" />
    </svg>
  );
}

/** Camion de reparto: usado para ordenes */
export function IconTruck({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <rect x="2.5" y="7" width="9" height="7" />
      <path d="M11.5 9.5h3.2l2.3 2.3V14h-5.5z" />
      <circle cx="6" cy="15.5" r="1.4" />
      <circle cx="14" cy="15.5" r="1.4" />
    </svg>
  );
}

/** Sello de aduana: circulo doble + check, usado para liquidaciones */
export function IconSeal({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <circle cx="10" cy="10" r="6.5" />
      <circle cx="10" cy="10" r="4.3" />
      <path d="M7.8 10.1 9.2 11.6 12.3 8.4" />
    </svg>
  );
}

/** Folio doblado: hoja con esquina cortada + lineas, usado para cotizaciones */
export function IconFolio({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M5 3.5h7l3 3v10H5z" />
      <path d="M12 3.5v3h3" />
      <path d="M7.3 10h5.4M7.3 12.3h5.4M7.3 14.6h3.4" />
    </svg>
  );
}

/** Etiqueta / tag: usado para categorias de comision */
export function IconTag({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M10.5 3.5h4.5a1.5 1.5 0 0 1 1.5 1.5v4.5a1.5 1.5 0 0 1-.44 1.06l-6.5 6.5a1.5 1.5 0 0 1-2.12 0l-4.5-4.5a1.5 1.5 0 0 1 0-2.12l6.5-6.5a1.5 1.5 0 0 1 1.06-.44Z" />
      <circle cx="13.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Persona: usado para perfil */
export function IconPerson({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <circle cx="10" cy="6.8" r="3.2" />
      <path d="M3.8 17c.7-3.4 3.4-5.3 6.2-5.3s5.5 1.9 6.2 5.3" />
    </svg>
  );
}

/** Dos personas: usado para directorios de proveedores/compradores */
export function IconPeople({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <circle cx="7.3" cy="6.8" r="2.6" />
      <circle cx="14.2" cy="7.6" r="2.1" />
      <path d="M2.5 17c.6-3 2.9-4.7 4.8-4.7s3.9 1.4 4.6 3.6" />
      <path d="M12.5 12.6c1.9.1 3.6 1.5 4.2 4" />
    </svg>
  );
}

/** Salida / cerrar sesion */
export function IconExit({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M8 17H4.5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1H8" />
      <path d="M13 14l4-4-4-4" />
      <path d="M17 10H7.5" />
    </svg>
  );
}
