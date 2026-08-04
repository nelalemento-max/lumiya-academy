"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "./lib/firebase";
import "./account.css";

type ChildProfile = {
  id: string;
  name: string;
  age: number;
  avatar: string;
  level: number;
  stars: number;
  streak?: number;
  completedLessons?: number[];
  bestAccuracy?: number;
  courseCompleted?: boolean;
  gradeBand?: "primary" | "secondary";
  subjects?: string[];
  keyboardSettings?: {
    world: number;
    hands: boolean;
    sound: boolean;
    bigText: boolean;
  };
  readingLevel?: number;
  readingCompletedLessons?: number[];
  readingAssessmentScore?: number;
};

type CourseLesson = {
  title: string;
  skill: string;
  target: string;
};

const courseLessons: Record<"es" | "en", CourseLesson[]> = {
  es: [
    { title: "Acomoda tus dedos", skill: "Siente las guías de F y J", target: "fjasdklñ" },
    { title: "Ritmo inicial", skill: "Combina la fila guía", target: "asa sala dada falda" },
    { title: "Índice fuerte", skill: "G y H", target: "fgh jhg gafas haga" },
    { title: "Fila guía completa", skill: "Precisión sin mirar", target: "la sala es genial" },
    { title: "Subimos a E e I", skill: "E I con dedo medio", target: "eje idea isla jefe" },
    { title: "R y U", skill: "Alcanza la fila superior", target: "rueda dura jurar" },
    { title: "W O Q P", skill: "Extremos superiores", target: "poco queso equipo" },
    { title: "Reto superior", skill: "Palabras de dos filas", target: "quiero aprender rapido" },
    { title: "Bajamos a C y M", skill: "Fila inferior central", target: "cama mimo comida" },
    { title: "V N", skill: "Índices hacia abajo", target: "nave vino ventana" },
    { title: "X Z", skill: "Meñique y anular", target: "zorro feliz examen" },
    { title: "Teclado completo", skill: "Las tres filas", target: "mi teclado es divertido" },
    { title: "Mayúsculas", skill: "Usa Shift", target: "Lumi vive en Bolivia" },
    { title: "Coma y punto", skill: "Pausas al escribir", target: "escribo bien, rapido y feliz." },
    { title: "Signos y preguntas", skill: "¿ ? ¡ !", target: "¿listos? ¡vamos a escribir!" },
    { title: "Frases fluidas", skill: "Ritmo continuo", target: "cada dia escribo con mayor precision" },
    { title: "Desafío de velocidad", skill: "Mantén 85% o más", target: "lumi acompaña mi aventura de aprender" },
    { title: "Reto de la estrella", skill: "Graduación LumiType", target: "aprender hoy, crecer para siempre." },
  ],
  en: [
    { title: "Place your fingers", skill: "Feel the guides on F and J", target: "fjasdkl;" },
    { title: "First rhythm", skill: "Mix the home row", target: "sad fall dad flask" },
    { title: "Strong index", skill: "G and H", target: "fish had glass" },
    { title: "Full home row", skill: "Accuracy without looking", target: "a glad lad has salad" },
    { title: "Up to E and I", skill: "Middle fingers reach up", target: "idea side field" },
    { title: "R and U", skill: "Reach the top row", target: "rule rude true" },
    { title: "W O Q P", skill: "Top-row edges", target: "power quiet people" },
    { title: "Top-row challenge", skill: "Words across two rows", target: "i want to type quickly" },
    { title: "Down to C and M", skill: "Lower middle row", target: "come calm comic" },
    { title: "V and N", skill: "Index fingers move down", target: "van vine invent" },
    { title: "X and Z", skill: "Ring and little finger", target: "zoom extra lazy" },
    { title: "Full keyboard", skill: "All three rows", target: "my keyboard is fun" },
    { title: "Capital letters", skill: "Use Shift", target: "Lumi lives in Bolivia" },
    { title: "Comma and period", skill: "Punctuation pauses", target: "i type well, fast and happy." },
    { title: "Question marks", skill: "Questions and excitement", target: "are you ready? let us type!" },
    { title: "Fluent sentences", skill: "Continuous rhythm", target: "every day i type with more precision" },
    { title: "Speed challenge", skill: "Keep 85% or more", target: "lumi guides my learning adventure" },
    { title: "Star challenge", skill: "LumiType graduation", target: "learn today, grow forever." },
  ],
};

const lessonAlternatives: Record<"es" | "en", string[][]> = {
  es: [
    [], ["ala sala asa dala", "sal falla las alas"], ["haga gafas gas hagas", "gafas haga hall gas"],
    ["las hadas salen", "la falda es lila"], ["isla eje idea lija", "jefe elige la isla"],
    ["dura rueda jugar", "jurar ayuda a lula"], ["queso puro equipo", "papa quiere queso"],
    ["puedo escribir mejor", "quiero jugar y aprender"], ["mimo cama camino", "comida rica mama"],
    ["vino nave nueve", "ventana nueva vino"], ["examen zorro feliz", "zeta extra feliz"],
    ["escribir con calma ayuda", "practicar teclado es genial"], ["Lumi aprende Contigo", "Bolivia Escribe Feliz"],
    ["escribo lento, luego rapido.", "mi teclado, mi aventura."], ["¿seguimos? ¡claro que si!", "¿preparado? ¡vamos juntos!"],
    ["cada practica mejora mi ritmo", "mis dedos escriben con confianza"], ["escribo con precision y buen ritmo", "cada tecla me acerca a mi meta"],
    ["con practica puedo lograr grandes cosas.", "lumiya me ayuda a crecer cada dia."],
  ],
  en: [
    [], ["sad lad fall ask", "all lads ask"], ["glass fish had gas", "a glad fish has gas"],
    ["a glad lad has salad", "all flags shall fall"], ["side idea field", "jill likes the field"],
    ["true rule rude", "jude hurried up"], ["quiet people power", "people quote poems"],
    ["i want to learn quickly", "we type words with care"], ["calm comic come", "mimi can come"],
    ["new van invent", "nine vines vanish"], ["extra lazy zoom", "zany foxes relax"],
    ["typing calmly feels great", "practice makes typing easier"], ["Lumi Learns With Me", "Bolivia Types Today"],
    ["i type slowly, then quickly.", "my keyboard, my adventure."], ["are we ready? yes, we are!", "can we type? let us begin!"],
    ["every practice improves my rhythm", "my fingers type with confidence"], ["i type with accuracy and rhythm", "every key brings me closer"],
    ["with practice i can achieve great things.", "lumiya helps me grow every day."],
  ],
};

const copy = {
  es: {
    nav: ["Cursos", "Cómo funciona", "Planes", "Familias"], login: "Ingresar", start: "Comenzar ahora",
    eyebrow: "Plataforma educativa bilingüe para niños", titleA: "Aprender hoy.", titleB: "Crecer para siempre.",
    intro: "Una experiencia educativa divertida y segura para que cada niño aprenda a su ritmo, acompañado por Lumi.",
    trial: "Probar una lección", plans: "Ver planes familiares", trusted: "Primer curso disponible",
    course: "Mecanografía divertida", courseDesc: "Aprende a escribir con todos los dedos mientras juegas.",
    progress: "Tu progreso de hoy", lesson: "Lección 1 de 18", practice: "Práctica rápida",
    practiceHint: "Escribe las letras resaltadas usando los dedos correctos.", settings: "Personalizar", reset: "Reiniciar",
    done: "¡Excelente! Completaste la práctica.", accuracy: "Precisión", streak: "Racha", stars: "Estrellas",
    why: "Mucho más que escribir rápido", whySub: "Lumiya convierte cada práctica en un pequeño logro.",
    benefits: [["Aprende jugando", "Misiones cortas, premios y escenarios que mantienen la motivación."], ["Avanza a su ritmo", "Ejercicios que se adaptan a las teclas que cada niño necesita reforzar."], ["Acompañamiento familiar", "Los padres ven avances, tiempo de práctica y habilidades dominadas."]],
    familyTitle: "Un plan para cada familia", familySub: "Perfiles separados, progreso individual y acceso desde cualquier computadora.",
    month: "/mes", choose: "Elegir plan", popular: "Más elegido", planNames: ["Individual", "Familia", "Familia Plus"],
    planKids: ["1 estudiante", "Hasta 3 estudiantes", "Hasta 5 estudiantes"], footer: "Producido por Ing. Nelson Mendoza",
    panelTitle: "Personaliza tu espacio", panelSub: "Los cambios se aplican en la práctica al instante.", theme: "Escenario",
    themes: ["Aula", "Espacio", "Océano"], hands: "Mostrar manos", sound: "Sonidos de acierto", big: "Texto grande", close: "Listo",
  },
  en: {
    nav: ["Courses", "How it works", "Plans", "Families"], login: "Log in", start: "Start now",
    eyebrow: "Bilingual learning platform for children", titleA: "Learn today.", titleB: "Grow forever.",
    intro: "A fun and safe learning experience where every child grows at their own pace, guided by Lumi.",
    trial: "Try a lesson", plans: "See family plans", trusted: "First course available", course: "Fun Typing",
    courseDesc: "Learn to type with every finger while you play.", progress: "Today’s progress", lesson: "Lesson 1 of 18",
    practice: "Quick practice", practiceHint: "Type the highlighted letters using the correct fingers.", settings: "Customize",
    reset: "Reset", done: "Great job! You completed the practice.", accuracy: "Accuracy", streak: "Streak", stars: "Stars",
    why: "Much more than typing fast", whySub: "Lumiya turns every practice into a small achievement.",
    benefits: [["Learn through play", "Short missions, rewards and worlds that keep children motivated."], ["Grow at their pace", "Exercises adapt to the keys each child needs to reinforce."], ["Family guidance", "Parents see progress, practice time and mastered skills."]],
    familyTitle: "A plan for every family", familySub: "Separate profiles, individual progress and access from any computer.",
    month: "/month", choose: "Choose plan", popular: "Most popular", planNames: ["Individual", "Family", "Family Plus"],
    planKids: ["1 student", "Up to 3 students", "Up to 5 students"], footer: "Produced by Eng. Nelson Mendoza",
    panelTitle: "Customize your space", panelSub: "Changes appear in the practice instantly.", theme: "World",
    themes: ["Classroom", "Space", "Ocean"], hands: "Show hands", sound: "Success sounds", big: "Large text", close: "Done",
  },
} as const;

const rows = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ñ"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

type ReadingExercise = { kind: "listen" | "choice" | "picture" | "build"; display: string; sound: string; prompt: string; options?: string[]; answer?: string; icon?: string; story?: string };
type ReadingLesson = { title: string; skill: string; exercises: ReadingExercise[] };

const listenSet = (items: Array<[string,string,string,string]>) => items.map(([display,sound,word,icon]) => ({ kind:"listen" as const, display, sound, prompt:word, icon }));
const choiceSet = (items: Array<[string,string,string[],string,string?]>) => items.map(([display,sound,options,answer,prompt]) => ({ kind:"choice" as const, display, sound, prompt:prompt || display, options, answer }));
const pictureSet = (items: Array<[string,string[],string,string]>) => items.map(([word,options,answer,icon]) => ({ kind:"picture" as const, display:word, sound:word, prompt:word, options, answer, icon }));
const buildSet = (items: Array<[string,string[],string,string]>) => items.map(([word,options,answer,icon]) => ({ kind:"build" as const, display:word, sound:word, prompt:word, options, answer, icon }));

const readingLessons: Record<"es" | "en", ReadingLesson[]> = {
  es: [
    { title:"Las vocales suenan", skill:"Vocales · escuchar y repetir", exercises:listenSet([["A a","a","araña","🕷️"],["E e","e","elefante","🐘"],["I i","i","iglú","🧊"],["O o","o","oso","🐻"],["U u","u","uva","🍇"]]) },
    { title:"Reconozco la vocal", skill:"Vocales · sonido y grafía", exercises:choiceSet([["¿Qué vocal escuchas?","a",["a","e","o","u"],"a"],["¿Qué vocal escuchas?","e",["e","i","a","o"],"e"],["¿Qué vocal escuchas?","i",["i","u","e","a"],"i"],["¿Qué vocal escuchas?","o",["o","a","u","i"],"o"],["¿Qué vocal escuchas?","u",["u","o","i","e"],"u"]]) },
    { title:"La familia de la M", skill:"Sílabas directas", exercises:listenSet([["ma","ma","mano","✋"],["me","me","mesa","🪑"],["mi","mi","mío","🙋"],["mo","mo","mono","🐒"],["mu","mu","muñeca","🪆"]]) },
    { title:"La familia de la P", skill:"Sílabas directas", exercises:listenSet([["pa","pa","papá","👨"],["pe","pe","pelota","⚽"],["pi","pi","pipa","🪈"],["po","po","pollo","🐥"],["pu","pu","puerta","🚪"]]) },
    { title:"La familia de la S", skill:"Sílabas directas", exercises:listenSet([["sa","sa","sapo","🐸"],["se","se","semilla","🌱"],["si","si","silla","🪑"],["so","so","sol","☀️"],["su","su","suma","➕"]]) },
    { title:"La familia de la L", skill:"Sílabas directas", exercises:listenSet([["la","la","lápiz","✏️"],["le","le","leche","🥛"],["li","li","libro","📘"],["lo","lo","loro","🦜"],["lu","lu","luna","🌙"]]) },
    { title:"La familia de la T", skill:"Sílabas directas", exercises:listenSet([["ta","ta","taza","☕"],["te","te","techo","🏠"],["ti","ti","tigre","🐯"],["to","to","tomate","🍅"],["tu","tu","tucán","🐦"]]) },
    { title:"Palabras con M y P", skill:"Palabra e imagen", exercises:pictureSet([["mono",["mono","pan","mapa","pelota"],"mono","🐒"],["mapa",["mano","mapa","pollo","puerta"],"mapa","🗺️"],["pan",["mono","papá","pan","mesa"],"pan","🍞"],["mano",["mano","pelota","mapa","pan"],"mano","✋"],["papá",["pollo","mono","mesa","papá"],"papá","👨"]]) },
    { title:"Palabras con S y L", skill:"Palabra e imagen", exercises:pictureSet([["sol",["sol","luna","sapo","silla"],"sol","☀️"],["luna",["lápiz","luna","sol","libro"],"luna","🌙"],["sapo",["silla","sol","sapo","loro"],"sapo","🐸"],["silla",["silla","sapo","luna","lápiz"],"silla","🪑"],["lápiz",["libro","sol","lápiz","sapo"],"lápiz","✏️"]]) },
    { title:"Leo palabras: los animales", skill:"Palabra e imagen", exercises:pictureSet([["perro",["gato","perro","pato","sol"],"perro","🐶"],["gato",["gato","casa","perro","pato"],"gato","🐱"],["casa",["pelota","pato","casa","gato"],"casa","🏠"],["pelota",["perro","pelota","casa","pato"],"pelota","⚽"],["pato",["gato","casa","perro","pato"],"pato","🦆"]]) },
    { title:"Palabras con N y D", skill:"Palabra e imagen", exercises:pictureSet([["nido",["nido","dado","nube","dedo"],"nido","🪺"],["dedo",["nariz","dedo","nido","dado"],"dedo","☝️"],["nube",["nube","nariz","dedo","dado"],"nube","☁️"],["dado",["nido","nube","dado","nariz"],"dado","🎲"],["nariz",["dedo","nariz","nido","dado"],"nariz","👃"]]) },
    { title:"Palabras con R y C", skill:"Palabra e imagen", exercises:pictureSet([["rosa",["rosa","cama","ratón","coco"],"rosa","🌹"],["cama",["cohete","cama","rosa","ratón"],"cama","🛏️"],["ratón",["coco","cama","ratón","cohete"],"ratón","🐭"],["cohete",["cohete","rosa","coco","ratón"],"cohete","🚀"],["coco",["cama","ratón","coco","rosa"],"coco","🥥"]]) },
    { title:"Sílabas trabadas", skill:"Sílabas complejas", exercises:listenSet([["bla","bla","blanco","⚪"],["pla","pla","plátano","🍌"],["tra","tra","tractor","🚜"],["cri","cri","grillo","🦗"],["gru","gru","gruta","⛰️"]]) },
    { title:"Armo palabras", skill:"Unir sílabas", exercises:buildSet([["mesa",["sa","me"],"me|sa","🪑"],["pipa",["pa","pi"],"pi|pa","🪈"],["sapo",["po","sa"],"sa|po","🐸"],["luna",["na","lu"],"lu|na","🌙"],["dedo",["do","de"],"de|do","☝️"]]) },
    { title:"Leo frases cortas", skill:"Frases y comprensión", exercises:choiceSet([["El perro corre.","El perro corre",["El perro","El gato","La luna"],"El perro","¿Quién corre?"],["La luna sale.","La luna sale",["El sol","La luna","La casa"],"La luna","¿Qué sale?"],["Mi mamá me ama.","Mi mamá me ama",["Mi papá","Mi perro","Mi mamá"],"Mi mamá","¿Quién me ama?"],["El sol calienta.","El sol calienta",["El sol","La luna","El pan"],"El sol","¿Qué calienta?"],["Ana lee un libro.","Ana lee un libro",["Un mapa","Un libro","Una carta"],"Un libro","¿Qué lee Ana?"]]) },
    { title:"Entiendo lo que leo", skill:"Comprensión de detalles", exercises:choiceSet([["El gato duerme en la silla.","El gato duerme en la silla",["En la silla","En la luna","En el mapa"],"En la silla","¿Dónde duerme el gato?"],["Tomás come un tomate rojo.","Tomás come un tomate rojo",["Verde","Rojo","Azul"],"Rojo","¿De qué color es el tomate?"],["La abeja vuela sobre la rosa.","La abeja vuela sobre la rosa",["Sobre la rosa","Sobre la cama","Sobre el pan"],"Sobre la rosa","¿Sobre qué vuela la abeja?"],["El tren pasa por el túnel.","El tren pasa por el túnel",["Por la casa","Por el túnel","Por la luna"],"Por el túnel","¿Por dónde pasa el tren?"],["Lucía pinta una flor amarilla.","Lucía pinta una flor amarilla",["Una flor","Un sapo","Un dado"],"Una flor","¿Qué pinta Lucía?"]]) },
    { title:"Cuento: Tito el perrito", skill:"Mini-cuento y comprensión", exercises:choiceSet([["Tito es un perrito pequeño. Tito vive en una casa azul. Cada mañana juega con una pelota roja. Por la noche duerme bajo la luna.","Tito es un perrito pequeño. Tito vive en una casa azul. Cada mañana juega con una pelota roja. Por la noche duerme bajo la luna.",["Tito","Coco","Max"],"Tito","¿Cómo se llama el perrito?"],["El cuento de Tito","Tito vive en una casa azul",["Roja","Verde","Azul"],"Azul","¿De qué color es su casa?"],["El cuento de Tito","Tito juega con una pelota roja",["Con un libro","Con una pelota","Con un lápiz"],"Con una pelota","¿Con qué juega Tito?"],["El cuento de Tito","La pelota es roja",["Roja","Azul","Amarilla"],"Roja","¿De qué color es la pelota?"],["El cuento de Tito","Tito duerme bajo la luna",["En el sol","Bajo la luna","En una nube"],"Bajo la luna","¿Dónde duerme Tito?"]]) },
    { title:"Repaso final", skill:"Todas las habilidades", exercises:[{kind:"choice",display:"¿Qué vocal escuchas?",sound:"o",prompt:"Escucha y elige",options:["o","a","u","i"],answer:"o"},{kind:"listen",display:"ta",sound:"ta",prompt:"taza",icon:"☕"},{kind:"picture",display:"perro",sound:"perro",prompt:"perro",options:["gato","perro","pato","casa"],answer:"perro",icon:"🐶"},{kind:"build",display:"luna",sound:"luna",prompt:"luna",options:["na","lu"],answer:"lu|na",icon:"🌙"},{kind:"choice",display:"El sol calienta.",sound:"El sol calienta",prompt:"¿Qué calienta?",options:["El sol","La luna","El pan"],answer:"El sol"}] },
  ],
  en: [
    { title:"Vowels have sounds",skill:"Vowels · listen and repeat",exercises:listenSet([["A a","a","apple","🍎"],["E e","e","elephant","🐘"],["I i","i","igloo","🧊"],["O o","o","octopus","🐙"],["U u","u","umbrella","☂️"]]) },
    { title:"Recognize the vowel",skill:"Vowels · sound and letter",exercises:choiceSet([["Which vowel do you hear?","a",["a","e","o","u"],"a"],["Which vowel do you hear?","e",["e","i","a","o"],"e"],["Which vowel do you hear?","i",["i","u","e","a"],"i"],["Which vowel do you hear?","o",["o","a","u","i"],"o"],["Which vowel do you hear?","u",["u","o","i","e"],"u"]]) },
    { title:"The M family",skill:"Direct syllables",exercises:listenSet([["ma","ma","map","🗺️"],["me","me","melon","🍈"],["mi","mi","mirror","🪞"],["mo","mo","monkey","🐒"],["mu","mu","music","🎵"]]) },
    { title:"The P family",skill:"Direct syllables",exercises:listenSet([["pa","pa","papa","👨"],["pe","pe","pen","🖊️"],["pi","pi","pig","🐷"],["po","po","pot","🍲"],["pu","pu","pudding","🍮"]]) },
    { title:"The S family",skill:"Direct syllables",exercises:listenSet([["sa","sa","sand","🏖️"],["se","se","seed","🌱"],["si","si","sit","🪑"],["so","so","sun","☀️"],["su","su","soup","🥣"]]) },
    { title:"The L family",skill:"Direct syllables",exercises:listenSet([["la","la","lamp","💡"],["le","le","lemon","🍋"],["li","li","lion","🦁"],["lo","lo","log","🪵"],["lu","lu","lunar","🌙"]]) },
    { title:"The T family",skill:"Direct syllables",exercises:listenSet([["ta","ta","table","🪑"],["te","te","ten","🔟"],["ti","ti","tiger","🐯"],["to","to","tomato","🍅"],["tu","tu","tulip","🌷"]]) },
    { title:"Words with M and P",skill:"Word and picture",exercises:pictureSet([["monkey",["monkey","bread","map","ball"],"monkey","🐒"],["map",["hand","map","chicken","door"],"map","🗺️"],["bread",["monkey","dad","bread","table"],"bread","🍞"],["hand",["hand","ball","map","bread"],"hand","✋"],["dad",["chicken","monkey","table","dad"],"dad","👨"]]) },
    { title:"Words with S and L",skill:"Word and picture",exercises:pictureSet([["sun",["sun","moon","frog","chair"],"sun","☀️"],["moon",["pencil","moon","sun","book"],"moon","🌙"],["frog",["chair","sun","frog","parrot"],"frog","🐸"],["chair",["chair","frog","moon","pencil"],"chair","🪑"],["pencil",["book","sun","pencil","frog"],"pencil","✏️"]]) },
    { title:"Animal words",skill:"Word and picture",exercises:pictureSet([["dog",["cat","dog","duck","sun"],"dog","🐶"],["cat",["cat","house","dog","duck"],"cat","🐱"],["house",["ball","duck","house","cat"],"house","🏠"],["ball",["dog","ball","house","duck"],"ball","⚽"],["duck",["cat","house","dog","duck"],"duck","🦆"]]) },
    { title:"Words with N and D",skill:"Word and picture",exercises:pictureSet([["nest",["nest","dice","cloud","finger"],"nest","🪺"],["finger",["nose","finger","nest","dice"],"finger","☝️"],["cloud",["cloud","nose","finger","dice"],"cloud","☁️"],["dice",["nest","cloud","dice","nose"],"dice","🎲"],["nose",["finger","nose","nest","dice"],"nose","👃"]]) },
    { title:"Words with R and C",skill:"Word and picture",exercises:pictureSet([["rose",["rose","bed","mouse","coconut"],"rose","🌹"],["bed",["rocket","bed","rose","mouse"],"bed","🛏️"],["mouse",["coconut","bed","mouse","rocket"],"mouse","🐭"],["rocket",["rocket","rose","coconut","mouse"],"rocket","🚀"],["coconut",["bed","mouse","coconut","rose"],"coconut","🥥"]]) },
    { title:"Blended sounds",skill:"Complex syllables",exercises:listenSet([["bla","bla","blank","⚪"],["pla","pla","plant","🌱"],["tra","tra","tractor","🚜"],["cri","cri","cricket","🦗"],["gru","gru","group","👥"]]) },
    { title:"Build words",skill:"Join syllables",exercises:buildSet([["table",["ble","ta"],"ta|ble","🪑"],["paper",["per","pa"],"pa|per","📄"],["sunny",["ny","sun"],"sun|ny","☀️"],["lunar",["nar","lu"],"lu|nar","🌙"],["finger",["ger","fin"],"fin|ger","☝️"]]) },
    { title:"Read short sentences",skill:"Sentences and meaning",exercises:choiceSet([["The dog runs.","The dog runs",["The dog","The cat","The moon"],"The dog","Who runs?"],["The moon rises.","The moon rises",["The sun","The moon","The house"],"The moon","What rises?"],["My mom loves me.","My mom loves me",["My dad","My dog","My mom"],"My mom","Who loves me?"],["The sun warms us.","The sun warms us",["The sun","The moon","The bread"],"The sun","What warms us?"],["Ana reads a book.","Ana reads a book",["A map","A book","A letter"],"A book","What does Ana read?"]]) },
    { title:"Understand what I read",skill:"Reading details",exercises:choiceSet([["The cat sleeps on the chair.","The cat sleeps on the chair",["On the chair","On the moon","On the map"],"On the chair","Where does the cat sleep?"],["Tom eats a red tomato.","Tom eats a red tomato",["Green","Red","Blue"],"Red","What color is the tomato?"],["The bee flies over the rose.","The bee flies over the rose",["Over the rose","Over the bed","Over the bread"],"Over the rose","What does the bee fly over?"],["The train goes through the tunnel.","The train goes through the tunnel",["The house","The tunnel","The moon"],"The tunnel","Where does the train go?"],["Lucy paints a yellow flower.","Lucy paints a yellow flower",["A flower","A frog","A die"],"A flower","What does Lucy paint?"]]) },
    { title:"Story: Tito the puppy",skill:"Story comprehension",exercises:choiceSet([["Tito is a small puppy. He lives in a blue house. Each morning he plays with a red ball. At night he sleeps under the moon.","Tito is a small puppy. He lives in a blue house. Each morning he plays with a red ball. At night he sleeps under the moon.",["Tito","Coco","Max"],"Tito","What is the puppy's name?"],["Tito's story","Tito lives in a blue house",["Red","Green","Blue"],"Blue","What color is his house?"],["Tito's story","Tito plays with a red ball",["A book","A ball","A pencil"],"A ball","What does Tito play with?"],["Tito's story","The ball is red",["Red","Blue","Yellow"],"Red","What color is the ball?"],["Tito's story","Tito sleeps under the moon",["In the sun","Under the moon","In a cloud"],"Under the moon","Where does Tito sleep?"]]) },
    { title:"Final review",skill:"All reading skills",exercises:[{kind:"choice",display:"Which vowel do you hear?",sound:"o",prompt:"Listen and choose",options:["o","a","u","i"],answer:"o"},{kind:"listen",display:"ta",sound:"ta",prompt:"table",icon:"🪑"},{kind:"picture",display:"dog",sound:"dog",prompt:"dog",options:["cat","dog","duck","house"],answer:"dog",icon:"🐶"},{kind:"build",display:"lunar",sound:"lunar",prompt:"lunar",options:["nar","lu"],answer:"lu|nar",icon:"🌙"},{kind:"choice",display:"The sun warms us.",sound:"The sun warms us",prompt:"What warms us?",options:["The sun","The moon","The bread"],answer:"The sun"}] },
  ],
};

function readingPicture(word: string) {
  const pictures: Record<string,string> = { mono:"🐒",pan:"🍞",mapa:"🗺️",pelota:"⚽",mano:"✋",papá:"👨",pollo:"🐥",mesa:"🪑",puerta:"🚪",sol:"☀️",luna:"🌙",sapo:"🐸",silla:"🪑",loro:"🦜",lápiz:"✏️",libro:"📘",perro:"🐶",gato:"🐱",pato:"🦆",casa:"🏠",nido:"🪺",dado:"🎲",nube:"☁️",dedo:"☝️",nariz:"👃",rosa:"🌹",cama:"🛏️",ratón:"🐭",coco:"🥥",cohete:"🚀",monkey:"🐒",bread:"🍞",map:"🗺️",ball:"⚽",hand:"✋",dad:"👨",chicken:"🐥",table:"🪑",door:"🚪",sun:"☀️",moon:"🌙",frog:"🐸",chair:"🪑",parrot:"🦜",pencil:"✏️",book:"📘",dog:"🐶",cat:"🐱",duck:"🦆",house:"🏠",nest:"🪺",dice:"🎲",cloud:"☁️",finger:"☝️",nose:"👃",rose:"🌹",bed:"🛏️",mouse:"🐭",coconut:"🥥",rocket:"🚀" };
  return pictures[word.toLowerCase()] || "🖼️";
}

type FingerId = "l-pinky" | "l-ring" | "l-middle" | "l-index" | "thumb" | "r-index" | "r-middle" | "r-ring" | "r-pinky";

const fingerNames: Record<FingerId, { es: string; en: string }> = {
  "l-pinky": { es: "meñique izquierdo", en: "left little finger" },
  "l-ring": { es: "anular izquierdo", en: "left ring finger" },
  "l-middle": { es: "medio izquierdo", en: "left middle finger" },
  "l-index": { es: "índice izquierdo", en: "left index finger" },
  thumb: { es: "pulgar", en: "thumb" },
  "r-index": { es: "índice derecho", en: "right index finger" },
  "r-middle": { es: "medio derecho", en: "right middle finger" },
  "r-ring": { es: "anular derecho", en: "right ring finger" },
  "r-pinky": { es: "meñique derecho", en: "right little finger" },
};

function fingerForKey(key: string): FingerId {
  const normalized = key.toLocaleLowerCase("es");
  if (normalized === " ") return "thumb";
  if ("qaz".includes(normalized)) return "l-pinky";
  if ("wsx".includes(normalized)) return "l-ring";
  if ("edc".includes(normalized)) return "l-middle";
  if ("rftgvb".includes(normalized)) return "l-index";
  if ("yuhjnm".includes(normalized)) return "r-index";
  if ("ik,".includes(normalized)) return "r-middle";
  if ("ol.".includes(normalized)) return "r-ring";
  return "r-pinky";
}

export default function Home() {
  const [lang, setLang] = useState<"es" | "en">("es");
  const [typed, setTyped] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [world, setWorld] = useState(0);
  const [hands, setHands] = useState(true);
  const [sound, setSound] = useState(true);
  const [bigText, setBigText] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [account, setAccount] = useState<User | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [parentName, setParentName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [familyOpen, setFamilyOpen] = useState(false);
  const [activeChild, setActiveChild] = useState<ChildProfile | null>(null);
  const [courseLesson, setCourseLesson] = useState<number | null>(null);
  const [courseTyped, setCourseTyped] = useState(0);
  const [courseTarget, setCourseTarget] = useState("");
  const [courseMistakes, setCourseMistakes] = useState(0);
  const [courseBusy, setCourseBusy] = useState(false);
  const [courseResult, setCourseResult] = useState<{ passed: boolean; accuracy: number; stars: number } | null>(null);
  const [pressedFinger, setPressedFinger] = useState<FingerId | null>(null);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("8");
  const [childAvatar, setChildAvatar] = useState("🌟");
  const [childGradeBand, setChildGradeBand] = useState<"primary" | "secondary">("primary");
  const [profileBusy, setProfileBusy] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [readingOpen, setReadingOpen] = useState(false);
  const [readingStage, setReadingStage] = useState(0);
  const [readingScore, setReadingScore] = useState(0);
  const [readingSeconds, setReadingSeconds] = useState(0);
  const [readingFeedback, setReadingFeedback] = useState("");
  const [readingSequence, setReadingSequence] = useState<number[]>([]);
  const [readingLesson, setReadingLesson] = useState<number | null>(null);
  const [readingExercise, setReadingExercise] = useState(0);
  const [readingBuild, setReadingBuild] = useState<string[]>([]);
  const [readingLessonDone, setReadingLessonDone] = useState(false);
  const [readingBusy, setReadingBusy] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastFunnyErrorRef = useRef(0);
  const t = copy[lang];
  const target = lang === "es" ? "asdf jklñ" : "asdf jkl;";
  const current = target[typed] ?? "";
  const accuracy = typed + mistakes === 0 ? 100 : Math.round((typed / (typed + mistakes)) * 100);
  const worlds = ["classroom", "space", "ocean"];

  useEffect(() => onAuthStateChanged(auth, async (currentAccount) => {
    setAccount(currentAccount);
    if (currentAccount) {
      await loadChildren(currentAccount.uid);
    } else {
      setChildren([]);
      setFamilyOpen(false);
      setActiveChild(null);
    }
  }), []);

  useEffect(() => {
    if (!courseResult || !courseLesson || courseBusy) return;
    const advanceWithEnter = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      if (courseResult.passed && courseLesson < 18) startCourseLesson(courseLesson + 1);
      else startCourseLesson(courseLesson, !courseResult.passed);
    };
    window.addEventListener("keydown", advanceWithEnter);
    return () => window.removeEventListener("keydown", advanceWithEnter);
  }, [courseResult, courseLesson, courseBusy]);

  useEffect(() => {
    if (!readingOpen || readingStage >= 7) return;
    const timer = window.setInterval(() => setReadingSeconds((seconds) => Math.min(300, seconds + 1)), 1000);
    return () => window.clearInterval(timer);
  }, [readingOpen, readingStage]);

  async function loadChildren(uid: string) {
    const snapshot = await getDocs(query(collection(db, "parents", uid, "children"), orderBy("createdAt", "asc")));
    setChildren(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as ChildProfile[]);
  }

  function playTone(kind: "correct" | "error" | "complete") {
    if (!sound || typeof window === "undefined") return;
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) return;
    const context = audioContextRef.current || new AudioContextClass();
    audioContextRef.current = context;
    if (context.state === "suspended") void context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = kind === "error" ? "sawtooth" : "sine";
    const startFrequency = kind === "correct" ? 620 : kind === "complete" ? 520 : 260;
    const endFrequency = kind === "correct" ? 880 : kind === "complete" ? 1040 : 115;
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + (kind === "complete" ? .22 : .12));
    gain.gain.setValueAtTime(kind === "error" ? .035 : .045, now);
    gain.gain.exponentialRampToValueAtTime(.001, now + (kind === "complete" ? .3 : .16));
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + (kind === "complete" ? .31 : .17));
  }

  function speakFeedback(message: string, playful = false) {
    if (!sound || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const voice = new SpeechSynthesisUtterance(message);
    voice.lang = lang === "es" ? "es-BO" : "en-US";
    voice.rate = playful ? 1.18 : 1.05;
    voice.pitch = playful ? 1.45 : 1.2;
    voice.volume = .42;
    window.speechSynthesis.speak(voice);
  }

  function celebrateCorrect(nextTyped: number) {
    playTone("correct");
    if (nextTyped % 5 === 0) speakFeedback(lang === "es" ? "¡Yey!" : "Yay!", true);
  }

  function reactToError() {
    playTone("error");
    const now = Date.now();
    if (now - lastFunnyErrorRef.current > 900) {
      lastFunnyErrorRef.current = now;
      speakFeedback(lang === "es" ? "¡Ay, nooo!" : "Oh, nooo!", true);
    }
  }

  function openAccount(mode: "login" | "register") {
    setAuthMode(mode);
    setAuthError("");
    setAuthOpen(true);
  }

  async function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    try {
      if (authMode === "register") {
        const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(result.user, { displayName: parentName.trim() });
        await setDoc(doc(db, "parents", result.user.uid), {
          name: parentName.trim(),
          email: email.trim().toLowerCase(),
          role: "parent",
          language: lang,
          plan: "pending",
          createdAt: serverTimestamp(),
        });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      setAuthOpen(false);
      setFamilyOpen(true);
      setPassword("");
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      setAuthError(code.includes("email-already-in-use")
        ? (lang === "es" ? "Este correo ya está registrado." : "This email is already registered.")
        : code.includes("invalid-credential")
          ? (lang === "es" ? "Correo o contraseña incorrectos." : "Incorrect email or password.")
          : code.includes("weak-password")
            ? (lang === "es" ? "La contraseña debe tener al menos 6 caracteres." : "Password must contain at least 6 characters.")
            : (lang === "es" ? "No pudimos completar la operación. Inténtalo nuevamente." : "We could not complete the operation. Please try again."));
    } finally {
      setAuthBusy(false);
    }
  }

  async function addChildProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account || !childName.trim()) return;
    setProfileBusy(true);
    await addDoc(collection(db, "parents", account.uid, "children"), {
      name: childName.trim(),
      age: Number(childAge),
      avatar: childAvatar,
      level: 1,
      stars: 0,
      streak: 0,
      completedLessons: [],
      activeCourse: "lumitype",
      gradeBand: childGradeBand,
      subjects: ["typing"],
      keyboardSettings: { world: 0, hands: true, sound: true, bigText: false },
      createdAt: serverTimestamp(),
    });
    await loadChildren(account.uid);
    setChildName("");
    setProfileBusy(false);
  }

  const renderedTarget = useMemo(
    () =>
      target.split("").map((letter, index) => (
        <span key={index} className={index < typed ? "typed" : index === typed ? "current-letter" : ""}>
          {letter === " " ? "·" : letter}
        </span>
      )),
    [target, typed],
  );

  function handleKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (typed >= target.length) return;
    if (event.key.toLowerCase() === current) {
      const nextTyped = typed + 1;
      setTyped(nextTyped);
      celebrateCorrect(nextTyped);
    } else if (event.key.length === 1) {
      setMistakes((value) => value + 1);
      reactToError();
    }
  }

  function resetPractice() {
    setTyped(0);
    setMistakes(0);
  }

  function enterChildSpace(child: ChildProfile) {
    const preferences = { world: 0, hands: true, sound: true, bigText: false, ...child.keyboardSettings };
    setWorld(preferences.world);
    setHands(preferences.hands);
    setSound(preferences.sound);
    setBigText(preferences.bigText);
    setActiveChild(child);
    setFamilyOpen(false);
  }

  async function saveStudentSettings() {
    if (!account || !activeChild) return;
    setSettingsBusy(true);
    setSettingsMessage("");
    const keyboardSettings = { world, hands, sound, bigText };
    try {
      await updateDoc(doc(db, "parents", account.uid, "children", activeChild.id), { keyboardSettings });
      const updatedChild = { ...activeChild, keyboardSettings };
      setActiveChild(updatedChild);
      setChildren((currentChildren) => currentChildren.map((child) => child.id === activeChild.id ? updatedChild : child));
      setSettingsMessage(lang === "es" ? "Configuración guardada" : "Settings saved");
      window.setTimeout(() => setSettingsOpen(false), 650);
    } catch {
      setSettingsMessage(lang === "es" ? "No se pudo guardar. Inténtalo nuevamente." : "Could not save. Please try again.");
    } finally {
      setSettingsBusy(false);
    }
  }

  function readingVoice(message: string) {
    speakFeedback(message);
  }

  function openReadingCourse() {
    if (!activeChild) return;
    setReadingOpen(true);
    setReadingLesson(null);
    setReadingFeedback("");
    setReadingSequence([]);
    if (activeChild.readingAssessmentScore !== undefined) {
      setReadingStage(7);
    } else {
      setReadingStage(0);
      setReadingScore(0);
      setReadingSeconds(0);
      window.setTimeout(() => readingVoice(lang === "es" ? `¡Qué bien que estás aquí, ${activeChild.name}! Necesitamos tu ayuda para una misión importante.` : `We're so glad you're here, ${activeChild.name}! We need your help with an important mission.`), 250);
    }
  }

  function advanceReadingIntro() {
    const next = readingStage + 1;
    setReadingStage(next);
    setReadingFeedback("");
    const messages = lang === "es" ? [
      "Para esta misión aprenderás un poco todos los días. Nosotros te enseñaremos a hacerlo.",
      "Cada sesión dura cinco minutos. En el reloj podrás ver cuánto llevas. ¡Comencemos!",
    ] : [
      "For this mission, you will learn a little every day. We will show you how.",
      "Each session lasts five minutes. The clock shows your time. Let's begin!",
    ];
    if (next <= 2) window.setTimeout(() => readingVoice(messages[next - 1]), 150);
  }

  function gentleReadingFeedback() {
    setReadingFeedback(lang === "es" ? "No te preocupes. Respira, observa y prueba otra vez. Lumi cree en ti." : "Don't worry. Take a breath, look carefully, and try again. Lumi believes in you.");
    playTone("error");
  }

  function answerAssessment(correct: boolean) {
    if (!correct) { gentleReadingFeedback(); return; }
    const nextScore = readingScore + 1;
    setReadingScore(nextScore);
    setReadingFeedback(lang === "es" ? "¡Muy bien! Sigamos con la misión." : "Great job! Let's continue the mission.");
    playTone("correct");
    if (readingStage === 6) {
      window.setTimeout(() => void completeReadingAssessment(nextScore), 650);
    } else {
      window.setTimeout(() => { setReadingStage((stage) => stage + 1); setReadingFeedback(""); setReadingSequence([]); }, 650);
    }
  }

  function chooseSequencePiece(piece: number, total: number) {
    const expected = readingSequence.length + 1;
    if (piece !== expected) { setReadingSequence([]); gentleReadingFeedback(); return; }
    const next = [...readingSequence, piece];
    setReadingSequence(next);
    if (next.length === total) answerAssessment(true);
  }

  async function completeReadingAssessment(finalScore: number) {
    if (!account || !activeChild) return;
    setReadingBusy(true);
    try {
      await updateDoc(doc(db, "parents", account.uid, "children", activeChild.id), { readingAssessmentScore: finalScore, readingLevel: 1, readingCompletedLessons: [], subjects: arrayUnion("reading") });
      const updated = { ...activeChild, readingAssessmentScore: finalScore, readingLevel: 1, readingCompletedLessons: [], subjects: [...new Set([...(activeChild.subjects || []), "reading"])] };
      setActiveChild(updated);
      setChildren((profiles) => profiles.map((profile) => profile.id === updated.id ? updated : profile));
      setReadingStage(7);
      setReadingFeedback("");
      speakFeedback(lang === "es" ? "¡Misión completada! Ya sabemos por dónde comenzar tu aventura de lectura." : "Mission complete! We now know where to begin your reading adventure.", true);
    } finally { setReadingBusy(false); }
  }

  function startReadingLesson(lessonNumber: number) {
    setReadingLesson(lessonNumber);
    setReadingExercise(0);
    setReadingBuild([]);
    setReadingLessonDone(false);
    setReadingFeedback("");
    const exercise = readingLessons[lang][lessonNumber - 1].exercises[0];
    window.setTimeout(() => readingVoice(`${exercise.display}. ${exercise.sound}`), 180);
  }

  async function completeReadingExercise() {
    if (!account || !activeChild || !readingLesson || readingBusy) return;
    const lesson = readingLessons[lang][readingLesson - 1];
    if (readingExercise < lesson.exercises.length - 1) {
      playTone("correct");
      setReadingFeedback(lang === "es" ? "¡Muy bien! Vamos al siguiente ejercicio." : "Great job! Let's go to the next activity.");
      window.setTimeout(() => {
        const nextExercise = readingExercise + 1;
        setReadingExercise(nextExercise);
        setReadingBuild([]);
        setReadingFeedback("");
        const next = lesson.exercises[nextExercise];
        readingVoice(`${next.display}. ${next.sound}`);
      }, 550);
      return;
    }
    playTone("complete");
    setReadingFeedback(lang === "es" ? "¡Lección completada! Abriste la siguiente misión." : "Lesson complete! You unlocked the next mission.");
    setReadingBusy(true);
    const completed = activeChild.readingCompletedLessons || [];
    const firstCompletion = !completed.includes(readingLesson);
    const nextLevel = firstCompletion && readingLesson >= (activeChild.readingLevel || 1) ? Math.min(18, readingLesson + 1) : (activeChild.readingLevel || 1);
    const updated = { ...activeChild, readingLevel: nextLevel, readingCompletedLessons: firstCompletion ? [...completed, readingLesson] : completed, stars: activeChild.stars + (firstCompletion ? 2 : 0) };
    try {
      await updateDoc(doc(db, "parents", account.uid, "children", activeChild.id), { readingLevel: nextLevel, readingCompletedLessons: arrayUnion(readingLesson), stars: updated.stars, lastReadingAt: serverTimestamp() });
      setActiveChild(updated);
      setChildren((profiles) => profiles.map((profile) => profile.id === updated.id ? updated : profile));
      setReadingLessonDone(true);
    } finally { setReadingBusy(false); }
  }

  function answerReadingLesson(option: string) {
    if (!readingLesson || readingBusy || readingLessonDone) return;
    const exercise = readingLessons[lang][readingLesson - 1].exercises[readingExercise];
    if (option !== exercise.answer) { gentleReadingFeedback(); return; }
    void completeReadingExercise();
  }

  function chooseReadingSyllable(syllable: string) {
    if (!readingLesson || readingLessonDone) return;
    const exercise = readingLessons[lang][readingLesson - 1].exercises[readingExercise];
    const attempt = [...readingBuild, syllable];
    setReadingBuild(attempt);
    if (attempt.length === 2) {
      if (attempt.join("|") === exercise.answer) void completeReadingExercise();
      else { setReadingBuild([]); gentleReadingFeedback(); }
    }
  }

  function startChildLesson() {
    if (activeChild) startCourseLesson(activeChild.level || 1);
  }

  function startCourseLesson(lessonNumber: number, alternate = false) {
    const safeLesson = Math.min(18, Math.max(1, lessonNumber));
    const lesson = courseLessons[lang][safeLesson - 1];
    const alternatives = lessonAlternatives[lang][safeLesson - 1] || [];
    let nextTarget = lesson.target;
    if (alternate && alternatives.length) {
      const available = alternatives.filter((option) => option !== courseTarget);
      nextTarget = available[Math.floor(Math.random() * available.length)] || alternatives[0];
    }
    setCourseLesson(safeLesson);
    setCourseTarget(nextTarget);
    setCourseTyped(0);
    setCourseMistakes(0);
    setCourseResult(null);
    setPressedFinger(null);
    if (safeLesson === 1) {
      window.setTimeout(() => speakFeedback(lang === "es"
        ? "Acomoda tus dedos. Siente las pequeñas ranuras de las letras F y J. Después, presiona cada tecla iluminada."
        : "Place your fingers. Feel the small guides on the F and J keys. Then press each highlighted key."), 250);
    }
  }

  async function finishCourseLesson(lessonNumber: number, finalMistakes: number) {
    if (!account || !activeChild || courseBusy) return;
    const finalAccuracy = Math.round((courseTarget.length / (courseTarget.length + finalMistakes)) * 100);
    const passed = lessonNumber === 1 || finalAccuracy >= 80;
    const earnedStars = finalAccuracy >= 95 ? 3 : finalAccuracy >= 88 ? 2 : passed ? 1 : 0;
    setCourseResult({ passed, accuracy: finalAccuracy, stars: earnedStars });
    if (!passed) {
      speakFeedback(lang === "es" ? "Respira. ¡Vamos otra vez!" : "Take a breath. Let's try again!", true);
      return;
    }
    playTone("complete");
    speakFeedback(lang === "es" ? "¡Yey! ¡Lección completada!" : "Yay! Lesson complete!", true);

    setCourseBusy(true);
    const completed = activeChild.completedLessons || [];
    const firstCompletion = !completed.includes(lessonNumber);
    const nextLevel = firstCompletion && lessonNumber >= activeChild.level
      ? Math.min(18, lessonNumber + 1)
      : activeChild.level;
    const nextStars = activeChild.stars + (firstCompletion ? earnedStars : 0);
    const nextCompleted = firstCompletion ? [...completed, lessonNumber] : completed;
    const nextChild: ChildProfile = {
      ...activeChild,
      level: nextLevel,
      stars: nextStars,
      completedLessons: nextCompleted,
      bestAccuracy: Math.max(activeChild.bestAccuracy || 0, finalAccuracy),
      courseCompleted: lessonNumber === 18 || activeChild.courseCompleted,
    };

    try {
      await updateDoc(doc(db, "parents", account.uid, "children", activeChild.id), {
        level: nextLevel,
        stars: nextStars,
        completedLessons: arrayUnion(lessonNumber),
        bestAccuracy: nextChild.bestAccuracy,
        courseCompleted: nextChild.courseCompleted || false,
        lastLessonAt: serverTimestamp(),
      });
      setActiveChild(nextChild);
      setChildren((profiles) => profiles.map((profile) => profile.id === nextChild.id ? nextChild : profile));
    } finally {
      setCourseBusy(false);
    }
  }

  function handleCourseKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!courseLesson || courseResult) return;
    const expected = courseTarget[courseTyped] || "";
    const pressed = event.key.length === 1 ? event.key : "";
    if (pressed === expected) {
      const correctFinger = fingerForKey(expected);
      setPressedFinger(correctFinger);
      window.setTimeout(() => setPressedFinger((finger) => finger === correctFinger ? null : finger), 180);
      const nextTyped = courseTyped + 1;
      setCourseTyped(nextTyped);
      celebrateCorrect(nextTyped);
      if (nextTyped === courseTarget.length) void finishCourseLesson(courseLesson, courseMistakes);
    } else if (pressed) {
      setCourseMistakes((value) => value + 1);
      reactToError();
    }
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Lumiya Academy">
          <span className="brand-mark"><i>L</i><b>✦</b></span>
          <span><strong>Lumiya</strong><small>ACADEMY</small></span>
        </a>
        <nav>{t.nav.map((item, i) => <a key={item} href={["#courses", "#how", "#plans", "#families"][i]}>{item}</a>)}</nav>
        <div className="header-actions">
          <button className="language" onClick={() => setLang(lang === "es" ? "en" : "es")} aria-label="Change language">
            <b>{lang.toUpperCase()}</b><span>⌄</span>
          </button>
          {account ? (
            <button className="account-button" onClick={() => setFamilyOpen(true)}>
              <span>{account.displayName?.charAt(0).toUpperCase() || "F"}</span>
              {account.displayName || (lang === "es" ? "Mi familia" : "My family")}
            </button>
          ) : <button className="button primary small access-button" onClick={() => openAccount("login")}>{t.login}</button>}
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span>✦</span>{t.eyebrow}</div>
          <h1>{t.titleA}<br/><em>{t.titleB}</em></h1>
          <p>{t.intro}</p>
          <div className="hero-buttons">
            <a className="button primary" href="#practice">{t.trial} <span>→</span></a>
            <a className="button secondary" href="#plans">{t.plans}</a>
          </div>
          <div className="mini-proof"><span className="avatar-stack"><i>☺</i><i>★</i><i>♥</i></span><span><b>{t.trusted}</b><small>{t.course}</small></span></div>
        </div>

        <div className="hero-visual" aria-label="Lumiya learning preview">
          <div className="orbit orbit-one"/><div className="orbit orbit-two"/>
          <div className="lumi"><span className="ray r1"/><span className="ray r2"/><span className="ray r3"/><span className="ray r4"/><div className="lumi-body"><i>•</i><i>•</i><b>⌣</b></div><div className="lumi-tail"/></div>
          <div className="floating-card card-progress"><span className="round-icon purple">✓</span><div><small>{t.progress}</small><b>3 {lang === "es" ? "lecciones" : "lessons"}</b></div></div>
          <div className="floating-card card-streak"><span>🔥</span><div><b>5 {lang === "es" ? "días" : "days"}</b><small>{t.streak}</small></div></div>
          <div className="floating-key k1">A</div><div className="floating-key k2">S</div><div className="floating-key k3">D</div>
          <div className="keyboard-mini"><div>Q W E R T Y U I O P</div><div>A S D F G H J K L Ñ</div><div>Z X C V B N M</div><span/></div>
        </div>
      </section>

      <section className="course-strip" id="courses">
        <span className="course-icon">⌨</span><div><small>{t.trusted}</small><h2>{t.course}</h2><p>{t.courseDesc}</p></div>
        <div className="course-progress"><span><b>01</b><small>{t.lesson}</small></span><div><i/></div></div>
      </section>

      <section className="education-path" aria-label={lang === "es" ? "Áreas educativas" : "Learning areas"}>
        <div className="education-path-copy"><span className="section-kicker">{lang === "es" ? "ESCUELA DIGITAL LUMIYA" : "LUMIYA DIGITAL SCHOOL"}</span><h2>{lang === "es" ? "Una escuela que crece con cada niño" : "A school that grows with every child"}</h2><p>{lang === "es" ? "Comenzamos con mecanografía y avanzaremos hacia las habilidades fundamentales para aprender con confianza." : "We begin with typing and grow toward the essential skills children need to learn confidently."}</p></div>
        <div className="education-area-grid">
          {[
            ["⌨", lang === "es" ? "Mecanografía" : "Typing", lang === "es" ? "Disponible" : "Available"],
            ["📖", lang === "es" ? "Lectura" : "Reading", lang === "es" ? "Próximamente" : "Coming soon"],
            ["🔢", lang === "es" ? "Matemáticas" : "Mathematics", lang === "es" ? "Próximamente" : "Coming soon"],
            ["🌎", lang === "es" ? "Inglés" : "English", lang === "es" ? "Próximamente" : "Coming soon"],
          ].map((area, index) => <article className={index === 0 ? "available" : ""} key={area[1]}><span>{area[0]}</span><div><b>{area[1]}</b><small>{area[2]}</small></div></article>)}
        </div>
      </section>

      <section className={`practice-section ${worlds[world]}`} id="practice">
        <div className="section-heading"><span className="section-kicker">LUMITYPE</span><h2>{t.practice}</h2><p>{t.practiceHint}</p></div>
        <div className="practice-shell">
          <div className="practice-top">
            <span className="lesson-pill">{t.lesson}</span>
            <div className="practice-actions"><button onClick={resetPractice}>↻ {t.reset}</button></div>
          </div>
          <div className={`typing-prompt ${bigText ? "large" : ""}`}>{typed >= target.length ? <b className="complete">{t.done}</b> : renderedTarget}</div>
          <input autoComplete="off" autoCapitalize="off" aria-label={t.practiceHint} className="typing-capture" value="" onKeyDown={handleKey} onChange={() => {}} placeholder={lang === "es" ? "Haz clic aquí y comienza a escribir…" : "Click here and start typing…"}/>
          <div className="keyboard">
            {rows.map((row, rowIndex) => <div className="key-row" key={rowIndex}>{row.map((key) => <span key={key} className={current.toUpperCase() === key ? "active-key" : ""}>{key}</span>)}</div>)}
            <div className="space-key"><span className={current === " " ? "active-key" : ""}>SPACE</span></div>
          </div>
          {hands && <div className="hands"><span className="left-hand">☝</span><span className="right-hand">☝</span></div>}
          <div className="practice-stats"><span><b>{accuracy}%</b><small>{t.accuracy}</small></span><span><b>{typed}/{target.length}</b><small>{lang === "es" ? "Progreso" : "Progress"}</small></span><span><b>{Math.max(1, Math.round(typed / 2))}</b><small>{t.stars}</small></span></div>
        </div>
      </section>

      <section className="benefits" id="how">
        <div className="section-heading"><span className="section-kicker">{lang === "es" ? "APRENDER CON LUMIYA" : "LEARN WITH LUMIYA"}</span><h2>{t.why}</h2><p>{t.whySub}</p></div>
        <div className="benefit-grid">{t.benefits.map((benefit, index) => <article key={benefit[0]}><span className={`benefit-icon icon-${index}`}>{["✦", "↗", "♡"][index]}</span><h3>{benefit[0]}</h3><p>{benefit[1]}</p></article>)}</div>
      </section>

      <section className="plans" id="plans">
        <div className="section-heading"><span className="section-kicker">{lang === "es" ? "PLANES MENSUALES" : "MONTHLY PLANS"}</span><h2>{t.familyTitle}</h2><p>{t.familySub}</p></div>
        <div className="plan-grid">{[35, 59, 79].map((price, index) => <article key={price} className={index === 1 ? "featured" : ""}>{index === 1 && <span className="popular">{t.popular}</span>}<h3>{t.planNames[index]}</h3><p>{t.planKids[index]}</p><div className="price"><b>{price} Bs</b><span>{t.month}</span></div><ul><li>✓ {lang === "es" ? "Acceso a todos los cursos activos" : "Access to all active courses"}</li><li>✓ {lang === "es" ? "Progreso y certificados" : "Progress and certificates"}</li><li>✓ {lang === "es" ? "Panel para padres" : "Parent dashboard"}</li></ul><button onClick={() => account ? setFamilyOpen(true) : openAccount("login")} className={`button ${index === 1 ? "primary" : "secondary"}`}>{t.choose}</button></article>)}</div>
      </section>

      <section className="family-banner" id="families"><div><span>✦</span><h2>{lang === "es" ? "Cada niño tiene su propia forma de brillar." : "Every child has their own way to shine."}</h2><p>{lang === "es" ? "Lumiya se adapta a su ritmo, sus intereses y sus necesidades." : "Lumiya adapts to their pace, interests and needs."}</p></div><button className="button light" onClick={() => account ? setFamilyOpen(true) : openAccount("login")}>{t.login} →</button></section>

      <footer><a className="brand footer-brand" href="#top"><span className="brand-mark"><i>L</i><b>✦</b></span><span><strong>Lumiya</strong><small>ACADEMY</small></span></a><p>© 2026 Lumiya Academy · {t.footer}</p><div><a href="#">Privacidad</a><a href="#">Ayuda</a></div></footer>

      {settingsOpen && activeChild && <div className="modal-backdrop" onMouseDown={() => setSettingsOpen(false)}><aside className="settings-panel" onMouseDown={(e) => e.stopPropagation()}><div className="settings-head"><div><span className="section-kicker">{activeChild.name.toUpperCase()}</span><h2>{lang === "es" ? "Configurar su teclado" : "Keyboard settings"}</h2><p>{lang === "es" ? "Estas preferencias se guardarán únicamente para este estudiante." : "These preferences are saved only for this student."}</p></div><button onClick={() => setSettingsOpen(false)}>×</button></div><div className={`keyboard-settings-preview preview-${world} ${bigText ? "large" : ""}`}><span>{hands ? "☝  A S D F   J K L Ñ  ☝" : "A S D F   J K L Ñ"}</span><small>{sound ? "🔊" : "🔇"} {lang === "es" ? "Vista previa" : "Preview"}</small></div><label>{t.theme}</label><div className="choice-row">{t.themes.map((theme, index) => <button className={world === index ? "selected" : ""} key={theme} onClick={() => setWorld(index)}><i className={`theme-dot dot-${index}`}/>{theme}</button>)}</div><div className="toggle-row"><span>{t.hands}</span><button className={hands ? "toggle on" : "toggle"} onClick={() => setHands(!hands)}><i/></button></div><div className="toggle-row"><span>{lang === "es" ? "Sonidos de acierto y error" : "Success and error sounds"}</span><button className={sound ? "toggle on" : "toggle"} onClick={() => setSound(!sound)}><i/></button></div><div className="toggle-row"><span>{t.big}</span><button className={bigText ? "toggle on" : "toggle"} onClick={() => setBigText(!bigText)}><i/></button></div><button disabled={settingsBusy} className="button primary panel-save" onClick={saveStudentSettings}>{settingsBusy ? (lang === "es" ? "Guardando…" : "Saving…") : (lang === "es" ? "Guardar configuración" : "Save settings")}</button>{settingsMessage && <p className={`settings-message ${settingsMessage.includes("No ") || settingsMessage.includes("Could ") ? "error" : ""}`}>{settingsMessage}</p>}</aside></div>}

      {authOpen && <div className="modal-backdrop centered" onMouseDown={() => setAuthOpen(false)}>
        <section className="auth-card" onMouseDown={(event) => event.stopPropagation()}>
          <button className="modal-close" onClick={() => setAuthOpen(false)}>×</button>
          <span className="brand-mark auth-logo"><i>L</i><b>✦</b></span>
          <span className="section-kicker">LUMIYA ACADEMY</span>
          <h2>{authMode === "login" ? (lang === "es" ? "Bienvenido de nuevo" : "Welcome back") : (lang === "es" ? "Crea tu cuenta familiar" : "Create your family account")}</h2>
          <p>{authMode === "login" ? (lang === "es" ? "Ingresa para continuar el aprendizaje." : "Log in to continue learning.") : (lang === "es" ? "El adulto crea la cuenta y luego agrega los perfiles infantiles." : "An adult creates the account and then adds child profiles.")}</p>
          <form onSubmit={submitAccount}>
            {authMode === "register" && <label>{lang === "es" ? "Nombre del padre, madre o tutor" : "Parent or guardian name"}<input value={parentName} onChange={(event) => setParentName(event.target.value)} required /></label>}
            <label>{lang === "es" ? "Correo electrónico" : "Email"}<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label>{lang === "es" ? "Contraseña" : "Password"}<input type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            {authError && <div className="form-error">{authError}</div>}
            <button disabled={authBusy} className="button primary auth-submit">{authBusy ? (lang === "es" ? "Procesando…" : "Working…") : authMode === "login" ? t.login : t.start}</button>
          </form>
          <button className="mode-switch" onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(""); }}>
            {authMode === "login" ? (lang === "es" ? "¿Aún no tienes cuenta? Crear cuenta" : "No account yet? Create one") : (lang === "es" ? "Ya tengo una cuenta" : "I already have an account")}
          </button>
        </section>
      </div>}

      {activeChild && <div className="student-backdrop" onMouseDown={() => setActiveChild(null)}>
        <section className="student-dashboard" onMouseDown={(event) => event.stopPropagation()}>
          <header className="student-topbar">
            <button className="student-family-back" onClick={() => { setActiveChild(null); setFamilyOpen(true); }}>← {lang === "es" ? "Mi familia" : "My family"}</button>
            <a className="brand" href="#top" onClick={() => setActiveChild(null)}><span className="brand-mark"><i>L</i><b>✦</b></span><span><strong>Lumiya</strong><small>ACADEMY</small></span></a>
            <div className="student-top-actions"><button className="student-settings" onClick={() => { setSettingsMessage(""); setSettingsOpen(true); }}>⚙ {lang === "es" ? "Mi teclado" : "My keyboard"}</button><button className="student-close" onClick={() => setActiveChild(null)} aria-label={lang === "es" ? "Cerrar" : "Close"}>×</button></div>
          </header>

          <div className="student-welcome">
            <div className="student-avatar">{activeChild.avatar}<span>✦</span></div>
            <div><span className="student-kicker">{lang === "es" ? "TU AVENTURA DE HOY" : "TODAY'S ADVENTURE"}</span><h2>{lang === "es" ? `¡Hola, ${activeChild.name}!` : `Hi, ${activeChild.name}!`}</h2><p>{lang === "es" ? "Lumi está listo para aprender contigo. Continúa donde lo dejaste." : "Lumi is ready to learn with you. Continue where you left off."}</p></div>
            <button className="button primary student-continue" onClick={startChildLesson}>{lang === "es" ? "Continuar lección" : "Continue lesson"} <span>→</span></button>
          </div>

          <div className="student-stat-grid">
            <article><span className="stat-icon purple-stat">★</span><div><b>{activeChild.stars || 0}</b><small>{lang === "es" ? "Estrellas ganadas" : "Stars earned"}</small></div></article>
            <article><span className="stat-icon orange-stat">🔥</span><div><b>{activeChild.streak || 0}</b><small>{lang === "es" ? "Días de racha" : "Streak days"}</small></div></article>
            <article><span className="stat-icon mint-stat">↗</span><div><b>{Math.max(1, activeChild.level)}</b><small>{lang === "es" ? "Nivel actual" : "Current level"}</small></div></article>
          </div>

          <section className="student-subjects">
            <div><span className="section-kicker">{activeChild.gradeBand === "secondary" ? (lang === "es" ? "SECUNDARIA" : "SECONDARY") : (lang === "es" ? "PRIMARIA" : "PRIMARY")}</span><h3>{lang === "es" ? "Mis materias" : "My subjects"}</h3></div>
            <div className="subject-tabs">
              <button className="active"><span>⌨</span><b>{lang === "es" ? "Mecanografía" : "Typing"}</b><small>{lang === "es" ? "En curso" : "In progress"}</small></button>
              <button className="reading-subject" onClick={openReadingCourse}><span>📖</span><b>{lang === "es" ? "Lectura" : "Reading"}</b><small>{activeChild.readingAssessmentScore === undefined ? (lang === "es" ? "Evaluación inicial" : "Initial assessment") : (lang === "es" ? `${activeChild.readingCompletedLessons?.length || 0} de 18` : `${activeChild.readingCompletedLessons?.length || 0} of 18`)}</small></button>
              <button disabled><span>🔢</span><b>{lang === "es" ? "Matemáticas" : "Mathematics"}</b><small>{lang === "es" ? "Próximamente" : "Coming soon"}</small></button>
              <button disabled><span>🌎</span><b>{lang === "es" ? "Inglés" : "English"}</b><small>{lang === "es" ? "Próximamente" : "Coming soon"}</small></button>
            </div>
          </section>

          <div className="student-content-grid">
            <section className="learning-map-card">
              <div className="map-heading"><div><span className="section-kicker">LUMITYPE</span><h3>{lang === "es" ? "Mapa de aprendizaje" : "Learning map"}</h3><p>{lang === "es" ? "Completa cada misión para abrir la siguiente." : "Complete each mission to unlock the next one."}</p></div><span className="map-stage">{lang === "es" ? "ETAPA 1" : "STAGE 1"}</span></div>
              <div className="learning-path">
                {courseLessons[lang].map((lesson, index) => {
                  const lessonNumber = index + 1;
                  const state = activeChild.completedLessons?.includes(lessonNumber) ? "completed" : lessonNumber === activeChild.level ? "current" : "locked";
                  return <article className={`lesson-node ${state}`} key={lesson.title}>
                    <span className="lesson-orb">{state === "completed" ? "✓" : state === "locked" ? "🔒" : lessonNumber}</span>
                    <div><small>{lang === "es" ? `LECCIÓN ${lessonNumber}` : `LESSON ${lessonNumber}`}</small><b>{lesson.title}</b><p>{lesson.skill}</p></div>
                    {state !== "locked" && <button onClick={() => startCourseLesson(lessonNumber)}>{state === "completed" ? (lang === "es" ? "Repetir" : "Repeat") : (lang === "es" ? "Empezar" : "Start")}</button>}
                  </article>;
                })}
              </div>
            </section>

            <aside className="student-side">
              <section className="daily-mission"><span className="mission-lumi">✦</span><small>{lang === "es" ? "MISIÓN DIARIA" : "DAILY MISSION"}</small><h3>{lang === "es" ? "Completa una lección" : "Complete one lesson"}</h3><p>{lang === "es" ? "Practica con calma y consigue al menos 80% de precisión." : "Practice calmly and earn at least 80% accuracy."}</p><div><i style={{ width: `${Math.min(100, (activeChild.completedLessons?.length || 0) * 20)}%` }}/></div><span>{activeChild.completedLessons?.length || 0} / 18</span></section>
              <section className="next-reward"><div><span>🎁</span><small>{lang === "es" ? "PRÓXIMA RECOMPENSA" : "NEXT REWARD"}</small></div><h3>{lang === "es" ? "Cofre violeta" : "Purple chest"}</h3><p>{lang === "es" ? "Completa 3 lecciones para abrirlo." : "Complete 3 lessons to unlock it."}</p><div className="reward-stars">★ ★ <i>★</i></div></section>
            </aside>
          </div>
        </section>
      </div>}

      {readingOpen && activeChild && <div className="reading-backdrop" onMouseDown={() => setReadingOpen(false)}>
        <section className="reading-player" onMouseDown={(event) => event.stopPropagation()}>
          <header className="reading-header"><button onClick={() => readingLesson ? setReadingLesson(null) : setReadingOpen(false)}>← {readingLesson ? (lang === "es" ? "Mapa" : "Map") : (lang === "es" ? "Mis materias" : "My subjects")}</button><div><span>LUMIREAD</span><b>{readingStage < 7 ? (lang === "es" ? "Misión inicial" : "First mission") : (lang === "es" ? "Aventura de lectura" : "Reading adventure")}</b></div><div className="reading-clock"><span>⏱</span><b>{String(Math.floor(readingSeconds / 60)).padStart(2,"0")}:{String(readingSeconds % 60).padStart(2,"0")}</b><small>/ 05:00</small></div></header>

          {readingStage < 7 && <div className="reading-mission">
            <div className="reading-world"><div className="reading-character character-lumi"><span>✦</span><i>•‿•</i><b>Lumi</b></div><div className="mission-path">★ · · · · · ★</div><div className="reading-character character-milo"><span>📚</span><i>◕‿◕</i><b>Milo</b></div></div>
            {(readingStage === 0 || readingStage === 1) && <div className="reading-dialogue"><span>{readingStage === 0 ? "Lumi" : "Milo"}</span><h2>{readingStage === 0 ? (lang === "es" ? `¡Qué bien que estás aquí, ${activeChild.name}!` : `We're glad you're here, ${activeChild.name}!`) : (lang === "es" ? "Aprenderemos un poco todos los días" : "We will learn a little every day")}</h2><p>{readingStage === 0 ? (lang === "es" ? "Necesitamos tu ayuda para una misión muy importante." : "We need your help with a very important mission.") : (lang === "es" ? "Nosotros te enseñaremos. Cada sesión durará cinco minutos y el reloj te mostrará cuánto llevas." : "We will guide you. Each session takes five minutes and the clock shows your time.")}</p><button className="reading-next" onClick={advanceReadingIntro} aria-label={lang === "es" ? "Continuar" : "Continue"}>→</button></div>}

            {readingStage === 2 && <div className="reading-challenge"><small>{lang === "es" ? "OBSERVA CON ATENCIÓN" : "LOOK CAREFULLY"}</small><h2>{lang === "es" ? "¿Cuántas estrellas ves?" : "How many stars do you see?"}</h2><div className="counting-objects">⭐ ⭐ ⭐ ⭐ ⭐</div><div className="reading-options">{[4,5,6].map((number) => <button key={number} onClick={() => answerAssessment(number === 5)}>{number}</button>)}</div></div>}

            {readingStage === 3 && <div className="reading-challenge"><small>{lang === "es" ? "ARMA LA IMAGEN" : "BUILD THE PICTURE"}</small><h2>{lang === "es" ? "Presiona las piezas del 1 al 4" : "Press the pieces from 1 to 4"}</h2><div className="picture-puzzle">{[3,1,4,2].map((piece) => <button className={readingSequence.includes(piece) ? "placed" : ""} key={piece} onClick={() => chooseSequencePiece(piece,4)}><span>{piece}</span>{["☀️","🏠","🌳","☁️"][piece-1]}</button>)}</div></div>}

            {readingStage === 4 && <div className="reading-challenge"><small>{lang === "es" ? "UNE LOS NÚMEROS" : "CONNECT THE NUMBERS"}</small><h2>{lang === "es" ? "Forma una casita del 1 al 5" : "Build a little house from 1 to 5"}</h2><div className="house-dots"><span className={readingSequence.includes(1) ? "joined" : ""} onClick={() => chooseSequencePiece(1,5)}>1</span><span className={readingSequence.includes(2) ? "joined" : ""} onClick={() => chooseSequencePiece(2,5)}>2</span><span className={readingSequence.includes(3) ? "joined" : ""} onClick={() => chooseSequencePiece(3,5)}>3</span><span className={readingSequence.includes(4) ? "joined" : ""} onClick={() => chooseSequencePiece(4,5)}>4</span><span className={readingSequence.includes(5) ? "joined" : ""} onClick={() => chooseSequencePiece(5,5)}>5</span></div></div>}

            {readingStage === 5 && <div className="reading-challenge"><small>{lang === "es" ? "ESCUCHA" : "LISTEN"}</small><h2>{lang === "es" ? "¿Estos sonidos son iguales?" : "Are these sounds the same?"}</h2><button className="listen-button" onClick={() => readingVoice(lang === "es" ? "ma, ma" : "ma, ma")}>🔊 {lang === "es" ? "Oír otra vez" : "Hear again"}</button><div className="reading-options wide"><button onClick={() => answerAssessment(true)}>{lang === "es" ? "Iguales" : "Same"}</button><button onClick={() => answerAssessment(false)}>{lang === "es" ? "Diferentes" : "Different"}</button></div></div>}

            {readingStage === 6 && <div className="reading-challenge"><small>{lang === "es" ? "LETRA Y SONIDO" : "LETTER AND SOUND"}</small><h2>{lang === "es" ? "¿Qué letra hace el sonido mmm?" : "Which letter makes the sound mmm?"}</h2><button className="listen-button" onClick={() => readingVoice("mmm")}>🔊 mmm</button><div className="reading-options">{["M","S","P"].map((letter) => <button key={letter} onClick={() => answerAssessment(letter === "M")}>{letter}</button>)}</div></div>}
            {readingFeedback && <div className="reading-feedback">{readingFeedback}</div>}
            <div className="mission-progress"><i style={{width:`${Math.min(100,((readingStage + 1)/7)*100)}%`}}/></div>
          </div>}

          {readingStage === 7 && !readingLesson && <div className="reading-map"><div className="reading-map-title"><div><span className="section-kicker">LUMIREAD · 5 MINUTOS AL DÍA</span><h2>{lang === "es" ? `Tu aventura de lectura, ${activeChild.name}` : `Your reading adventure, ${activeChild.name}`}</h2><p>{lang === "es" ? "Escucha, juega y aprende. Cada misión abre la siguiente." : "Listen, play and learn. Each mission unlocks the next."}</p></div><div className="assessment-badge"><span>🏅</span><b>{activeChild.readingAssessmentScore ?? readingScore}/5</b><small>{lang === "es" ? "Misión inicial" : "First mission"}</small></div></div><div className="reading-lesson-grid">{readingLessons[lang].map((lesson,index) => { const number=index+1; const completed=activeChild.readingCompletedLessons?.includes(number); const available=completed || number === (activeChild.readingLevel || 1); return <article className={`${completed ? "completed" : ""} ${available ? "available" : "locked"}`} key={lesson.title}><span>{completed ? "✓" : available ? number : "🔒"}</span><div><small>{lang === "es" ? `LECCIÓN ${number}` : `LESSON ${number}`}</small><b>{lesson.title}</b><p>{lesson.skill}</p></div>{available && <button onClick={() => startReadingLesson(number)}>{completed ? (lang === "es" ? "Repetir" : "Repeat") : (lang === "es" ? "Empezar" : "Start")}</button>}</article>; })}</div></div>}

          {readingStage === 7 && readingLesson && (() => { const lesson=readingLessons[lang][readingLesson-1]; const exercise=lesson.exercises[readingExercise]; return <div className="reading-lesson-player"><div className="reading-exercise-head"><button onClick={() => setReadingLesson(null)}>← {lang === "es" ? "Mapa" : "Map"}</button><span>{lang === "es" ? `Ejercicio ${readingExercise+1} de 5` : `Activity ${readingExercise+1} of 5`}</span></div><div className="reading-exercise-progress"><i style={{width:`${((readingExercise+(readingLessonDone?1:0))/5)*100}%`}}/></div><div className="lesson-book">{exercise.icon || (exercise.kind === "picture" ? readingPicture(exercise.answer || "") : "📖")}</div><span className="section-kicker">{lesson.skill.toUpperCase()}</span><h2>{lesson.title}</h2>{exercise.story && <div className="reading-story">{exercise.story}</div>}<div className={exercise.display.length > 45 ? "reading-display sentence" : "reading-display"}>{exercise.display}</div><p>{exercise.prompt}</p><button className="listen-button" onClick={() => readingVoice(exercise.sound)}>🔊 {lang === "es" ? "Escuchar" : "Listen"}</button>{exercise.kind === "listen" && !readingLessonDone && <button className="repeat-confirm" onClick={() => void completeReadingExercise()}>✓ {lang === "es" ? "Ya lo escuché y repetí" : "I listened and repeated"}</button>}{(exercise.kind === "choice" || exercise.kind === "picture") && !readingLessonDone && <div className={exercise.kind === "picture" ? "lesson-answer-grid picture-answers" : "lesson-answer-grid"}>{exercise.options?.map((option) => <button disabled={readingBusy} key={option} onClick={() => answerReadingLesson(option)}>{exercise.kind === "picture" && <span>{readingPicture(option)}</span>}<b>{option}</b></button>)}</div>}{exercise.kind === "build" && !readingLessonDone && <><div className="assembled-word">{readingBuild.length ? readingBuild.join(" + ") : (lang === "es" ? "Toca las sílabas en orden" : "Tap the syllables in order")}</div><div className="syllable-options">{exercise.options?.map((option,index) => <button key={`${option}-${index}`} onClick={() => chooseReadingSyllable(option)}>{option}</button>)}</div><button className="clear-build" onClick={() => setReadingBuild([])}>{lang === "es" ? "Borrar intento" : "Clear attempt"}</button></>}{readingFeedback && <div className="reading-feedback">{readingFeedback}</div>}{readingLessonDone && <button className="button primary next-reading-lesson" onClick={() => readingLesson < 18 ? startReadingLesson(readingLesson+1) : setReadingLesson(null)}>{readingLesson < 18 ? (lang === "es" ? "Siguiente lección →" : "Next lesson →") : (lang === "es" ? "Finalizar curso" : "Finish course")}</button>}</div>; })()}
        </section>
      </div>}

      {courseLesson && activeChild && (() => {
        const lesson = courseLessons[lang][courseLesson - 1];
        const courseCurrent = courseTarget[courseTyped] || "";
        const activeFinger = fingerForKey(courseCurrent);
        const liveAccuracy = courseTyped + courseMistakes === 0 ? 100 : Math.round((courseTyped / (courseTyped + courseMistakes)) * 100);
        return <div className="course-backdrop" onMouseDown={() => setCourseLesson(null)}>
          <section className={`course-player student-theme-${world} ${bigText ? "student-big-text" : ""}`} onMouseDown={(event) => event.stopPropagation()}>
            <header className="course-player-head">
              <button onClick={() => setCourseLesson(null)}>← {lang === "es" ? "Mapa" : "Map"}</button>
              <div><span>LUMITYPE</span><b>{lang === "es" ? `Lección ${courseLesson} de 18` : `Lesson ${courseLesson} of 18`}</b></div>
              <div className="course-player-actions"><button className={`course-sound ${sound ? "on" : ""}`} onClick={() => { if (sound && typeof window !== "undefined") window.speechSynthesis?.cancel(); setSound(!sound); }} aria-label={sound ? (lang === "es" ? "Silenciar sonidos" : "Mute sounds") : (lang === "es" ? "Activar sonidos" : "Enable sounds")}>{sound ? "🔊" : "🔇"}</button><button className="student-close" onClick={() => setCourseLesson(null)}>×</button></div>
            </header>
            <div className="course-progress-line"><i style={{ width: `${(courseTyped / Math.max(1, courseTarget.length)) * 100}%` }}/></div>

            <div className="course-player-body">
              <div className="course-title"><span>{activeChild.avatar}</span><div><small>{lesson.skill}</small><h2>{lesson.title}</h2><p>{courseLesson === 1 ? (lang === "es" ? "Busca las pequeñas ranuras de F y J, acomoda allí tus índices y presiona todas las teclas iluminadas." : "Find the small guides on F and J, place your index fingers there and press every highlighted key.") : (lang === "es" ? "Escribe el ejercicio con calma. Necesitas 80% de precisión para avanzar." : "Type calmly. You need 80% accuracy to move forward.")}</p></div></div>

              {!courseResult ? <>
                <div className="course-target" aria-live="polite">
                  {courseTarget.split("").map((letter, index) => <span key={index} className={index < courseTyped ? "done" : index === courseTyped ? "now" : ""}>{letter === " " ? "·" : letter}</span>)}
                </div>
                <input autoFocus className="course-capture" value="" onChange={() => {}} onKeyDown={handleCourseKey} autoComplete="off" autoCapitalize="off" aria-label={lang === "es" ? "Escribe el ejercicio" : "Type the exercise"} placeholder={lang === "es" ? "Haz clic aquí y comienza…" : "Click here and start…"}/>
                <div className="finger-instruction"><span>☝</span><div><small>{lang === "es" ? "DEDO CORRECTO" : "CORRECT FINGER"}</small><b>{fingerNames[activeFinger][lang]}</b></div></div>
                <div className="course-keyboard-wrap">
                  {hands && <div className="hand-guide" aria-hidden="true">
                    <div className="guide-hand left-guide-hand">
                      <div className="guide-palm"/>
                      {(["l-pinky", "l-ring", "l-middle", "l-index"] as FingerId[]).map((finger) => <span key={finger} className={`guide-finger ${finger} ${activeFinger === finger ? "finger-active" : ""} ${pressedFinger === finger ? "finger-pressed" : ""}`}><i/></span>)}
                      <span className={`guide-thumb left-thumb ${activeFinger === "thumb" ? "finger-active" : ""} ${pressedFinger === "thumb" ? "finger-pressed" : ""}`}><i/></span>
                    </div>
                    <div className="guide-hand right-guide-hand">
                      <div className="guide-palm"/>
                      {(["r-index", "r-middle", "r-ring", "r-pinky"] as FingerId[]).map((finger) => <span key={finger} className={`guide-finger ${finger} ${activeFinger === finger ? "finger-active" : ""} ${pressedFinger === finger ? "finger-pressed" : ""}`}><i/></span>)}
                      <span className={`guide-thumb right-thumb ${activeFinger === "thumb" ? "finger-active" : ""} ${pressedFinger === "thumb" ? "finger-pressed" : ""}`}><i/></span>
                    </div>
                  </div>}
                  <div className="course-keyboard">
                    {rows.map((row, rowIndex) => <div key={rowIndex}>{row.map((rawKey) => {
                      const key = lang === "en" && rawKey === "Ñ" ? ";" : rawKey;
                      return <span className={courseCurrent.toUpperCase() === key ? "active" : ""} key={key}>{key}</span>;
                    })}</div>)}
                    <div><span className={`course-space ${courseCurrent === " " ? "active" : ""}`}>SPACE</span></div>
                  </div>
                </div>
                <div className="course-live-stats"><span><b>{courseLesson === 1 ? `${courseTyped}/${courseTarget.length}` : `${liveAccuracy}%`}</b><small>{courseLesson === 1 ? (lang === "es" ? "Teclas ubicadas" : "Keys found") : t.accuracy}</small></span><span><b>{courseMistakes}</b><small>{lang === "es" ? "Intentos" : "Attempts"}</small></span><span><b>{courseTyped}/{courseTarget.length}</b><small>{lang === "es" ? "Progreso" : "Progress"}</small></span></div>
              </> : <div className={`course-result ${courseResult.passed ? "passed" : "retry"}`}>
                <div className="result-lumi">{courseResult.passed ? "🌟" : "💪"}</div>
                <span>{courseResult.passed ? (lang === "es" ? "¡LECCIÓN COMPLETADA!" : "LESSON COMPLETE!") : (lang === "es" ? "¡CASI LO LOGRAS!" : "ALMOST THERE!")}</span>
                <h2>{courseResult.passed ? (lang === "es" ? `¡Excelente, ${activeChild.name}!` : `Great job, ${activeChild.name}!`) : (lang === "es" ? "Vamos a intentarlo otra vez" : "Let's try one more time")}</h2>
                <p>{courseResult.passed ? (lang === "es" ? "Tu avance quedó guardado y abriste una nueva lección." : "Your progress is saved and a new lesson is unlocked.") : (lang === "es" ? "Practica más despacio para alcanzar 80% de precisión." : "Slow down to reach 80% accuracy.")}</p>
                <div className="result-score"><span><b>{courseResult.accuracy}%</b><small>{t.accuracy}</small></span><span><b>{courseResult.stars ? "★".repeat(courseResult.stars) : "—"}</b><small>{t.stars}</small></span></div>
                <button disabled={courseBusy} className="button primary" onClick={() => courseResult.passed && courseLesson < 18 ? startCourseLesson(courseLesson + 1) : startCourseLesson(courseLesson, !courseResult.passed)}>{courseBusy ? (lang === "es" ? "Guardando…" : "Saving…") : courseResult.passed && courseLesson < 18 ? (lang === "es" ? "Siguiente lección" : "Next lesson") : courseResult.passed ? (lang === "es" ? "Repetir reto" : "Repeat challenge") : (lang === "es" ? "Practicar con otro ejercicio" : "Practice with another exercise")}</button>
                <small className="enter-hint">↵ {lang === "es" ? "También puedes presionar Enter" : "You can also press Enter"}</small>
              </div>}
            </div>
          </section>
        </div>;
      })()}

      {familyOpen && account && <div className="modal-backdrop family-backdrop" onMouseDown={() => setFamilyOpen(false)}>
        <aside className="family-panel" onMouseDown={(event) => event.stopPropagation()}>
          <div className="settings-head family-heading"><div><span className="section-kicker">{lang === "es" ? "MI CUENTA LUMIYA" : "MY LUMIYA ACCOUNT"}</span><h2>{lang === "es" ? `Hola, ${account.displayName || "familia"}` : `Hello, ${account.displayName || "family"}`}</h2><p>{account.email} · {lang === "es" ? "Cuenta familiar" : "Family account"}</p></div><button onClick={() => setFamilyOpen(false)}>×</button></div>
          <div className="family-summary"><span><b>{children.length}</b><small>{lang === "es" ? "Estudiantes" : "Students"}</small></span><span><b>{children.reduce((total, child) => total + (child.completedLessons?.length || 0), 0)}</b><small>{lang === "es" ? "Lecciones completadas" : "Completed lessons"}</small></span><span><b>{children.reduce((total, child) => total + child.stars, 0)}</b><small>{t.stars}</small></span></div>
          {children.length > 0 && <>
            <div className="family-section-title"><div><h3>{lang === "es" ? "Estudiantes inscritos" : "Enrolled students"}</h3><p>{lang === "es" ? "Elige un estudiante para ver sus materias, configurar su teclado y continuar aprendiendo." : "Choose a student to see subjects, configure their keyboard and continue learning."}</p></div></div>
            <div className="children-grid">
              {children.map((child) => { const completed = child.completedLessons?.length || 0; const progress = Math.round((completed / 18) * 100); return <button className="child-card progress-child-card" onClick={() => enterChildSpace(child)} key={child.id}><span>{child.avatar}</span><div className="child-card-main"><div><b>{child.name}</b><em>{child.gradeBand === "secondary" ? (lang === "es" ? "Secundaria" : "Secondary") : (lang === "es" ? "Primaria" : "Primary")}</em></div><small>{child.age} {lang === "es" ? "años" : "years"} · {lang === "es" ? `Lección ${Math.max(1, child.level)} de 18` : `Lesson ${Math.max(1, child.level)} of 18`}</small><div className="child-progress"><i style={{ width: `${progress}%` }}/></div><small className="child-progress-label"><b>{progress}%</b> {lang === "es" ? "de Mecanografía" : "of Typing"}</small><div className="child-subject-pills"><span>⌨ {lang === "es" ? "Mecanografía" : "Typing"}</span><span className="future-subject">+ {lang === "es" ? "Materias" : "Subjects"}</span></div></div><i>→</i></button>; })}
            </div>
          </>}
          <form className="child-form" onSubmit={addChildProfile}>
            <h3>{children.length === 0 ? (lang === "es" ? "Crea el primer perfil infantil" : "Create the first child profile") : (lang === "es" ? "Agregar perfil infantil" : "Add child profile")}</h3>
            <div className="child-form-row"><label>{lang === "es" ? "Nombre" : "Name"}<input value={childName} onChange={(event) => setChildName(event.target.value)} required /></label><label>{lang === "es" ? "Edad" : "Age"}<input type="number" min="4" max="18" value={childAge} onChange={(event) => setChildAge(event.target.value)} required /></label></div>
            <label className="grade-label">{lang === "es" ? "Etapa educativa" : "Education stage"}</label><div className="grade-choice"><button type="button" className={childGradeBand === "primary" ? "selected" : ""} onClick={() => setChildGradeBand("primary")}><span>🎒</span><b>{lang === "es" ? "Primaria" : "Primary"}</b><small>{lang === "es" ? "Aprendizaje fundamental" : "Foundational learning"}</small></button><button type="button" className={childGradeBand === "secondary" ? "selected" : ""} onClick={() => setChildGradeBand("secondary")}><span>🎓</span><b>{lang === "es" ? "Secundaria" : "Secondary"}</b><small>{lang === "es" ? "Retos y habilidades avanzadas" : "Advanced skills"}</small></button></div>
            <div className="avatar-choice">{["🌟", "🚀", "🦊", "🐼", "🌈"].map((avatar) => <button type="button" className={childAvatar === avatar ? "selected" : ""} onClick={() => setChildAvatar(avatar)} key={avatar}>{avatar}</button>)}</div>
            <button disabled={profileBusy} className="button primary">{profileBusy ? (lang === "es" ? "Guardando…" : "Saving…") : (lang === "es" ? "Agregar estudiante" : "Add student")}</button>
          </form>
          <button className="signout-button" onClick={() => signOut(auth)}>{lang === "es" ? "Cerrar sesión" : "Sign out"}</button>
        </aside>
      </div>}
    </main>
  );
}
