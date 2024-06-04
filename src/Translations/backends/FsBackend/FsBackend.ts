import I18nextFsBackend from 'i18next-fs-backend';
import {
  BackendModule,
  MultiReadCallback,
  ReadCallback,
  Resource,
} from 'i18next';
import { FsBackendOptions } from 'i18next-fs-backend';
import { resolve } from 'path';
import { workspace } from 'vscode';
import { existsSync } from 'fs';

export class FsBackend extends I18nextFsBackend implements BackendModule {
  private loadPathWrapper(
    loadPath?: string | ((lng: string, ns: string) => string)
  ) {
    if (typeof loadPath !== 'string') {
      return loadPath;
    }
    return (language: string, namespace: string): string => {
      let replacedPath = loadPath
        .replace('{{lng}}', language)
        .replace('{{ns}}', namespace);
      const workspacePath = workspace.workspaceFolders?.[0].uri.path;

      if (replacedPath.startsWith('~/')) {
        replacedPath = replacedPath.replace('~/', process.env.HOME ?? '');
      }
      const absolutePath = resolve(workspacePath ?? '', replacedPath);

      if (!existsSync(absolutePath)) {
        console.warn(
          '[Translations]',
          'Attempted to load translations from non-existent file',
          absolutePath
        );
      }

      return absolutePath;
    };
  }

  init(services?: any, options?: FsBackendOptions | undefined): void {
    if (options && options.loadPath) {
      options.loadPath = this.loadPathWrapper(options.loadPath);
    }
    console.log('[Translations]', 'init', options);
    super.init(services, options);
  }

  read(language: string, namespace: string, callback: ReadCallback): void {
    super.read(language, namespace, callback);
  }

  create(
    ...args: [
      languages: string[],
      namespace: string,
      key: string,
      fallbackValue: string
    ]
  ): void {
    super.create?.(...args);
  }

  // save(
  //   ...args: [language: string, namespace: string, data: ResourceLanguage]
  // ): void {}

  readMulti(
    languages: readonly string[],
    namespaces: readonly string[],
    callback: MultiReadCallback
  ): void {
    const r: Resource = {};

    for (const lang of languages) {
      for (const ns of namespaces) {
        this.read(lang, ns, (err, resourceKey) => {
          if (err || !resourceKey || typeof resourceKey !== 'object') {
            return;
          }
          r[lang][ns] = resourceKey;
        });
      }
    }

    callback(null, r);
  }
}
