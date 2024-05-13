//import * as textmate from "vscode-textmate";
import {
  ExistsFunction,
  InitOptions,
  TFunction,
  TOptions,
  createInstance,
} from 'i18next';
import ChainedBackend from 'i18next-chained-backend';
import { BaseBackendModule, ContentfulBackend, FsBackend } from './backends';
import { v4 } from 'uuid';
import { ConfigObserver } from '../Observers';
import { NormalizedTranslationValue } from '../types';

enum BackendType {
  fs = 'fileSystem', // required
  contentful = 'contentful',
}

export class Translations {
  // private static i18nextInstance;
  private static backendConfig = Translations.getBackend();
  private static i18nInstance = createInstance();
  private static initOptions: any = undefined;
  private static i18nConfig: Pick<TOptions, 'ns' | 'lngs' | 'fallbackLng'> = {};
  private static _isLoaded = false;
  private static onLoadFns = new Map<string, () => void>();
  private static configObserver = new ConfigObserver();

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
    backends: BaseBackendModule[];
    backendOptions: Parameters<BaseBackendModule['init']>;
  } {
    const backendModules: Record<BackendType, BaseBackendModule> = {
      [BackendType.contentful]: new ContentfulBackend(),
      [BackendType.fs]: new FsBackend(),
    };

    // TODO: reload if config changes

    const enabledBackends = this.configObserver.current!.get(
      'backend.list'
    ) as Array<BackendType>;

    const backends = enabledBackends.map((b) => backendModules[b]);

    const backendOptions = enabledBackends.map((item) =>
      this.configObserver.current!.get(`backend.${item}Options`)
    ) as Parameters<BaseBackendModule['init']>;

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

    this.configObserver.subscribe(async (config) => {
      const {
        fallbackLng = false,
        defaultNS,
        namespaces: ns = ['translation'],
        supportedLngs = ['en-US'],
      } = config.get<{
        fallbackLng?: string;
        defaultNS?: string;
        namespaces?: string | string[];
        supportedLngs?: string[];
      }>('i18nOptions') ?? {};

      this.backendConfig = this.getBackend();

      await this.load(options, {
        fallbackLng,
        defaultNS,
        ns,
        supportedLngs,
      });
    });
  }

  private static async load(
    options: Omit<InitOptions, 'ns' | 'load'>,
    userConfig: Pick<InitOptions, 'fallbackLng' | 'defaultNS' | 'ns'> & {
      supportedLngs: Exclude<InitOptions['supportedLngs'], false>;
    }
  ) {
    console.log('here');
    if (this.i18nInstance.isInitialized && this.initOptions === options) {
      return;
    }

    this.initOptions = options;

    userConfig.defaultNS ||= undefined;

    this.i18nConfig = {
      ns: typeof userConfig.ns === 'string' ? [userConfig.ns] : userConfig.ns,
      lngs: userConfig.supportedLngs,
    };

    await this.i18nInstance.use(ChainedBackend).init(
      {
        ...options,
        debug: true,
        ...userConfig,
        fallbackNS: userConfig.defaultNS ?? ['translation'],
        preload: userConfig.supportedLngs,
        load: 'currentOnly' as const,
        // TODO: save missing feature?
        // saveMissing: true,
        // saveMissingTo: 'all',
        backend: this.backendConfig,
        initImmediate: false,
      },
      (e) => {
        if (e) {
          console.error('[Translations]', e);
        } else {
          this.isLoaded = true;
        }
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
      options[key] ??= this.i18nConfig[key as keyof typeof this.i18nConfig];
    }
    options.defaultValue ||= false;

    return [key, options];
  }

  public static exists(...args: Parameters<ExistsFunction>) {
    try {
      return this.i18nInstance.exists(...this.getOptions(...args));
    } catch (e) {
      console.error('[Translations]', e);
    }
  }

  public static translate(...args: Parameters<TFunction>) {
    try {
      return this.i18nInstance.t(...this.getOptions(...args));
    } catch (e) {
      console.error('[Translations]', e);
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

    return namespaces
      .map((ns) => ({
        namespace: ns,
        text: Object.fromEntries(
          languages
            .map((lng) => [
              lng,
              this.i18nInstance.t(key, { ...options, ns, lng }),
            ])
            .filter(([_, v]) => !!v)
        ),
      }))
      .filter((v) => Object.keys(v.text).length > 0);
  }
}
