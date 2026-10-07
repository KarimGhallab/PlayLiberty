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
    name: 'PlayLiberty'
  },
  language: {
    label: 'Langue',
    english: 'English',
    french: 'Français'
  },
  common: {
    cancel: 'Annuler'
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
  },
  detail: {
    back: "Retour à l'accueil",
    addTrack: 'Ajouter une piste',
    loadingTracks: 'Chargement des pistes.',
    readFailed: 'Impossible de charger les pistes.',
    noTracks: 'Aucune piste.',
    deleteDeferred: 'Suppression de la playlist',
    removeDeferred: 'Retrait de la piste',
    trackFallback: 'Piste',
    settingFailed: "Le paramètre n'a pas pu être modifié.",
    settingNotice: "Le paramètre n'a pas été modifié."
  },
  trackRow: {
    play: 'Lire {title}',
    pause: 'Mettre en pause {title}',
    actions: 'Actions pour {title}',
    retry: 'Réessayer',
    fetchWhole: 'Récupérer sans coupe',
    remove: 'Retirer de la playlist',
    fullLength: 'Version intégrale'
  },
  skipSetting: {
    label: 'Ignorer les parties non musicales'
  },
  renameDialog: {
    title: 'Renommer la playlist',
    description: 'Cela ne change pas la playlist sur YouTube.',
    nameLabel: 'Nom de la playlist',
    invalid: "Champ obligatoire, jusqu'à 200 caractères.",
    save: 'Enregistrer',
    saving: 'Enregistrement'
  },
  shareDialog: {
    title: 'Partager la playlist',
    description:
      'Toutes les personnes avec qui vous partagez peuvent trouver la playlist et écouter ses pistes. Le droit de modification les autorise aussi à changer son contenu.',
    done: 'Terminé',
    loading: 'Chargement des comptes.',
    readFailed: 'Impossible de charger les comptes.',
    empty: "Il n'y a encore personne avec qui partager.",
    listen: 'Peut écouter',
    edit: 'Peut modifier'
  },
  addTrackDialog: {
    title: 'Ajouter une piste',
    description:
      "Collez le lien d'une vidéo YouTube, puis choisissez les playlists auxquelles l'ajouter.",
    videoLabel: 'Lien de la vidéo',
    invalid:
      "Collez le lien d'une vidéo YouTube, par exemple https://youtube.com/watch?v=...",
    add: 'Ajouter',
    adding: 'Ajout en cours',
    refusedSome: 'Ajoutée aux autres. Non ajoutée à :',
    refusedAll: "Rien n'a été ajouté. Non ajoutée à :"
  }
};
