import type { Messages } from './en.js';

/*
 * The French catalog. It is typed as `Messages`, so every English key is
 * required here and a missing one fails the build.
 *
 * The language names are endonyms: `English` and `Français` read the same in
 * both catalogs, because a language is named in itself.
 */
export const fr: Messages = {
  app: {
    name: 'PlayLiberté'
  },
  language: {
    label: 'Langue',
    english: 'English',
    french: 'Français'
  },
  library: {
    add: 'Ajouter une playlist',
    loading: 'Chargement des playlists.',
    readFailed: 'Impossible de charger les playlists.',
    empty: {
      heading: 'Aucune playlist',
      promise:
        "Collez le lien d'une playlist YouTube, puis synchronisez-la. Chaque piste téléchargée vous appartient ensuite, même si la vidéo est retirée plus tard."
    },
    trackCount: {
      one: '{count} piste',
      other: '{count} pistes'
    }
  }
};
