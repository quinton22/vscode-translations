import {
  ContentfulClientApi,
  createClient,
  CreateClientParams,
  Entry,
} from 'contentful';
import {
  BackendModule,
  MultiReadCallback,
  ReadCallback,
  Resource,
  ResourceLanguage,
  Services,
} from 'i18next';

export type ContentfulTranslation = {
  key: string;
  namespace: string;
  text: string;
};

export class ContentfulBackend implements BackendModule {
  create?(
    languages: readonly string[],
    namespace: string,
    key: string,
    fallbackValue: string
  ): void {
    throw new Error('Method not implemented.');
  }
  save?(language: string, namespace: string, data: ResourceLanguage): void {
    throw new Error('Method not implemented.');
  }
  private client?: ContentfulClientApi;

  public type: 'backend' = 'backend';
  public static type: 'backend' = 'backend';

  init(_: Services, backendOptions: CreateClientParams): void {
    this.client = createClient(backendOptions);
  }

  //   /** Save the missing translation */
  //   create(
  //     languages: readonly string[],
  //     namespace: string,
  //     key: string,
  //     fallbackValue: string
  //   ): void {
  //     throw Error("ContentfulBackend.prototype.create is not implemented");
  //   }

  //   /** Store the translation. For backends acting as cache layer */
  //   save(language: string, namespace: string, data: ResourceLanguage): void {
  //     // TODO: should we save to a cache here?
  //     throw Error("ContentfulBackend.prototype.save is not implemented");
  //   }

  read(language: string, namespace: string, callback: ReadCallback): void {
    this.getTranslations({
      locale: language,
      'fields.namespace[in]': namespace,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      content_type: 'translation',
      limit: 1000,
    })
      .then((items) => {
        const translations = items.reduce(
          (acc, entry) => ({ ...acc, [entry.fields.key]: entry.fields.text }),
          {}
        );

        callback(null, translations);
      })
      .catch((e) => {
        console.error('[Translations]', e);
        return callback(e, null);
      });
  }

  /** Load multiple languages and namespaces. For backends supporting multiple resources loading */
  readMulti(
    languages: readonly string[],
    namespaces: readonly string[],
    callback: MultiReadCallback
  ): void {
    // get namespaces for all languages
    // contentful doesn't allow to use multiple locales in one query
    Promise.all(
      languages.map((lang) =>
        this.getTranslations({
          locale: lang,
          'fields.namespace[in]': namespaces.join(','),
          // eslint-disable-next-line @typescript-eslint/naming-convention
          content_type: 'translation',
          limit: 1000,
        })
      )
    )
      // parse
      .then((d) => {
        const translations = d.reduce((_translations, items) => {
          const translation = items.reduce((_translation, item) => {
            if (!_translation[item.sys.locale]) {
              _translation[item.sys.locale] = {};
            }
            _translation[item.sys.locale][item.sys.id] = item.fields;
            return _translation;
          }, {} as Resource);
          return {
            ..._translations,
            ...translation,
          };
        }, {} as Resource);
        callback(null, translations);
      })
      .catch((e) => callback(e, null));
  }

  private async getTranslations(query: any) {
    const items: Entry<ContentfulTranslation>[] = [];
    let skip = 0,
      total = 0;

    if (!this.client) {
      return [];
    }

    do {
      const entries = await this.client.getEntries<ContentfulTranslation>({
        skip,
        ...query,
      });

      items.push(...entries.items);

      total = entries.total;
      skip = items.length;
    } while (skip < total);

    return items;
  }
}

export default ContentfulBackend;
