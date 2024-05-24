import {
  BackendModule,
  ExistsFunction,
  InitOptions,
  TFunction,
  TOptions,
  createInstance,
} from 'i18next';
import ChainedBackend from 'i18next-chained-backend';
import { ContentfulBackend, FsBackend } from './backends';
import { v4 } from 'uuid';
import { ConfigObserver } from '../Observers';
import { NormalizedTranslationValue } from '../types';
import { WorkspaceConfiguration } from 'vscode';

enum BackendType {
  fs = 'fileSystem',
  contentful = 'contentful',
}

export class Translations {
  private static i18nInstance = createInstance();
  private static initOptions: any = undefined;
  private static i18nConfig: Pick<TOptions, 'ns' | 'lngs' | 'fallbackLng'> = {};
  private static _isLoaded = false;
  private static onLoadFns = new Map<string, () => void>();
  private static configObserver = new ConfigObserver();
  private static unsubscribe?: () => void;
  private static loadError?: boolean;

  public static get isLoaded() {
    return this._isLoaded;
  }

  private static set isLoaded(value: boolean) {
    this._isLoaded = value;
    if (this._isLoaded) {
      this.onLoadFns.forEach((v) => v());
    }
  }

  public static onLoad(fn: () => void) {
    if (this._isLoaded) {
      fn();
    }

    const key = v4();
    this.onLoadFns.set(key, fn);
    return {
      dispose: () => {
        this.onLoadFns.has(key) && this.onLoadFns.delete(key);
      },
    };
  }

  private static getBackend(): {
    backends: BackendModule[];
    backendOptions: any[];
  } {
    const backendModules: Record<BackendType, BackendModule> = {
      [BackendType.contentful]: new ContentfulBackend(),
      [BackendType.fs]: new FsBackend(),
    };

    const enabledBackends: Array<BackendType> =
      this.configObserver.current?.get('backend.list') ?? [];

    const backends = enabledBackends.map((b) => backendModules[b]);

    const backendOptions = enabledBackends.map((item) =>
      this.configObserver.current?.get(`backend.${item}Options`)
    );

    return {
      backends,
      backendOptions,
    };
  }

  public static async init(options: Omit<InitOptions, 'ns' | 'load'> = {}) {
    if (this.i18nInstance.isInitialized && this.initOptions === options) {
      return;
    }

    this.initOptions = options;

    if (this.configObserver.current) {
      await this.load(options, this.configObserver.current);
    }

    this.unsubscribe?.();

    this.unsubscribe = this.configObserver.subscribe(async (config) => {
      await this.load(options, config);
    });
  }

  private static async load(
    options: Omit<InitOptions, 'ns' | 'load'>,
    config: WorkspaceConfiguration
  ) {
    this.initOptions = options;

    let {
      defaultNS,
      namespaces: ns = ['translation'],
      supportedLngs = ['en-US'],
    } = config.get<{
      defaultNS?: string;
      namespaces?: string | string[];
      supportedLngs?: string[];
    }>('i18nOptions') ?? {};

    defaultNS ||= undefined;

    const i18nConfig = {
      ns: typeof ns === 'string' ? [ns] : ns,
      lngs: supportedLngs,
    };

    if (
      this.i18nInstance.isInitialized &&
      this.initOptions === options &&
      this.i18nConfig === i18nConfig
    ) {
      return;
    }

    this.i18nConfig = i18nConfig;

    await this.i18nInstance.use(ChainedBackend).init(
      {
        ...options,
        debug: true,
        defaultNS,
        ns,
        supportedLngs,
        fallbackNS: defaultNS ?? ['translation'],
        preload: supportedLngs,
        load: 'currentOnly' as const,
        // TODO: save missing feature?
        // saveMissing: true,
        // saveMissingTo: 'all',
        backend: this.getBackend(),
        initImmediate: false,
      },
      (e) => {
        this.isLoaded = true;
        if (e) {
          console.error('[Translations]', 'Error loading translations', e);
          // TODO: display error popup
          this.loadError = true;
          return;
        }

        this.loadError = undefined;
      }
    );
  }

  private static getOptions<T extends Parameters<TFunction | ExistsFunction>>(
    ...args: T
  ): [key: T[0], options: TOptions] {
    const [key, defaultOrOptions, optionsOrUndefined] = args;
    const options =
      (typeof defaultOrOptions === 'string'
        ? optionsOrUndefined
        : defaultOrOptions) ?? {};

    if (typeof defaultOrOptions === 'string') {
      options.defaultValue = defaultOrOptions;
    }

    for (const key in this.i18nConfig) {
      options[key] ??=
        this.i18nConfig[
          key as keyof Pick<TOptions, 'ns' | 'fallbackLng' | 'lngs'>
        ];
    }
    options.defaultValue ||= false;

    return [key, options];
  }

  public static exists(...args: Parameters<ExistsFunction>) {
    try {
      return this.i18nInstance.exists(...this.getOptions(...args));
    } catch (e) {
      console.error('[Translations]', 'exists', e);
    }
  }

  public static translate(...args: Parameters<TFunction>) {
    try {
      return this.i18nInstance.t(...this.getOptions(...args));
    } catch (e) {
      console.error('[Translations]', 'translate', e);
    }
  }

  /**
   * Specify `lng` in options to only get a specific language, otherwise all languages are returned
   * @param args
   */
  public static getAllTranslations(
    ...args: Parameters<TFunction>
  ): NormalizedTranslationValue[] {
    const [key, options] = this.getOptions(...args);

    // TODO: for cache
    //  this.i18nInstance.getDataByLanguage();

    const namespaces =
      (typeof options.ns === 'string' ? [options.ns] : options.ns) ?? [];
    const languages = options?.lngs ?? [];

    try {
      return namespaces
        .map((ns) => ({
          namespace: ns,
          text: Object.fromEntries(
            languages
              .map((lng) => [
                lng,
                this.i18nInstance.t(key, {
                  ...options,
                  ns,
                  lng,
                  lngs: undefined,
                }),
              ])
              .filter(([_, v]) => !!v)
          ),
        }))
        .filter((v) => Object.keys(v.text).length > 0);
    } catch (e) {
      console.warn('[Translations]', 'getAllTranslations', e);
      return [];
    }
  }
}
