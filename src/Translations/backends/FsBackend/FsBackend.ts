import I18nextFsBackend from 'i18next-fs-backend';
import {
  BackendModule,
  MultiReadCallback,
  ReadCallback,
  Resource,
  ResourceLanguage,
} from 'i18next';

export class FsBackend extends I18nextFsBackend implements BackendModule {
  read(language: string, namespace: string, callback: ReadCallback): void {
    console.log('Q_DEBUG', 'fsread', language, namespace);

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
    console.log('Q_DEBUG', 'fscreate', ...args);
    super.create?.(...args);
  }

  save(
    ...args: [language: string, namespace: string, data: ResourceLanguage]
  ): void {
    console.log('Q_DEBUG', 'fssave', ...args);
  }

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

  createFiles() {
    // TODO: need to replace {{lng}} and {{ns}} with supportedLngs & ns
    // const options = backendOptions.find((b) => {
    //   const keys = Object.keys(b);
    //   return keys.includes('loadPath') || keys.includes('addPath');
    // });
    // if (options) {
    //   ['loadPath', 'addPath'].forEach((i) => {
    //     if (i in options) {
    //       const path = resolve(__dirname, options[i as keyof typeof options]);
    //       console.log('Q_DEBUG', 'path', path);
    //       mkdir(dirname(path), {
    //         recursive: true,
    //       })
    //         .then(async () => {
    //           const doesExist = existsSync(path);
    //           console.log('Q_DEBUG', 'doesExist', path, doesExist);
    //           if (!doesExist) {
    //             await writeFile(path, '{}');
    //           }
    //         })
    //         .catch((e) => console.error('[Translations]', e));
    //     }
    //   });
    // }
  }
}
