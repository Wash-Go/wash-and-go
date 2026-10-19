import type { OwnerShopView, ShopCatalogItem, ShopServiceRow, UploadsStatus } from '@wash-and-go/domain';
import type { StepErrors, WizardDraft } from '../../lib/wizard';

export type WizardData = {
  shop: OwnerShopView;
  catalog: ShopCatalogItem[];
  services: ShopServiceRow[];
  uploads: UploadsStatus;
};

export type StepProps = {
  draft: WizardDraft;
  set: (patch: Partial<WizardDraft>) => void;
  errors: StepErrors;
  data: WizardData;
};
