// Clean, single-definition songs data. This file contains a minimal, validated list of songs
// to avoid parsing problems while we stabilize content edits. Add full annotations/translations
// later if needed. Keep strings in template literals and balanced braces.

export interface Annotation {
  line: number;
  phrase?: string;
  text: string;
  explanation?: string;
  type?: 'metaphor' | 'reference' | 'wordplay' | 'emotion' | string;
}

export interface SongTranslations {
  title: string;
  description?: string;
  lyrics?: string;
  annotations?: Annotation[];
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  coverUrl?: string;
  coverColor?: string;
  releaseDate?: string;
  slug?: string;
  originalLanguage?: 'en' | 'es' | string;
  description?: string;
  lyrics?: string;
  annotations?: Annotation[];
  translations?: {
    en?: SongTranslations;
    es?: SongTranslations;
    [k: string]: SongTranslations | undefined;
  };
}

export const songs: Song[] = [
  {
    id: '1',
    title: 'Before Summer Ends',
    artist: 'Makwin',
    coverUrl: '/Portadas/Before Summer Ends.jpg',
    coverColor: '#1a1a1a',
    releaseDate: '2025-09-17',
    slug: 'BeforeSummerEnds-Makwin',
    originalLanguage: 'en',
  description: `The feeling that summer is ending and you haven't fulfilled what you set out to do.

Context: Before summer started I set myself a challenge: work as much as possible, push myself to convince my parents I can live from music without having to study the following year. Despite my efforts I got results, but not enough. This song, written in early August, talks about how summer is ending, time is running out and the pressure that comes with it.`,
    lyrics: `My life takes down when you're around and I've been saving my tears,
they shine like stars while I wish it was me
The perfect guy on your phone screen

And I've been hit by the summer
While I see the sun come down
I hope it doesn't get me soon
Cause I don't wanna get burn

And I will say things that I've never said before

I know people who lie, cause they think that it's hot
I'm in love with my life, I won't surrender at all
It's just the way I feel now that I've never felt before
Flying like a bird, I've been flying

Baby now I'm free, baby now I'm free

Red leaves are falling from the tree of life
They say what I have to do and I don't wanna discuss
I wanna dance my life, but it looks like she is trying to fight me back

And I've been hit by the summer
While I see the sun come down
I hope it doesn't get me soon
Cause I don't wanna get burn
`,
    annotations: [
      {
        line: 1,
        phrase: `My life takes down when you're around and I've been saving my tears, they shine like stars while I wish it was me the perfect guy on your phone screen`,
        text: `My life takes down when you're around and I've been saving my tears, they shine like stars while I wish it was me the perfect guy on your phone screen`,
        explanation: `In these first three lines, "tears" is a metaphor for the pressure you feel when people expect something from you, while "the perfect guy" refers to what others (like your parents) expect you to be even if you don't want that.`,
        type: 'metaphor'
      },
      {
        line: 4,
        phrase: `And I've been hit by the summer While I see the sun come down I hope it doesn't get me soon Cause I don't wanna get burn`,
        text: `And I've been hit by the summer While I see the sun come down I hope it doesn't get me soon Cause I don't wanna get burn`,
        explanation: `The sun refers to summer and the passing of time; I see the sun (the summer holiday time) coming to an end and I hope it doesn't reach me because if it does I'll get burned.`,
        type: 'metaphor'
      },
      {
        line: 10,
        phrase: `I'm in love with my life, I won't surrender at all It's just the way I feel now that I've never felt before Flying like a bird, I've been flying Baby now I'm free, baby now I'm free`,
        text: `I'm in love with my life, I won't surrender at all It's just the way I feel now that I've never felt before Flying like a bird, I've been flying Baby now I'm free, baby now I'm free`,
        explanation: `It means that now that I like my life and have a purpose, I won't give up; I've never felt like this before. "Flying like a bird" symbolizes freedom.`,
        type: 'emotion'
      },
      {
        line: 16,
        phrase: `Red leaves are falling from the tree of life They say what I have to do and I don't wanna discuss I wanna dance my life, but it looks like she is trying to fight me back`,
        text: `Red leaves are falling from the tree of life They say what I have to do and I don't wanna discuss I wanna dance my life, but it looks like she is trying to fight me back`,
        explanation: `The red leaves falling from the "tree of life" represent everything life gives or imposes on you; sometimes it feels like it forces you to do things you don't want. "I wanna dance my life, but it looks like she is trying to fight me back" expresses the conflict between living your way and external pressures.`,
        type: 'reference'
      }
    ],
    translations: {
      es: {
        title: 'Before Summer Ends',
        description: `La sensación de que se está acabando verano y no has cumplido lo que te propusiste.

Contexto: Antes de que empezara el verano me propuse un reto: trabajar lo máximo posible, esforzarme para convencer a mis padres de que puedo vivir de la música sin tener que estudiar el año siguiente. A pesar de mis esfuerzos conseguí resultados, pero no suficientes. Esta canción, escrita a principios de agosto, habla de cómo el verano se está acabando, el tiempo se agota y la presión que viene con ello.`,
        lyrics: `Mi vida se derrumba cuando estás cerca y he estado guardando mis lágrimas,
brillan como estrellas mientras deseo ser yo
El chico perfecto en tu pantalla del teléfono

Y el verano me ha golpeado
Mientras veo el sol caer
Espero que no me alcance pronto
Porque no quiero quemarme

Y diré cosas que nunca antes había dicho

Conozco gente que miente, porque piensan que está de moda
Estoy enamorado de mi vida, no me rendiré
Es la forma en la que me siento ahora, nunca me había sentido así
Volando como un pájaro, he estado volando
Bebé ahora soy libre, bebé ahora soy libre

Hojas rojas caen del árbol de la vida
Dicen lo que tengo que hacer y no quiero discutir
Quiero bailar mi vida, pero parece que ella intenta luchar conmigo

Y el verano me ha golpeado
Mientras veo el sol caer
Espero que no me alcance pronto
Porque no quiero quemarme`,
        annotations: [
          {
            line: 1,
            phrase: `Mi vida se derrumba cuando estás cerca y he estado guardando mis lágrimas, brillan como estrellas mientras deseo ser yo El chico perfecto en tu pantalla del teléfono`,
            text: `Mi vida se derrumba cuando estás cerca y he estado guardando mis lágrimas, brillan como estrellas mientras deseo ser yo El chico perfecto en tu pantalla del teléfono`,
            explanation: `En estas primeras tres líneas, las "lágrimas" son una metáfora de la presión que sientes cuando otros esperan algo de ti, mientras que "el chico perfecto" se refiere a las expectativas externas (por ejemplo, tus padres).`,
            type: 'metaphor'
          },
          {
            line: 4,
            phrase: `Y el verano me ha golpeado Mientras veo el sol caer Espero que no me alcance pronto Porque no quiero quemarme`,
            text: `Y el verano me ha golpeado Mientras veo el sol caer Espero que no me alcance pronto Porque no quiero quemarme`,
            explanation: `El sol hace referencia al verano y al paso del tiempo; veo que el verano (las vacaciones) se acaba y espero que no me alcance porque me quemaría.`,
            type: 'metaphor'
          },
          {
            line: 10,
            phrase: `Estoy enamorado de mi vida, no me rendiré Es la forma en la que me siento ahora, nunca me había sentido así Volando como un pájaro, he estado volando Bebé ahora soy libre, bebé ahora soy libre.`,
            text: `Estoy enamorado de mi vida, no me rendiré Es la forma en la que me siento ahora, nunca me había sentido así Volando como un pájaro, he estado volando Bebé ahora soy libre, bebé ahora soy libre`,
            explanation: `Significa que ahora que me gusta mi vida y tengo un propósito, no me rendiré; el "volar como un pájaro" simboliza la libertad.`,
            type: 'emotion'
          },
          {
            line: 16,
            phrase: `Hojas rojas caen del árbol de la vida Dicen lo que tengo que hacer y no quiero discutir Quiero bailar mi vida, pero parece que ella intenta luchar conmigo`,
            text: `Hojas rojas caen del árbol de la vida Dicen lo que tengo que hacer y no quiero discutir Quiero bailar mi vida, pero parece que ella intenta luchar conmigo`,
            explanation: `Las hojas rojas que caen del "árbol de la vida" representan lo que la vida te da o te impone; a veces parece que te obliga a hacer cosas que no deseas.`,
            type: 'reference'
          }
        ]
      }
    }
  },
  {
    id: '2',
    title: 'Porfavor, Quédate',
    artist: 'Makwin',
    coverUrl: '/Portadas/Porfavor, Quédate.jpg',
    coverColor: '#001a33',
    releaseDate: '2025-06-25',
    slug: 'PorfavorQuedate-Makwin',
    originalLanguage: 'es',
    description: `A primera vista puede parecer que esta canción habla sobre la dependencia emocional, y en parte es cierto. Sin embargo, su verdadero trasfondo gira en torno al miedo a desarrollar esa dependencia. Por suerte, no lo he vivido en primera persona, pero sí lo he presenciado muy de cerca.`,
    lyrics: `Qué haría sin ti
Perdería la gracia vivir
No te separes de mí

Mi vida perdería el sentido que le das
Tu ausencia provocaría ansiedad
Las flores grises y color negro el mar
Sin ti el cielo sería gris
No habría lluvias en abril
Simplemente lo bonito dejaría de existir

La diosa de la belleza
La diosa de la naturaleza
La diligencia de mi pereza
Y de mi reino, mi alteza

Porque te extraño tanto si nos vimos ayer
Nena, yo soy el oso y tú eres la miel
Me da igual estar mal mientras tú estés bien
Date cuenta que por verte haría mi propio tren
Tu sonrisa perfecta es mi amanecer
Tus ojos me dicen: por favor, quédate

Como yo te veo es diferente a cómo tú te ves
Tú para mí eres arte
Ojalá lo pudieras ver`,
    annotations: [
      {
        line: 6,
        phrase: `Las flores grises y color negro el mar / Sin ti el cielo sería gris, no habría lluvias en abril, simplemente lo bonito dejaría de exis`,
        text: `Las flores grises y color negro el mar / Sin ti el cielo sería gris, no habría lluvias en abril, simplemente lo bonito dejaría de existir`,
        explanation: `Dicen que en abril, aguas mil. Estas líneas nacen inspiradas en un verso de M.A.I de Milo J: "Si algún día de estos se hace gris tu cielo, lo pintaré mirando un río." Esa frase me encantó.`,
        type: 'reference'
      },
      {
        line: 12,
        phrase: `La diligencia de mi pereza`,
        text: `La diligencia de mi pereza`,
        explanation: `Para quien no lo sepa, diligencia es el antónimo de pereza, así que la frase juega con esa dualidad.`,
        type: 'wordplay'
      },
      {
        line: 20,
        phrase: `Tus ojos me dicen: por favor, quédate`,
        text: `Tus ojos me dicen: por favor, quédate`,
        explanation: `A veces los ojos comunican mucho más que las palabras.`,
        type: 'metaphor'
      },
      {
        line: 22,
        phrase: `Como yo te veo es diferente a cómo tú te ves, tú para mí eres arte, ojalá lo pudieras ver`,
        text: `Como yo te veo es diferente a cómo tú te ves, tú para mí eres arte, ojalá lo pudieras ver`,
        explanation: `Este verso refleja una sensación muy común: cuando ves a alguien que te parece increíble, pero esa persona no logra ver su propia belleza. Es el deseo de que, algún día, pueda mirarse con los mismos ojos con los que tú la ves.`,
        type: 'emotion'
      },
    ],
    translations: {
      en: {
        title: 'Please, Stay',
        description: `At first glance, this song might seem to be about emotional dependency, and it partly is. However, its true underlying meaning revolves around the fear of developing that dependency. While I haven't experienced it firsthand, I've witnessed it very closely.`,
        lyrics: `What would I do without you
Life would lose its meaning
Don't part from me

My life would lose the meaning you give it
Your absence would cause anxiety
The flowers grey and the sea black
Without you the sky would be grey
There would be no rain in April
Simply all beauty would cease to exist

The goddess of beauty
The goddess of nature
The diligence of my laziness
And of my kingdom, my highness

Why do I miss you so much if we saw each other yesterday
Baby, I'm the bear and you're the honey
I don't care about being unwell as long as you're fine
Realize that to see you I would build my own train
Your perfect smile is my sunrise
Your eyes tell me: please, stay

The way I see you is different from how you see yourself
To me you are art
I wish you could see it`,
        annotations: [
          {
            line: 6,
            phrase: `The flowers grey and the sea black / Without you the sky would be grey, there would be no rain in April, simply all beauty would cease to ex`,
            text: `The flowers grey and the sea black / Without you the sky would be grey, there would be no rain in April, simply all beauty would cease to exist`,
            explanation: `There's a saying "April showers bring May flowers". These lines were inspired by a verse from M.A.I by Milo J: "If one of these days your sky turns grey, I'll paint it watching a river." I loved that phrase.`,
            type: 'reference'
          },
          {
            line: 12,
            phrase: `The diligence of my laziness`,
            text: `The diligence of my laziness`,
            explanation: `For those who don't know, diligence is the antonym of laziness, so the phrase plays with that duality.`,
            type: 'wordplay'
          },
          {
            line: 20,
            phrase: `Your eyes tell me: please, stay`,
            text: `Your eyes tell me: please, stay`,
            explanation: `Sometimes eyes communicate much more than words.`,
            type: 'metaphor'
          },
          {
            line: 22,
            phrase: `The way I see you is different from how you see yourself, to me you are art, I wish you could see it`,
            text: `The way I see you is different from how you see yourself, to me you are art, I wish you could see it`,
            explanation: `This verse reflects a very common feeling: when you see someone who seems incredible to you, but that person can't see their own beauty. It's the desire for them to someday see themselves through your eyes.`,
            type: 'emotion'
          },
        ]
      }
    }
  },
  {
    id: '3',
    title: 'Te acompañaré',
    artist: 'Makwin',
    coverUrl: '/Portadas/Te acompañaré.jpg',
    coverColor: '#666666',
    releaseDate: '2025-06-30',
    slug: 'Teacompanare-Makwin',
    originalLanguage: 'es',
    description: `A primera escucha, "Te acompañaré" puede parecer una canción de apoyo incondicional hacia alguien que atraviesa un momento difícil. Y lo es, pero con el tiempo entendí que refleja algo más profundo: el error de perderte a ti mismo intentando salvar a quien no quiere o no puede salvarse.

Normalmente cuando alguien que amas te dice que está cansado de vivir, la primera reacción es ofrecerse por completo, intentar sostenerla, acompañarla hasta el fin del mundo si hace falta. Hoy comprendo que no puedes sanar a nadie si esa persona no quiere sanar por sí misma, y que, si uno no está bien en soledad, tampoco podrá estar bien en compañía.`,
    lyrics: `Cuando sientas que la vida no es para ti 
Recuerda siempre que yo estaré aquí
Cuando las olas choquen y el cielo sea gris
Seré Moisés y Dalí

Sale la luna y todo vuelve a estar mal
El día solo te calma la ansiedad
Tu cerebro solo hace que sobrepensar
Ven aquí yo me dejo abrazar


Otra vez
Otra vez lo has vuelto a hacer
Y otra vez
Si pa' curarte tienes que ir a Marte te acompañaré

Y seguiré 
Sonriendo a pesar que tú no lo estés
Rodeada de gente feliz la mejor forma de estar bien`,
    annotations: [
      {
        line: 3,
        phrase: `Cuando las olas choquen y el cielo sea gris / Seré Moisés y Da`,
        text: `Cuando las olas choquen y el cielo sea gris / Seré Moisés y Dalí`,
        explanation: `Esta línea une dos símbolos: Moisés, como figura que separa el mar y domina las olas (en referencia a "cuando las olas choquen"), y Dalí, como pintor que transforma la oscuridad en arte, "pintando el cielo gris con color". Es una forma poética de decir "cuando todo se derrumbe, yo intentaré transformar el caos en calma".`,
        type: 'metaphor'
      },
      {
        line: 5,
        phrase: `Sale la luna y todo vuelve a estar mal / El día solo te calma la ansiedad / Tu cerebro solo hace que sobrepensar / Ven aquí yo me dejo ab`,
        text: `Sale la luna y todo vuelve a estar mal / El día solo te calma la ansiedad / Tu cerebro solo hace que sobrepensar / Ven aquí yo me dejo abrazar`,
        explanation: `Representa ese momento en que la noche amplifica los pensamientos negativos. La oscuridad da paso a la sobrecarga mental, a la ansiedad. El verso final —"Ven aquí, yo me dejo abrazar"— es una muestra de empatía silenciosa, de ofrecerse como refugio emocional sin palabras.`,
        type: 'emotion'
      },
      {
        line: 11,
        phrase: `Otra vez Otra vez lo has vuelto a hacer`,
        text: `Otra vez Otra vez lo has vuelto a hacer`,
        explanation: `Este fragmento no apunta a un acto concreto, sino a cualquier acción autodestructiva que alguien repite intentando sanar - cualquier hábito nocivo—. Es la frustración de ver cómo alguien que quieres se hiere una y otra vez.`,
        type: 'emotion'
      },
      {
        line: 13,
        phrase: `Si pa' curarte tienes que ir a Marte te acompañaré`,
        text: `Si pa' curarte tienes que ir a Marte te acompañaré`,
        explanation: `Una forma poética de expresar un apoyo absoluto: "te seguiría hasta lo imposible si eso te ayudara a sanar". Aunque romántica, también es una metáfora del sacrificio excesivo, de hasta dónde uno está dispuesto a llegar por amor, incluso si eso implica perderse en el proceso.`,
        type: 'metaphor'
      },
      {
        line: 15,
        phrase: `Y seguiré Sonriendo a pesar que tú no lo estés  Rodeada de gente feliz la mejor forma de estar bien`,
        text: `Y seguiré Sonriendo a pesar que tú no lo estés Rodeada de gente feliz la mejor forma de estar bien`,
        explanation: `Hace eco del dicho "dime con quién andas y te diré quién eres". La idea es que la felicidad puede contagiarse, y que a veces sonreír —aunque cueste— puede servir como una pequeña fuente de luz para quien está en la oscuridad.`,
        type: 'reference'
      }
    ],
    translations: {
      en: {
        title: "I'll Accompany You",
        description: `At first listen, "I'll Accompany You" might seem like a song of unconditional support for someone going through a difficult time. And it is, but over time I understood that it reflects something deeper: the mistake of losing yourself trying to save someone who doesn't want to or cannot be saved.

Usually when someone you love tells you they're tired of living, the first reaction is to offer yourself completely, try to hold them up, accompany them to the end of the world if necessary. Today I understand that you can't heal anyone if that person doesn't want to heal themselves, and that if one isn't well in solitude, they won't be well in company either.`,
        lyrics: `When you feel that life isn't for you
Remember I'll always be here
When the waves crash and the sky is grey
I'll be Moses and Dalí

The moon rises and everything goes wrong again
The day only calms your anxiety
Your brain just keeps overthinking
Come here, I'll let myself be embraced


Again
Again, you've done it again 

and again


If to heal you need to go to Mars I'll accompany you

And I'll continue
Smiling even though you're not
Surrounded by happy people, the best way to be okay`,
        annotations: [
          {
            line: 3,
            phrase: `When the waves crash and the sky is grey / I'll be Moses and Dal`,
            text: `When the waves crash and the sky is grey / I'll be Moses and Dalí`,
            explanation: `This line unites two symbols: Moses, as the figure who parts the sea and controls the waves (referring to "when the waves crash"), and Dalí, as the painter who transforms darkness into art, "painting the grey sky with color". It's a poetic way of saying "when everything falls apart, I'll try to transform chaos into calm".`,
            type: 'metaphor'
          },
          {
            line: 5,
            phrase: `The moon rises and everything goes wrong again / The day only calms your anxiety / Your brain just keeps overthinking / Come here, I'll let myself be emb`,
            text: `The moon rises and everything goes wrong again / The day only calms your anxiety / Your brain just keeps overthinking / Come here, I'll let myself be embraced`,
            explanation: `Represents that moment when night amplifies negative thoughts. Darkness gives way to mental overload, to anxiety. The final verse —"Come here, I'll let myself be embraced"— is a show of silent empathy, offering oneself as an emotional refuge without words.`,
            type: 'emotion'
          },
          {
            line: 11,
            phrase: `Again Again, you've done it again`,
            text: `Again Again, you've done it again`,
            explanation: `This fragment doesn't point to a specific act, but to any self-destructive action that someone repeats trying to heal - any harmful habit. It's the frustration of seeing someone you love hurt themselves over and over again.`,
            type: 'emotion'
          },
          {
            line: 13,
            phrase: `If to heal you need to go to Mars I'll accompany you`,
            text: `If to heal you need to go to Mars I'll accompany you`,
            explanation: `A poetic way of expressing absolute support: "I would follow you to the impossible if that would help you heal". Although romantic, it's also a metaphor for excessive sacrifice, for how far one is willing to go for love, even if it means losing oneself in the process.`,
            type: 'metaphor'
          },
          {
            line: 15,
            phrase: `And I'll continue Smiling even though you're not surrounded by happy people, the best way to be okay`,
            text: `And I'll continue Smiling even though you're not surrounded by happy people, the best way to be okay`,
            explanation: `Echoes the saying "tell me who you walk with and I'll tell you who you are". The idea is that happiness can be contagious, and that sometimes smiling —even when it's hard— can serve as a small source of light for someone in darkness.`,
            type: 'reference'
          }
        ]
      }
    }
  },
  {
    id: '4',
    title: 'x Ti, x Mi y x Nosotros',
    artist: 'Makwin',
    coverUrl: '/Portadas/x Ti, x Mi y x Nosotros.jpg',
    coverColor: '#f5f5f5',
    releaseDate: '2025-08-09',
    slug: 'xTixMiyxNosotros-Makwin',
    originalLanguage: 'es',
    description: `Esta canción nace de un conflicto interno: el equilibrio entre el amor propio y el amor hacia otra persona. Es una reflexión sobre ese punto en una relación donde la duda aparece, porque a veces el amor no basta para sostenerlo todo.

"x Ti, x Mi y x Nosotros" explora el miedo a perderse a uno mismo por cuidar a otro, y al mismo tiempo, el terror a perder a esa persona si decides priorizarte.
Habla del proceso de escuchar la intuición, reconocer las señales, cuestionar la verdad —la que te dices a ti mismo y la que recibes del otro— y enfrentarte a la incertidumbre emocional sin certezas claras.

Es una canción honesta sobre la fragilidad y la fortaleza que conviven en el amor; sobre querer, temer, avanzar aun sintiendo vértigo, y esperar que, si ambos caminan hacia la verdad, el destino no sea "tú o yo", sino "nosotros".`,
    lyrics: `Necesito escribir para expresar todo, salir al parque, pero salir yo solo
Si yo mismo me acompaño, sé que todo se comprime en mi mano y lo controlo
La duda presente, aunque no me deja verla, y confío en la intuición, aunque buena no sea

A veces falla, en otras es asertiva, ojalá me hubiese fallado aquel día
Si el único que me dice la verdad soy yo mismo, me tocará remar sin remos y con estrabismo
La mentira es mentirosa, pon el oído, confiesa ahora, si no, me lo dirá algún pajarito
Me da miedo ser de usar y tirar, ser el paraguas roto que aguanta tu tempestad

que me escondas que me odias y algunas cosas más, espero que me quieras de verdad
Tal vez se trate de un cactus al revés, algo que pincha por dentro, pero sacia la sed
Aunque tal vez tus espinas se den por la situación, ya me he pinchado, pero quiero seguir contigo
Soy un flotador

Tengo miedo de seguir porque te quiero, y también temo seguir, porque te quiero 
estoy confuso y no hallo el paradero de la respuesta, la respuesta que responde a todo esto
Si se da el caso, esperemos al ocaso, intercambiemos palabras, lloremos abrazados, 
Explícame hasta el porqué del color de tus ojos, y dime motivos para seguir, por ti, por mí
Y por nosotros`,
    annotations: [
      {
        line: 1,
        phrase: `Necesito escribir para expresar todo, salir al parque, pero salir yo solo
Si yo mismo me acompaño, sé que todo se comprime en mi mano y lo controlo`,
        text: `Necesito escribir para expresar todo, salir al parque, pero salir yo solo
Si yo mismo me acompaño, sé que todo se comprime en mi mano y lo controlo`,
        explanation: `Expresa la necesidad de aislamiento emocional para entenderse a sí mismo y procesar sentimientos. Reforzar la idea de que antes de estar bien con alguien, debes estar bien contigo.`,
        type: 'emotion'
      },
      {
        line: 3,
        phrase: `La duda presente, aunque no me deja verla, y confío en la intuición, aunque buena no sea`,
        text: `La duda presente, aunque no me deja verla, y confío en la intuición, aunque buena no sea`,
        explanation: `Tengo dudas, no consigo confiar en ti, y aunque el cegado por amor me prohíba admitir la manca de confianza, esta existe.`,
        type: 'emotion'
      },
      {
        line: 5,
        phrase: `A veces falla, en otras es asertiva, ojalá me hubiese fallado aquel día`,
        text: `A veces falla, en otras es asertiva, ojalá me hubiese fallado aquel día`,
        explanation: `La intuición falla a veces, en otras acierta... aquella vez acertó, y ojalá hubiera fallado.`,
        type: 'emotion'
      },
      {
        line: 6,
        phrase: `Me tocará remar sin remos y con estrabismo`,
        text: `Me tocará remar sin remos y con estrabismo`,
        explanation: `Metáfora visual de avanzar en la vida sin herramientas claras y sin visión definida, representando confusión y esfuerzo emocional.`,
        type: 'metaphor'
      },
      {
        line: 7,
        phrase: `La mentira es mentirosa, pon el oído, confiesa ahora, si no, me lo dirá algún pajarito`,
        text: `La mentira es mentirosa, pon el oído, confiesa ahora, si no, me lo dirá algún pajarito`,
        explanation: `Referencia a la idea popular "los secretos siempre se saben". Refleja desconfianza y miedo a ser engañado.`,
        type: 'reference'
      },
      {
        line: 8,
        phrase: `Me da miedo ser de usar y tirar, ser el paraguas roto que aguanta tu tempestad`,
        text: `Me da miedo ser de usar y tirar, ser el paraguas roto que aguanta tu tempestad`,
        explanation: `Temor a ser utilizado solo cuando hace falta apoyo emocional. Imagen de ser útil solo para soportar el dolor del otro.`,
        type: 'metaphor'
      },
      {
        line: 10,
        phrase: `Tal vez se trate de un cactus al revés, algo que pincha por dentro, pero sacia la sed`,
        text: `Tal vez se trate de un cactus al revés, algo que pincha por dentro, pero sacia la sed`,
        explanation: `El amor duele, pero al mismo tiempo nutre y da vida. Mostrar que incluso lo que hiere puede ser necesario emocionalmente.`,
        type: 'metaphor'
      },
      {
        line: 14,
        phrase: `Tengo miedo de seguir porque te quiero, y también temo seguir, porque te quiero`,
        text: `Tengo miedo de seguir porque te quiero, y también temo seguir, porque te quiero`,
        explanation: `Frase central: el amor como causa de avance y freno a la vez. Miedo a perder todo por amar y miedo a perder el amor si se toma distancia.`,
        type: 'emotion'
      },
      {
        line: 17,
        phrase: `Explícame hasta el porqué del color de tus ojos, y dime motivos para seguir, por ti, por mí y por nosotros`,
        text: `Explícame hasta el porqué del color de tus ojos, y dime motivos para seguir, por ti, por mí y por nosotros`,
        explanation: `Deseo de entender todo de la otra persona y de encontrar razones sinceras para seguir juntos. Pide claridad, profundidad y reciprocidad.`,
        type: 'emotion'
      }
    ],
    translations: {
      en: {
        title: 'For You, For Me and For Us',
        description: `This song emerges from an internal conflict: the balance between self-love and love for another person. It's a reflection on that point in a relationship where doubt appears, because sometimes love isn't enough to sustain everything.

"For You, For Me and For Us" explores the fear of losing oneself while caring for another, and at the same time, the terror of losing that person if you choose to prioritize yourself.
It talks about the process of listening to intuition, recognizing signals, questioning truth —both the one you tell yourself and the one you receive from the other— and facing emotional uncertainty without clear certainties.

It's an honest song about the fragility and strength that coexist in love; about wanting, fearing, moving forward even while feeling vertigo, and hoping that if both walk towards truth, the destination won't be "you or me", but "us".`,
        lyrics: `I need to write to pour it all out, go to the park, but go alone
If I accompany myself, I know everything compresses in my hand and I control it
Doubt is present, though it won't let me see it, and I trust intuition, even if it's not good

Sometimes it fails, other times it's assertive, I wish it had failed me that day
If I'm the only one telling myself the truth, I'll have to row without oars and with strabismus
The lie is deceitful, listen closely, confess now, if not, a little bird will tell me
I'm afraid of being disposable, being the broken umbrella that withstands your storm

that you hide me that you hate me and some other things, I hope you truly love me
Maybe it's like an inverted cactus, something that hurts inside, but quenches thirst
Although maybe your thorns are due to the situation, I've been pricked, but I want to continue with you
I'm a float

I'm afraid to continue because I love you, and I also fear continuing, because I love you
I'm confused and can't find the whereabouts of the answer, the answer that responds to all this
If it comes to that, let's wait for sunset, exchange words, cry embraced, explain to me
Even why your eyes are the color they are, and give me reasons to continue, for you, for me
And for us`,
        annotations: [
          {
            line: 1,
            phrase: `I need to write to pour it all out, go to the park, but go alone
If I accompany myself, I know everything compresses in my hand and I control it`,
            text: `I need to write to pour it all out, go to the park, but go alone
If I accompany myself, I know everything compresses in my hand and I control it`,
            explanation: `Expresses the need for emotional isolation to understand oneself and process feelings. Reinforces the idea that before being well with someone, you must be well with yourself.`,
            type: 'emotion'
          },
          {
            line: 3,
            phrase: `Doubt is present, though it won't let me see it, and I trust intuition, even if it's not good`,
            text: `Doubt is present, though it won't let me see it, and I trust intuition, even if it's not good`,
            explanation: `I have doubts, I can't trust you, and although being blinded by love forbids me from admitting the lack of trust, it exists.`,
            type: 'emotion'
          },
          {
            line: 5,
            phrase: `Sometimes it fails, other times it's assertive, I wish it had failed me that day`,
            text: `Sometimes it fails, other times it's assertive, I wish it had failed me that day`,
            explanation: `Intuition fails sometimes, other times it's right... that time it was right, and I wish it had been wrong.`,
            type: 'emotion'
          },
          {
            line: 6,
            phrase: `I'll have to row without oars and with strabismus`,
            text: `I'll have to row without oars and with strabismus`,
            explanation: `Visual metaphor of moving through life without clear tools and without defined vision, representing confusion and emotional effort.`,
            type: 'metaphor'
          },
          {
            line: 7,
            phrase: `The lie is deceitful, listen closely, confess now, if not, a little bird will tell me`,
            text: `The lie is deceitful, listen closely, confess now, if not, a little bird will tell me`,
            explanation: `Reference to the popular idea that "secrets always come out". Reflects distrust and fear of being deceived.`,
            type: 'reference'
          },
          {
            line: 8,
            phrase: `I'm afraid of being disposable, being the broken umbrella that withstands your storm`,
            text: `I'm afraid of being disposable, being the broken umbrella that withstands your storm`,
            explanation: `Fear of being used only when emotional support is needed. Image of being useful only to endure another's pain.`,
            type: 'metaphor'
          },
          {
            line: 10,
            phrase: `Maybe it's like an inverted cactus, something that hurts inside, but quenches thirst`,
            text: `Maybe it's like an inverted cactus, something that hurts inside, but quenches thirst`,
            explanation: `Love hurts, but at the same time nourishes and gives life. Shows that even what hurts can be emotionally necessary.`,
            type: 'metaphor'
          },
          {
            line: 14,
            phrase: `I'm afraid to continue because I love you, and I also fear continuing, because I love you`,
            text: `I'm afraid to continue because I love you, and I also fear continuing, because I love you`,
            explanation: `Central phrase: love as both cause for advancement and brake at the same time. Fear of losing everything through love and fear of losing love if distance is taken.`,
            type: 'emotion'
          },
          {
            line: 17,
            phrase: `Even why your eyes are the color they are, and give me reasons to continue, for you, for me and for us`,
            text: `Even why your eyes are the color they are, and give me reasons to continue, for you, for me and for us`,
            explanation: `Desire to understand everything about the other person and find sincere reasons to stay together. Asks for clarity, depth, and reciprocity.`,
            type: 'emotion'
          }
        ]
      }
    }
  },
  {
    id: '5',
    title: 'You Left Me For The Other Guy',
    artist: 'Makwin',
    coverUrl: '/Portadas/You Left Me For The Other Guy.jpg',
    coverColor: '#f5f5f5',
    releaseDate: '2025-08-11',
    slug: 'YouLeftMeForTheOtherGuy-Makwin',
    originalLanguage: 'en',
    description: `This song speaks about the mixture of anger left by betrayal and the need to understand. "You Left Me For The Other Guy" is a way of asking for honesty after being deceived — of facing pain and regaining dignity. It doesn’t seek revenge; it seeks to close the chapter through truth. It’s about accepting what happened, recognizing self-worth, and finally moving on.`,
    lyrics: `Baby, now that all has ended, won't you tell me the truth
You said you would never lie, and you did it more than twice
So I'll keep up with my life, I don't care about the past
If I love myself, and you hate yourself, tell me where was this supposed to end

I'm sorry if I ever did something wrong enough to make you cry
But I swear that's not my intention at all
And I thought you'd be sorry for making a little something wrong enough to make me cry
But that doesn't matter since you left me for the other guy
And I see you drown in my dreams, I don't wanna see you but you're staring at me
Oh baby, please let me go, you hurt me so much, now you have to let go
And you used to love me, that's what you said
But that's not even right, how can you love someone if you tell only lies

Oh, you lie. Baby, you lie so much. Why do you have to be like that
You lie, you lie, you lie
That's why I'm not even sorry if I ever did something wrong enough to make you cry
But I swear that's not my intention at all

And I thought you'd be sorry for making a little something wrong enough to make me cry
But that doesn't matter since you left me for the other guy
Left me for the other guy
And don't you dare talk to me, I swear I just want you to leave.`,
    annotations: [
      {
        line: 1,
        phrase: `Baby, now that all has ended, won't you tell me the truth`,
        text: `Baby, now that all has ended, won't you tell me the truth`,
        explanation: `Expresses the need to understand what happened, not to reconcile. It’s a search for closure — “now that we’ve broken up, you can finally tell the truth.”`,
        type: 'emotion'
      },
      {
        line: 2,
        phrase: `You said you would never lie, and you did it more than twice`,
        text: `You said you would never lie, and you did it more than twice`,
        explanation: `Suggests repeated betrayal — not once or twice. The tone shows disillusionment.`,
        type: 'emotion'
      },
      {
        line: 4,
        phrase: `If I love myself, and you hate yourself, tell me where was this supposed to end`,
        text: `If I love myself, and you hate yourself, tell me where was this supposed to end`,
        explanation: `Reflects the imbalance between two emotional states: self-love and self-hate can’t coexist in harmony.`,
        type: 'metaphor'
      },
      {
        line: 6,
        phrase: `I'm sorry if I ever did something wrong enough to make you cry`,
        text: `I'm sorry if I ever did something wrong enough to make you cry`,
        explanation: `Shows humanity and empathy — acknowledging the possibility of having caused pain unintentionally.`,
        type: 'emotion'
      },
      {
        line: 8,
        phrase: `And I thought you'd be sorry for making a little something wrong enough to make me cry`,
        text: `And I thought you'd be sorry for making a little something wrong enough to make me cry`,
        explanation: `Reveals disappointment and lack of reciprocity — the other person feels no remorse.`,
        type: 'emotion'
      },
       {
        line: 18,
        phrase: `But that doesn't matter since you left me for the other guy`,
        text: `But that doesn't matter since you left me for the other guy / Left me for the other guy`,
        explanation: `Marks the moment of acceptance — no longer fighting what has already happened.`,
        type: 'emotion'
      },
      {
        line: 10,
        phrase: `And I see you drown in my dreams, I don't wanna see you but you're staring at me`,
        text: `And I see you drown in my dreams, I don't wanna see you but you're staring at me`,
        explanation: `Portrays the persistence of a memory — “I don’t want to see you, but you keep looking at me.” The subconscious still clings to pain.`,
        type: 'metaphor'
      },
      {
        line: 12,
        phrase: `How can you love someone if you tell only lies`,
        text: `How can you love someone if you tell only lies`,
        explanation: `Questions the authenticity of love; love built on deceit cannot be real.`,
        type: 'emotion'
      },
      {
        line: 14,
        phrase: `Oh, you lie. Baby, you lie so much. Why do you have to be like that / You lie, you lie, you li`,
        text: `Oh, you lie. Baby, you lie so much. Why do you have to be like that / You lie, you lie, you lie`,
        explanation: `Acts as a cathartic outburst — an explosion of bottled-up frustration.`,
        type: 'emotion'
      },
      {
        line: 20,
        phrase: `And don't you dare talk to me, I swear I just want you to leave.`,
        text: `And don't you dare talk to me, I swear I just want you to leave.`,
        explanation: `Defines a boundary — protection as a form of healing.`,
        type: 'emotion'
      }
    ],
    translations: {
      es: {
        title: 'Me dejaste por otro',
        description: `Esta canción habla sobre la mezcla de ira que deja la traición y la necesidad de entender. "Me dejaste por otro" es una forma de pedir honestidad después de ser engañado — de enfrentar el dolor y recuperar la dignidad. No busca venganza; busca cerrar el capítulo a través de la verdad. Se trata de aceptar lo que pasó, reconocer el valor propio y finalmente seguir adelante.`,
        lyrics: `Cariño, ahora que todo ha acabado, ¿no vas a decirme la verdad?
Dijiste que nunca mentirías, y lo hiciste más de dos veces
Así que seguiré con mi vida, no me importa el pasado
Si yo me amo y tú te odias, dime ¿dónde se suponía que esto iba a terminar?

Lo siento si alguna vez hice algo lo suficientemente malo para hacerte llorar
Pero juro que esa no fue mi intención en absoluto
Y pensé que lo sentirías por hacer algo lo suficientemente malo para hacerme llorar
Pero eso ya no importa desde que me dejaste por otro

Y te veo ahogarte en mis sueños, no quiero verte pero me estás mirando
Oh cariño, por favor déjame ir, me has herido tanto, ahora tienes que soltarme
Y solías quererme, eso es lo que dijiste
Pero eso ni siquiera es cierto, ¿cómo puedes amar a alguien si solo dices mentiras?

Oh, mientes. Cariño, mientes tanto. ¿Por qué tienes que ser así?
Mientes, mientes, mientes
Por eso ni siquiera lo siento si alguna vez hice algo lo suficientemente malo para hacerte llorar
Pero juro que esa no fue mi intención en absoluto

Y pensé que lo sentirías por hacer algo lo suficientemente malo para hacerme llorar
Pero eso ya no importa desde que me dejaste por otro
Me dejaste por otro
Y ni se te ocurra hablarme, juro que solo quiero que te vayas.`,
        annotations: [
          {
            line: 1,
            phrase: `Cariño, ahora que todo ha acabado, ¿no vas a decirme la verdad?`,
            text: `Cariño, ahora que todo ha acabado, ¿no vas a decirme la verdad?`,
            explanation: `Expresa la necesidad de entender lo que pasó, no de reconciliarse. Es una búsqueda de cierre — "ahora que hemos terminado, finalmente puedes decir la verdad."`,
            type: 'emotion'
          },
          {
            line: 2,
            phrase: `Dijiste que nunca mentirías, y lo hiciste más de dos veces`,
            text: `Dijiste que nunca mentirías, y lo hiciste más de dos veces`,
            explanation: `Sugiere una traición repetida — no una o dos veces. El tono muestra desilusión.`,
            type: 'emotion'
          },
          {
            line: 4,
            phrase: `Si yo me amo y tú te odias, dime ¿dónde se suponía que esto iba a terminar?`,
            text: `Si yo me amo y tú te odias, dime ¿dónde se suponía que esto iba a terminar?`,
            explanation: `Refleja el desequilibrio entre dos estados emocionales: el amor propio y el odio hacia uno mismo no pueden coexistir en armonía.`,
            type: 'metaphor'
          },
          {
            line: 6,
            phrase: `Lo siento si alguna vez hice algo lo suficientemente malo para hacerte llorar`,
            text: `Lo siento si alguna vez hice algo lo suficientemente malo para hacerte llorar`,
            explanation: `Muestra humanidad y empatía — reconociendo la posibilidad de haber causado dolor sin intención.`,
            type: 'emotion'
          },
          {
            line: 8,
            phrase: `Y pensé que lo sentirías por hacer algo lo suficientemente malo para hacerme llorar`,
            text: `Y pensé que lo sentirías por hacer algo lo suficientemente malo para hacerme llorar`,
            explanation: `Revela decepción y falta de reciprocidad — la otra persona no siente remordimiento.`,
            type: 'emotion'
          },
          {
            line: 18,
            phrase: `Pero eso ya no importa desde que me dejaste por otro`,
            text: `Pero eso ya no importa desde que me dejaste por otro`,
            explanation: `Marca el momento de aceptación — ya no lucha contra lo que ya sucedió.`,
            type: 'emotion'
          },
          {
            line: 10,
            phrase: `Y te veo ahogarte en mis sueños, no quiero verte pero me estás mirando`,
            text: `Y te veo ahogarte en mis sueños, no quiero verte pero me estás mirando`,
            explanation: `Retrata la persistencia de un recuerdo — "No quiero verte, pero sigues mirándome." El subconsciente aún se aferra al dolor.`,
            type: 'metaphor'
          },
          {
            line: 12,
            phrase: `¿Cómo puedes amar a alguien si solo dices mentiras?`,
            text: `¿Cómo puedes amar a alguien si solo dices mentiras?`,
            explanation: `Cuestiona la autenticidad del amor; el amor construido sobre el engaño no puede ser real.`,
            type: 'emotion'
          },
          {
            line: 14,
            phrase: `Oh, mientes. Cariño, mientes tanto. ¿Por qué tienes que ser así? / Mientes, mientes, miente`,
            text: `Oh, mientes. Cariño, mientes tanto. ¿Por qué tienes que ser así? / Mientes, mientes, mientes`,
            explanation: `Actúa como una explosión catártica — una explosión de frustración contenida.`,
            type: 'emotion'
          },

          {
            line: 20,
            phrase: `Y ni se te ocurra hablarme, juro que solo quiero que te vayas.`,
            text: `Y ni se te ocurra hablarme, juro que solo quiero que te vayas.`,
            explanation: `Define un límite — la protección como forma de sanación.`,
            type: 'emotion'
          }
        ]
      }
    }
  },
  {
    id: '6',
    title: 'Your Problems Are Not Mine Anymore',
    artist: 'Makwin',
    coverUrl: '/Portadas/Your Problems Are Not Mine Anymore.jpg',
    coverColor: '#f5f5f5',
    releaseDate: '2025-08-10',
    slug: 'YourProblemsAreNotMineAnymore-Makwin',
    originalLanguage: 'en',
    description: `"Your Problems Are Not Mine Anymore" is a song that talks about emotional exhaustion and liberation. The song speaks of realizing that one cannot keep carrying someone else’s pain. It’s not about anger — the song talks about reclaiming peace and autonomy. Love has turned into a burden, and letting go becomes the only act of self-respect left.`,
    lyrics: `I know I loved you then, but I can't anymore
Cause, who would ever love you? if you think you're not enough
I've always trusted myself, never leaned on someone else
But what if I run out of hope

I would never live and I would never fall
For someone who made me feel weaker than I was
And I could never fall in love just cause you say you're mine
I need someone real, not just a mirror of my mind

I wanna be somewhere far, this love is tearing me apart
And I don't wanna cry, I wanna fall in someone's arms

I never learned how to cry, feel like I'm hollow inside
But my body still fights

I know that you're scared and I know that you care
But life is colder than you thought babe

And you keep crying every night, saying your world is losing light
Say all I want is to leave you behind

So I don't know why you still cry when you're the one who broke me down
There's a reason I'm walking away

And I can resume all of this in one sentence
Your problems are not mine anymore
And, I mean, I couldn't handle two lives at once
That was crazy, you know, so, yeah`,
    annotations: [
      {
        line: 1,
        phrase: `I know I loved you then, but I can't anymore`,
        text: `I know I loved you then, but I can't anymore`,
        explanation: `The moment of emotional detachment — love fades not out of hatred, but from exhaustion.`,
        type: 'emotion'
      },
      {
        line: 2,
        phrase: `Cause, who would ever love you? if you think you're not enough`,
        text: `Cause, who would ever love you? if you think you're not enough`,
        explanation: `Compassion mixed with frustration; lack of self-love makes genuine love impossible.`,
        type: 'emotion'
      },
      {
        line: 6,
        phrase: `I would never live and I would never fall for someone who made me feel weaker than I was`,
        text: `I would never live and I would never fall for someone who made me feel weaker than I was`,
        explanation: `Reclaiming self-worth after being emotionally diminished in the relationship.`,
        type: 'emotion'
      },
      {
        line: 9,
        phrase: `I need someone real, not just a mirror of my mind`,
        text: `I need someone real, not just a mirror of my mind`,
        explanation: `The partner is not a real individual but a reflection of the narrator’s own inner state — a projection of self rather than true connection.`,
        type: 'metaphor'
      },
      {
        line: 11,
        phrase: `This love is tearing me apart`,
        text: `This love is tearing me apart`,
        explanation: `Love personified as a force that splits the narrator internally, expressing inner conflict.`,
        type: 'metaphor'
      },
      {
        line: 13,
        phrase: `I never learned how to cry, feel like I'm hollow inside`,
        text: `I never learned how to cry, feel like I'm hollow inside`,
        explanation: `A numbness born from repression — the body still reacts, even when emotions can’t surface.`,
        type: 'emotion'
      },
      {
        line: 17,
        phrase: `And you keep crying every night, saying your world is losing light`,
        text: `And you keep crying every night, saying your world is losing light`,
        explanation: `Shows the contrast: one is detached while the other collapses under sadness.`,
        type: 'emotion'
      },
      {
        line: 18,
        phrase: `Your world is losing light`,
        text: `Your world is losing light`,
        explanation: `Light symbolizes hope and meaning; its loss represents emotional decay and despair.`,
        type: 'metaphor'
      },
      {
        line: 20,
        phrase: `Your problems are not mine anymore`,
        text: `Your problems are not mine anymore`,
        explanation: `The emotional climax — liberation through detachment. It’s about self-respect, not cruelty.`,
        type: 'emotion'
      },
      {
        line: 21,
        phrase: `I couldn't handle two lives at once`,
        text: `I couldn't handle two lives at once`,
        explanation: `Double meaning: emotionally living two lives, or carrying both people’s emotional burdens — an impossible weight.`,
        type: 'wordplay'
      }
    ],
    translations: {
      es: {
        title: 'Tus Problemas Ya No Son Míos',
        description: `"Tus Problemas Ya No Son Míos" es una canción que habla sobre el agotamiento emocional y la liberación. La canción trata de la realización de que uno no puede seguir cargando el dolor de otra persona. No se trata de ira — la canción habla de recuperar la paz y la autonomía. El amor se convirtió en una carga, y dejar ir se vuelve el único acto de respeto propio que queda.`,
        lyrics: `Sé que te quise entonces, pero ya no puedo más
Porque, ¿quién podría quererte? si piensas que no eres suficiente
Siempre confié en mí, nunca me apoyé en otra persona
Pero ¿y si me quedo sin esperanza?

Nunca viviría ni me enamoraría
De alguien que me hizo sentir más débil de lo que era
Y nunca podría enamorarme solo porque dices que eres mío
Necesito a alguien real, no solo un espejo de mi mente

Quiero estar en un lugar lejano, este amor me está destrozando
Y no quiero llorar, quiero caer en los brazos de alguien

Nunca aprendí a llorar, siento que estoy hueco por dentro
Pero mi cuerpo aún lucha

Sé que tienes miedo y sé que te importa
Pero la vida es más fría de lo que pensabas, nena

Y sigues llorando cada noche, diciendo que tu mundo pierde la luz
Dices que todo lo que quiero es dejarte atrás

Así que no sé por qué sigues llorando cuando tú fuiste quien me derribó
Hay una razón por la que me estoy alejando

Y puedo resumir todo esto en una frase
Tus problemas ya no son míos
Y, quiero decir, no pude manejar dos vidas a la vez
Eso fue una locura, ya sabes, así que, sí`,
        annotations: [
          {
            line: 1,
            phrase: `Sé que te quise entonces, pero ya no puedo más`,
            text: `Sé que te quise entonces, pero ya no puedo más`,
            explanation: `El momento del desapego emocional: el amor se desvanece no por odio, sino por agotamiento.`,
            type: 'emotion'
          },
          {
            line: 2,
            phrase: `Porque, ¿quién podría quererte? si piensas que no eres suficiente`,
            text: `Porque, ¿quién podría quererte? si piensas que no eres suficiente`,
            explanation: `Compasión mezclada con frustración; la falta de amor propio hace imposible un amor genuino.`,
            type: 'emotion'
          },
          {
            line: 6,
            phrase: `Nunca viviría ni me enamoraría de alguien que me hizo sentir más débil de lo que era`,
            text: `Nunca viviría ni me enamoraría de alguien que me hizo sentir más débil de lo que era`,
            explanation: `Recuperando la autoestima después de sentirse emocionalmente disminuido en la relación.`,
            type: 'emotion'
          },
          {
            line: 9,
            phrase: `Necesito a alguien real, no solo un espejo de mi mente`,
            text: `Necesito a alguien real, no solo un espejo de mi mente`,
            explanation: `La pareja no es un individuo real sino el reflejo del estado interior del narrador — una proyección del yo en lugar de una conexión verdadera.`,
            type: 'metaphor'
          },
          {
            line: 11,
            phrase: `Este amor me está destrozando`,
            text: `Este amor me está destrozando`,
            explanation: `El amor personificado como una fuerza que divide internamente al narrador, expresando conflicto interno.`,
            type: 'metaphor'
          },
          {
            line: 13,
            phrase: `Nunca aprendí a llorar, siento que estoy hueco por dentro`,
            text: `Nunca aprendí a llorar, siento que estoy hueco por dentro`,
            explanation: `Una insensibilidad nacida de la represión — el cuerpo aún reacciona, incluso cuando las emociones no pueden aflorar.`,
            type: 'emotion'
          },
          {
            line: 17,
            phrase: `Y sigues llorando cada noche, diciendo que tu mundo pierde la luz`,
            text: `Y sigues llorando cada noche, diciendo que tu mundo pierde la luz`,
            explanation: `Muestra el contraste: uno está desapegado mientras el otro se derrumba bajo la tristeza.`,
            type: 'emotion'
          },
          {
            line: 18,
            phrase: `Tu mundo pierde la luz`,
            text: `Tu mundo pierde la luz`,
            explanation: `La luz simboliza la esperanza y el sentido; su pérdida representa decadencia emocional y desesperación.`,
            type: 'metaphor'
          },
          {
            line: 20,
            phrase: `Tus problemas ya no son míos`,
            text: `Tus problemas ya no son míos`,
            explanation: `El clímax emocional — liberación a través del desapego. Se trata de respeto propio, no de crueldad.`,
            type: 'emotion'
          },
          {
            line: 21,
            phrase: `No pude manejar dos vidas a la vez`,
            text: `No pude manejar dos vidas a la vez`,
            explanation: `Doble sentido: vivir emocionalmente dos vidas, o cargar con las cargas emocionales de ambas personas — un peso imposible.`,
            type: 'wordplay'
          }
        ]
      }
    }
  }
];
