import type { OwnerShopView, ShopCatalogItem, ShopServiceRow, UploadsStatus } from '@wash-and-go/domain';
import type { StepErrors, WizardDraft } from '../../lib/wizard';

export type WizardData = {
  shop: OwnerShopView;
  catalog: ShopCatalogItem[];
  services: ShopServiceRow[];
  uploads: UploadsStatus;
};

// The details, location and hours fields are shared by the wizard and the
// Shop page (/shop), so they take only the form, not the wizard's data.
export type FieldProps = {
  draft: WizardDraft;
  set: (patch: Partial<WizardDraft>) => void;
  errors: StepErrors;
};

export type StepProps = FieldProps & { data: WizardData };
