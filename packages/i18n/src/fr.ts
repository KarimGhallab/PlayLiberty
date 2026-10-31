import type { Messages } from './en.js';

/*
 * Typed as `Messages`, so a missing English key fails the build. Language names
 * are endonyms: the same word in both catalogs.
 */
export const fr: Messages = {
  app: {
    name: 'PlayLiberté',
    title: {
      playlist: '{app} - {name}',
      track: '{app} - {playlist} ({track})',
      bareTrack: '{app} - {track}'
    }
  },
  language: {
    label: 'Langue',
    english: 'English',
    french: 'Français'
  },
  account: {
    title: 'Compte',
    admin: 'Admin',
    egress: 'Paramètres VPN',
    signOut: 'Se déconnecter'
  },
  signedOut: {
    title: "Connectez-vous pour entrer dans l'application",
    browser:
      "Votre navigateur s'ouvre pour la connexion, puis vous ramène ici.",
    action: 'Se connecter',
    retry: 'Se connecter à nouveau',
    busy: 'Connexion…',
    failed: "La connexion n'a pas abouti."
  },
  common: {
    cancel: 'Annuler',
    undo: 'Annuler',
    discardPrompt: 'Abandonner ce lien ? Le lien collé sera perdu.',
    keepEditing: 'Continuer la saisie',
    discard: 'Abandonner'
  },
  playlistActions: {
    arriving: 'Cet écran arrive plus tard.'
  },
  library: {
    add: 'Ajouter une playlist',
    loading: 'Chargement des playlists.',
    readFailed: 'Impossible de charger les playlists.',
    pinned: 'Épinglées',
    syncing: 'Synchronisation en cours',
    scopeAll: 'Toutes',
    scopeShared: 'Partagées avec moi',
    scopeLabel: 'Filtrer par propriétaire',
    allTracks: 'Toutes les pistes',
    pinFailed: "L'épingle n'a pas pu être modifiée.",
    deleteFailed: "La playlist n'a pas pu être supprimée.",
    notDownloaded: {
      one: "{count} piste n'est pas stockée",
      other: '{count} pistes ne sont pas stockées'
    },
    syncAll: {
      one: 'Synchroniser 1 playlist',
      other: 'Synchroniser les {count} playlists'
    },
    syncAllShort: 'Tout synchroniser',
    syncingAll: {
      one: 'Synchronisation de 1 playlist...',
      other: 'Synchronisation de {count} playlists...'
    },
    syncAllStarted: {
      one: '1 synchronisation lancée',
      other: '{count} synchronisations lancées'
    },
    syncAllRunning: {
      one: '1 est déjà en cours',
      other: '{count} sont déjà en cours'
    },
    syncAllNone: {
      one: 'La playlist est déjà en cours de synchronisation',
      other: 'Les {count} playlists sont déjà en cours de synchronisation'
    },
    syncAllStopped: 'Synchronisation interrompue',
    deleteDeferred: 'Suppression de la playlist',
    empty: {
      heading: 'Aucune playlist',
      promise:
        "Collez le lien d'une playlist YouTube, puis synchronisez-la pour écouter ses pistes."
    }
  },
  egress: {
    title: 'Paramètres VPN',
    back: "Retour à l'accueil",
    loading: 'Chargement des configurations.',
    readFailed: 'Impossible de charger les configurations.',
    empty: 'Aucune configuration installée.',
    agentUp: 'Agent egress joignable.',
    agentDown:
      'Agent egress injoignable. Les configurations ci-dessous sont les derniers états connus.',
    name: 'Nom',
    endpoint: 'Point de terminaison',
    status: 'État',
    lastAttempt: 'Dernière tentative',
    lastCheck: 'Dernière vérification',
    switch: 'Changer',
    switching: 'Changement...',
    check: 'Vérifier',
    checking: 'Vérification...',
    checkUnreachable: "L'agent egress est injoignable.",
    checkFailed: "La vérification n'a pas pu être effectuée.",
    toast: {
      switched: 'Changement vers {name}.',
      checked: '{name} est active.',
      answered: 'La sortie a répondu à YouTube.',
      switchFailed: "La sortie n'a pas pu être changée."
    },
    actions: 'Actions',
    seen: 'Vu à {ip}',
    reason: {
      blocked: 'YouTube a refusé la sortie.',
      unavailable: 'La vidéo de vérification est indisponible.',
      network: 'La sortie est injoignable.',
      unknown: 'La vérification a échoué.'
    },
    active: 'Active',
    never: 'Jamais',
    statusOk: 'OK',
    statusFailed: 'Échec',
    statusUnknown: 'Inconnu'
  },
  detail: {
    back: "Retour à l'accueil",
    /* The phone's row holds one line, so the way home and the sync drop the
     * words it cannot carry. */
    backShort: 'Retour',
    addTrack: 'Ajouter une piste',
    syncPlaylist: 'Synchroniser la playlist',
    syncPlaylistShort: 'Synchroniser',
    syncingPlaylist: 'Synchronisation de la playlist...',
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
    deleteFailed: "La playlist n'a pas pu être supprimée.",
    removeFailed: "La piste n'a pas pu être retirée.",
    trackFallback: 'Piste',
    settingFailed: "Le paramètre n'a pas pu être modifié.",
    settingNotice: "Le paramètre n'a pas été modifié.",
    sortFailed: "Le tri n'a pas pu être modifié.",
    sortNotice: "Le tri n'a pas été modifié.",
    sortBy: 'Trier par',
    sortPlaylist: 'Ordre de la playlist',
    sortNewest: "Plus récentes d'abord",
    sortOldest: "Plus anciennes d'abord",
    filterBy: 'Filtrer par',
    filterAll: 'Toutes',
    filterShowAll: 'Tout afficher',
    retryFailed: {
      one: 'Réessayer la piste en échec',
      other: 'Réessayer les {count} pistes en échec'
    },
    retryingFailed: {
      one: 'Nouvel essai de la piste en échec...',
      other: 'Nouvel essai des {count} pistes en échec...'
    },
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
    copyLink: 'Copier le lien',
    linkCopied: 'Lien copié',
    linkCopyFailed: "Le lien n'a pas pu être copié.",
    retry: 'Réessayer',
    fetchWhole: 'Récupérer en entier',
    remove: 'Retirer de la playlist',
    fullLength: 'Version intégrale',
    failure: {
      unavailable: "Cette vidéo n'est plus disponible.",
      private: 'Cette vidéo est privée.',
      blocked: 'YouTube a bloqué le téléchargement.',
      network: 'Impossible de joindre YouTube.',
      unknown: 'Le téléchargement a échoué.'
    },
    showDetails: 'Afficher les détails',
    hideDetails: 'Masquer les détails',
    showDetailsFor: 'Afficher les détails de {title}',
    hideDetailsFor: 'Masquer les détails de {title}'
  },
  trackLink: {
    cannotPlay: 'Impossible de lire {title}.',
    notStored: "La piste n'est pas encore stockée.",
    downloadFailed: 'Son téléchargement a échoué.',
    unavailableDetail: "Sa vidéo a disparu et aucun fichier n'a été stocké.",
    unknown: "Cette piste n'est pas disponible.",
    unknownDetail:
      'Le lien est peut-être rompu, ou la piste a peut-être été supprimée.',
    leftPlaylist: "{title} n'est plus dans cette playlist.",
    leftPlaylistDetail: 'Elle est lue seule.'
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
  coverDialog: {
    title: 'Image de la playlist',
    description: 'JPEG, PNG ou WebP, jusqu’à 5 Mo.',
    choose: 'Choisir une image',
    wrongType: 'Choisissez une image JPEG, PNG ou WebP.',
    tooLarge: 'Choisissez une image de moins de 5 Mo.',
    uploadFailed: "L'image n'a pas pu être enregistrée.",
    remove: "Retirer l'image",
    removing: 'Retrait',
    removePrompt:
      "Retirer l'image personnalisée ? La playlist utilisera l'image de sa première piste.",
    removeFailed: "L'image n'a pas pu être retirée.",
    save: 'Enregistrer',
    saving: 'Enregistrement',
    discardPrompt: "Abandonner cette image ? L'image choisie sera perdue.",
    cropHint:
      "Faites glisser l'image ou utilisez les flèches pour la déplacer.",
    zoom: 'Zoom',
    reset: 'Réinitialiser'
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
    edit: 'Peut modifier',
    grantFailed: 'Le partage de la playlist avec {name} a échoué.',
    revokeFailed: 'Le retrait du partage de la playlist avec {name} a échoué.'
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
    playlistsLabel: 'Playlists',
    firstPage:
      'Seules les {count} premières playlists de la bibliothèque sont listées.',
    outcomeAdded: 'Ajoutée',
    outcomePresent: 'Déjà présente',
    outcomeRefused: 'Refusée',
    failed: "La piste n'a pas pu être ajoutée.",
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
    playNamed: 'Lire {title}',
    pauseNamed: 'Mettre en pause {title}',
    previousNamed: 'Piste précédente, {title}',
    nextNamed: 'Piste suivante, {title}',
    openPlaylist: 'Ouvrir {name}',
    seekForward: 'Avancer de dix secondes',
    seekBackward: 'Reculer de dix secondes',
    failed: 'La lecture a échoué : {title}',
    failedDetail: 'Relancez la lecture ou choisissez une autre piste.',
    notificationRefused:
      'Autorisez les notifications pour pouvoir contrôler la lecture depuis le volet.',
    position: 'Position dans la piste',
    positionValue: '{elapsed} sur {duration}',
    shortcutShift: 'Shift',
    shortcutPrevious: 'P',
    shortcutNext: 'N'
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
      'Une synchronisation prend quelques minutes, mais une fois une piste stockée, une vidéo retirée de YouTube ne la supprimera pas de cette playlist.',
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
  notFoundPage: {
    code: '404',
    heading: 'Page introuvable',
    prose: "La page que vous cherchez n'existe pas.",
    back: "Retour à l'accueil"
  },
  header: {
    collab: 'Vous êtes collaborateur',
    shared: 'Playlist partagée',
    private: 'Playlist privée',
    share: 'Partager',
    rename: 'Renommer',
    cover: "Changer l'image",
    pin: 'Épingler',
    unpin: 'Désépingler',
    syncNow: 'Synchroniser',
    delete: 'Supprimer',
    play: 'Lire cette playlist',
    playNamed: 'Lire {name}',
    pause: 'Mettre en pause cette playlist',
    pauseNamed: 'Mettre en pause {name}',
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
    validationFailed: 'La requête contient une valeur invalide.',
    invalidGrant: "Le lien de connexion n'est plus valide. Recommencez.",
    provisioningUnavailable:
      "La connexion n'est pas configurée sur cette instance.",
    provisioningFailed: "L'instance n'a pas pu délivrer de jeton. Réessayez.",
    rateLimited: 'Trop de tentatives. Attendez une minute et réessayez.'
  },
  relative: {
    justNow: "à l'instant",
    yesterday: 'hier',
    minute: {
      one: 'il y a {count} minute',
      other: 'il y a {count} minutes'
    },
    hour: {
      one: 'il y a {count} heure',
      other: 'il y a {count} heures'
    },
    day: {
      one: 'il y a {count} jour',
      other: 'il y a {count} jours'
    },
    week: {
      one: 'il y a {count} semaine',
      other: 'il y a {count} semaines'
    },
    month: {
      one: 'il y a {count} mois',
      other: 'il y a {count} mois'
    },
    year: {
      one: 'il y a {count} an',
      other: 'il y a {count} ans'
    }
  },
  lastSynced: {
    never: 'Jamais synchronisée',
    synced: '{time}'
  },
  syncState: {
    upToDate: 'À jour',
    syncing: 'Synchronisation',
    failed: 'Échec de la synchronisation',
    blocked: 'Source inaccessible'
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
      one: 'en échec',
      other: 'en échec'
    },
    lastSync: 'Dernière synchronisation : {time}',
    noChanges: 'Aucun changement',
    downloading: '{count} en téléchargement.',
    syncing: 'Synchronisation'
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
