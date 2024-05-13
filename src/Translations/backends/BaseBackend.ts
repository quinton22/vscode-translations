import { BackendModule } from 'i18next';

export interface BaseBackendModule extends BackendModule {
  allNamespaces: string[];
  allLanguages: string[];
}
