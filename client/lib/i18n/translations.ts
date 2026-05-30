export type TranslationKey = 
  | 'lyrics'
  | 'annotations'
  | 'annotationTypes'
  | 'allSongs'
  | 'metaphor'
  | 'reference'
  | 'wordplay'
  | 'emotion'
  | 'songNotFound'
  | 'returnToHome'
  | 'languages.en'
  | 'languages.es'
  | 'originalVersion'
  | 'translatedVersion'
  | 'noTranslationAvailable'
  | 'viewTranslation'
  | 'onboarding.search.title'
  | 'onboarding.search.desc'
  | 'onboarding.lang.title'
  | 'onboarding.lang.desc'
  | 'onboarding.music.title'
  | 'onboarding.music.desc'
  | 'onboarding.theme.title'
  | 'onboarding.theme.desc'
  | 'onboarding.finish.title'
  | 'onboarding.finish.desc'
  | 'onboarding.next'
  | 'onboarding.prev'
  | 'onboarding.finishButton'
  | 'onboarding.skip'
  | 'search.placeholder'
  | 'search.noResults'
  | 'search.tryAgain'
  | 'search.clear'
  | 'filter.allTypes'
  | 'filter.painting'
  | 'filter.photography'
  | 'filter.poem'
  | 'filter.song'
  | 'filter.video'
  | 'filter.recent'
  | 'filter.oldest'
  | 'filter.clear'
  | 'common.save'
  | 'common.cancel'
  | 'common.delete'
  | 'common.edit'
  | 'common.back'
  | 'common.next'
  | 'common.continue'
  | 'common.or'
  | 'auth.signIn'
  | 'auth.signUp'
  | 'auth.forgotPassword'
  | 'auth.createAccount'
  | 'auth.email'
  | 'auth.password'
  | 'auth.confirmPassword'
  | 'auth.username'
  | 'auth.displayName'
  | 'auth.googleContinue'
  | 'auth.alreadyHaveAccount'
  | 'auth.dontHaveAccount'
  | 'auth.resetPassword'
  | 'auth.checkEmail'
  | 'profile.editProfile'
  | 'profile.savedWorks'
  | 'profile.biography'
  | 'profile.website'
  | 'profile.followers'
  | 'profile.following'
  | 'profile.works'
  | 'profile.follow'
  | 'profile.following'
  | 'work.uploadWork'
  | 'work.title'
  | 'work.description'
  | 'work.type'
  | 'work.publish'
  | 'work.published'
  | 'work.deleteWork'
  | 'work.editWork'
  | 'work.report'
  | 'gallery.explore'
  | 'errors.fillAllFields'
  | 'errors.passwordsNotMatch'
  | 'errors.passwordTooShort'
  | 'errors.usernameTaken'
  | 'errors.alreadyRegistered';

export const translations = {
  en: {
    'lyrics': 'Lyrics',
    'annotations': 'Annotations',
    'annotationTypes': 'Annotation Types',
    'allSongs': 'All Songs',
    'metaphor': 'Metaphor',
    'reference': 'Reference',
    'wordplay': 'Wordplay',
    'emotion': 'Emotion',
    'songNotFound': 'Song not found',
    'returnToHome': 'Return to home',
    'languages.en': 'English',
    'languages.es': 'Español',
    'originalVersion': 'Original Version',
    'translatedVersion': 'Translated Version',
    'noTranslationAvailable': 'No translation available for current language',
      'viewTranslation': 'Show translation'
    ,
    'onboarding.search.title': 'Search with ease',
    'onboarding.search.desc': 'Find your favorite songs by title or artist in seconds.',
    'onboarding.lang.title': 'Language selector',
      'onboarding.lang.desc': 'Instantly switch between languages. All content including lyrics and annotations will be translated for you.',
    'onboarding.music.title': 'Your music hub',
      'onboarding.music.desc': "Listen to the artist's music while you browse with our curated music player.",
    'onboarding.theme.title': 'Theme and reading mode',
      'onboarding.theme.desc': 'Click the bulb to switch between light and dark modes — customize your reading experience.',
    'onboarding.finish.title': 'You’re all set',
      'onboarding.finish.desc': 'Now you know all the basics! Dive in and explore the world of lyrics.',
    'onboarding.next': 'Next',
    'onboarding.prev': 'Previous',
    'onboarding.finishButton': 'Ready',
    'onboarding.skip': 'Skip',
    'search.placeholder': 'Search works...',
    'search.noResults': 'No results for',
    'search.tryAgain': 'Try another search term',
    'search.clear': 'Clear search',
    'filter.allTypes': 'All types',
    'filter.painting': 'Painting',
    'filter.photography': 'Photography',
    'filter.poem': 'Poem',
    'filter.song': 'Song',
    'filter.video': 'Video',
    'filter.recent': 'Most recent',
    'filter.oldest': 'Oldest',
    'filter.clear': 'Clear'
  },
  es: {
    'lyrics': 'Letra',
    'annotations': 'Anotaciones',
    'annotationTypes': 'Tipos de anotación',
    'allSongs': 'Todas las canciones',
    'metaphor': 'Metáfora',
    'reference': 'Referencia',
    'wordplay': 'Juego de palabras',
    'emotion': 'Emoción',
    'songNotFound': 'Canción no encontrada',
    'returnToHome': 'Volver al inicio',
    'languages.en': 'English',
    'languages.es': 'Español',
    'originalVersion': 'Versión original',
    'translatedVersion': 'Versión traducida',
    'noTranslationAvailable': 'No hay traducción disponible para el idioma actual',
    'viewTranslation': 'Ver traducción'
    ,
    'onboarding.search.title': 'Busca con facilidad',
  'onboarding.search.desc': 'Usa este buscador para encontrar canciones por título o artista.',
    'onboarding.lang.title': 'Selector de idioma',
    'onboarding.lang.desc': 'Cambia de idioma al instante. Traducimos letras, descripciones y anotaciones para tu comodidad.',
    'onboarding.music.title': 'Tu centro musical',
    'onboarding.music.desc': 'Abre un panel musical seleccionado para disfrutar las pistas del artista mientras exploras la app.',
    'onboarding.theme.title': 'Tema y modo de lectura',
    'onboarding.theme.desc': 'Activa la bombilla para cambiar entre modo claro y oscuro — tu lectura, tus reglas.',
    'onboarding.finish.title': 'Listo para empezar',
    'onboarding.finish.desc': 'Ahora que conoces lo esencial, disfruta las letras en armonía y descubre más.',
    'onboarding.next': 'Siguiente',
    'onboarding.prev': 'Anterior',
    'onboarding.finishButton': 'Listo',
    'onboarding.skip': 'Omitir',
    'search.placeholder': 'Buscar obras...',
    'search.noResults': 'No hay resultados para',
    'search.tryAgain': 'Intenta con otro término de búsqueda',
    'search.clear': 'Limpiar búsqueda',
    'filter.allTypes': 'Todos los tipos',
    'filter.painting': 'Pintura',
    'filter.photography': 'Fotografía',
    'filter.poem': 'Poema',
    'filter.song': 'Canción',
    'filter.video': 'Video',
    'filter.recent': 'Más recientes',
    'filter.oldest': 'Más antiguos',
    'filter.clear': 'Limpiar'
  }
} as const;