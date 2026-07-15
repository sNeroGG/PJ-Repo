export const branding = {
  name: 'DelMatus',
  shortName: 'DelMatus',
  tagline: 'Pastoral Juvenil Parroquial',
  portalBadge: 'Portal juvenil DelMatus',
  heroTitle: 'DelMatus',
  heroSubtitle: 'Un espacio de encuentro, oración y servicio para los jóvenes de la parroquia.',
  footerTagline: 'Unidos en la fe, sirviendo con alegría.',
  adminTitle: 'DelMatus Admin',
  adminSubtitle: 'Panel de control',
  adminWelcome: 'Bienvenido al panel de DelMatus',
  adminLoginTitle: 'DelMatus Admin',
  adminLoginSubtitle: 'Ingresa la contraseña para acceder al panel de administración.',
  metadataTitle: 'DelMatus — Portal Juvenil',
  metadataDescription: 'Formularios, registros y calendario para la Pastoral Juvenil DelMatus.',
  pdfHeader: 'Registro DelMatus',
};

export function brandTitle(accent) {
  return accent ? `${branding.name} ${accent}` : branding.name;
}
