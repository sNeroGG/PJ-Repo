export function getActiveFormsCount(forms) {
  return forms.filter(f => f.isActive).length;
}

export function shouldHideNavbarOnFormLink(settings, forms) {
  return settings?.mode === 'single_form' && getActiveFormsCount(forms) >= 2;
}

export function shouldShowMaintenanceBlock(settings, forms) {
  return settings?.mode === 'single_form' && getActiveFormsCount(forms) >= 2;
}
