import type { Messages } from './en.js';

/*
 * Typed as `Messages`, so every English key is required here and a missing one
 * fails the build.
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
    notDownloaded: {
      one: "{count} piste n'est pas enregistrée",
      other: '{count} pistes ne sont pas enregistrées'
    },
    deleteDeferred: 'Suppression de la playlist',
    replaced: "L'action précédente a été remplacée.",
    willNotDelete: '« {name} » ne sera pas supprimée.',
    empty: {
      heading: 'Aucune playlist',
      promise:
        "Collez le lien d'une playlist YouTube, puis synchronisez-la. Chaque piste téléchargée vous appartient ensuite, même si la vidéo est retirée plus tard."
    }
  },
  detail: {
    back: "Retour à l'accueil",
    addTrack: 'Ajouter une piste',
    loadingTracks: 'Chargement des pistes.',
    readFailed: 'Impossible de charger les pistes.',
    noTracks: 'Aucune piste.',
    loadMore: 'Charger la suite',
    loadMoreLoading: 'Chargement...',
    loadMoreRetry: 'Réessayer',
    playbackFailed:
      "La lecture n'a pas pu démarrer : la file d'attente n'a pas été chargée.",
    deleteDeferred: 'Suppression de la playlist',
    removeDeferred: 'Retrait de la piste',
    trackFallback: 'Piste',
    settingFailed: "Le paramètre n'a pas pu être modifié.",
    settingNotice: "Le paramètre n'a pas été modifié.",
    sortBy: 'Trier par',
    sortPlaylist: 'Ordre de la playlist',
    sortNewest: "Plus récentes d'abord",
    sortOldest: "Plus anciennes d'abord",
    filterBy: 'Filtrer par',
    filterAll: 'Toutes',
    filterShowAll: 'Tout afficher',
    filterEmpty: {
      stored: 'Aucune piste stockée',
      pending: 'Aucune piste en attente',
      downloading: 'Aucune piste en téléchargement',
      failed: 'Aucune piste en échec',
      unavailable: 'Aucune piste indisponible'
    }
  },
  trackRow: {
    play: 'Lire {title}',
    pause: 'Mettre en pause {title}',
    actions: 'Actions pour {title}',
    retry: 'Réessayer',
    fetchWhole: 'Récupérer en entier',
    remove: 'Retirer de la playlist',
    fullLength: 'Version intégrale'
  },
  skipSetting: {
    label: 'Ignorer les parties non musicales'
  },
  renameDialog: {
    title: 'Renommer la playlist',
    description: 'Il ne change pas la playlist sur YouTube.',
    nameLabel: 'Nom de la playlist',
    invalid: "Un nom est requis, jusqu'à 200 caractères.",
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
  },
  addPlaylistDialog: {
    title: 'Ajouter une playlist',
    description:
      "Collez le lien d'une playlist YouTube. Rien n'est téléchargé avant la synchronisation.",
    linkLabel: 'Lien de la playlist',
    invalid:
      "Collez le lien d'une playlist YouTube, par exemple https://youtube.com/playlist?list=...",
    add: 'Ajouter',
    adding: 'Ajout en cours',
    skip: 'Ignorer les parties non musicales',
    skipHint:
      "Coupe les intros, les lectures de sponsors et les outros de l'audio."
  },
  playerBar: {
    label: 'Lecteur',
    previous: 'Piste précédente',
    next: 'Piste suivante',
    play: 'Lire',
    pause: 'Mettre en pause',
    position: 'Position dans la piste',
    positionValue: '{elapsed} sur {duration}'
  },
  volume: {
    label: 'Volume',
    mute: 'Couper le son',
    unmute: 'Rétablir le son',
    notice: 'Volume {percent}%',
    noticeMuted: 'Volume coupé, {percent}%'
  },
  emptyState: {
    heading: 'Rien pour le moment',
    prose:
      "Cette playlist n'a jamais été synchronisée. La synchronisation va sur YouTube et télécharge l'audio de chaque piste qu'elle contient.",
    promise:
      'Une synchronisation prend quelques minutes, mais une fois une piste téléchargée, une vidéo retirée de YouTube ne la supprimera pas de cette playlist.',
    sync: 'Synchroniser',
    syncing: 'Synchronisation'
  },
  toast: {
    dismiss: 'Fermer'
  },
  readFailure: {
    retry: 'Réessayer',
    retrying: 'Nouvel essai'
  },
  notFound: {
    heading: "Cette playlist n'est pas ici",
    prose:
      "Elle a peut-être été supprimée, ou bien elle appartient à quelqu'un d'autre et ne vous est plus partagée.",
    back: "Retour à l'accueil"
  },
  header: {
    collab: 'Vous êtes collaborateur',
    shared: 'Playlist partagée',
    private: 'Playlist privée',
    share: 'Partager',
    rename: 'Renommer',
    syncNow: 'Synchroniser',
    delete: 'Supprimer la playlist',
    play: 'Lire cette playlist',
    pause: 'Mettre en pause cette playlist',
    skipBack: 'Piste précédente',
    trackNext: 'Piste suivante',
    shuffle: 'Lecture aléatoire de {name}',
    actions: 'Actions pour {name}',
    sharedBy: 'Partagée par {name}',
    countOf: {
      one: '{shown} sur {total} piste',
      other: '{shown} sur {total} pistes'
    },
    retryPlayback: 'Relancer la lecture',
    retryingPlayback: 'Chargement...'
  },
  trackBars: {
    playing: 'En lecture',
    paused: 'En pause'
  },
  start: {
    empty: 'Rien à lire dans « {name} ».',
    emptyDetail: "Aucune piste n'a fini de se télécharger.",
    unreachable: "« {name} » n'a pas pu être lue.",
    unreachableDetail: "Ses pistes n'ont pas pu être chargées."
  },
  problem: {
    playlistNotFound: {
      read: "La playlist n'existe pas, ou ce compte ne peut pas la voir.",
      write: "La playlist n'existe pas, ou ce compte ne peut pas y écrire.",
      manage: "La playlist n'existe pas, ou ce compte ne peut pas la gérer.",
      track:
        "La playlist n'existe pas, ce compte ne peut pas y écrire, ou la piste n'y figure pas."
    },
    invalidRequest:
      "Collez le lien d'une playlist YouTube, par exemple https://youtube.com/playlist?list=...",
    unprocessableRequest: "L'URL n'est pas une URL de vidéo YouTube.",
    validationFailed: 'La requête contient une valeur invalide.'
  },
  relative: {
    justNow: "À l'instant",
    yesterday: 'Hier',
    minute: {
      one: 'Il y a {count} minute',
      other: 'Il y a {count} minutes'
    },
    hour: {
      one: 'Il y a {count} heure',
      other: 'Il y a {count} heures'
    },
    day: {
      one: 'Il y a {count} jour',
      other: 'Il y a {count} jours'
    },
    week: {
      one: 'Il y a {count} semaine',
      other: 'Il y a {count} semaines'
    },
    month: {
      one: 'Il y a {count} mois',
      other: 'Il y a {count} mois'
    },
    year: {
      one: 'Il y a {count} an',
      other: 'Il y a {count} ans'
    }
  },
  lastSynced: {
    never: 'Jamais synchronisée',
    synced: '{time}'
  },
  syncState: {
    upToDate: 'À jour',
    syncing: 'Synchronisation',
    failed: 'Échec de la synchronisation'
  },
  trackState: {
    removedFrom: 'Retirée de {provider}',
    stored: 'Stockée',
    pending: 'En attente',
    downloading: 'Téléchargement',
    failed: 'Échec',
    unavailable: 'Indisponible'
  },
  provider: {
    youtube: 'YouTube'
  },
  count: {
    unit: {
      one: 'piste',
      other: 'pistes'
    },
    tracks: {
      one: '{count} piste',
      other: '{count} pistes'
    }
  },
  syncSummary: {
    kept: {
      one: 'conservée',
      other: 'conservées'
    },
    added: {
      one: 'ajoutée',
      other: 'ajoutées'
    },
    removed: {
      one: 'retirée',
      other: 'retirées'
    },
    failed: {
      one: 'échouée',
      other: 'échouées'
    },
    downloading: '{count} en téléchargement.',
    syncing: 'Synchronisation',
    syncedJustNow: "Synchronisée à l'instant"
  },
  syncError: {
    reach:
      "Impossible d'atteindre {provider}, la playlist n'est peut-être plus à jour.",
    safe: {
      one: 'La piste conservée est toujours là et ne sera pas supprimée même en cas de retrait de la vidéo par {provider}.',
      other:
        'Les {count} pistes conservées sont toujours là et ne seront pas supprimées même en cas de retrait des vidéos par {provider}.'
    },
    sync: 'Synchroniser',
    syncing: 'Synchronisation',
    show: 'Afficher les détails',
    hide: 'Masquer les détails'
  }
};
