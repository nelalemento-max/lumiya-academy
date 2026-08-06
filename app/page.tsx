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
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
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
  mathLevel?: number;
  mathCompletedLessons?: number[];
  mathAssessmentScore?: number;
  englishLevel?: number;
  englishCompletedLessons?: number[];
  englishAssessmentScore?: number;
  historyCompletedLessons?: string[];
};

type HistoryQuestion = {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
};
type HistoryLesson = {
  id: string;
  order: number;
  titleEs: string;
  titleEn: string;
  country: string;
  level: "primary" | "secondary" | "both";
  youtubeUrl: string;
  descriptionEs: string;
  descriptionEn: string;
  published: boolean;
  questions: HistoryQuestion[];
  creatorEmail?: string;
  creatorName?: string;
  price: number;
};
type CoursePurchase = {
  id: string;
  courseId: string;
  courseTitle: string;
  teacherEmail: string;
  teacherName: string;
  buyerId: string;
  buyerEmail: string;
  childId: string;
  childName: string;
  paymentMethod: "cash" | "qr";
  status: "pending" | "confirmed" | "rejected" | "refunded";
  price: number;
  platformAmount: number;
  teacherAmount: number;
  createdAt?: unknown;
};
type CourseCreator = {
  email: string;
  name: string;
  role: "teacher";
  active: boolean;
  createdAt?: unknown;
};

const ADMIN_EMAILS = ["nelalemento@gmail.com"];
const sampleHistoryLesson: HistoryLesson = {
  id: "bolivia-independencia",
  order: 1,
  titleEs: "La independencia de Bolivia",
  titleEn: "The independence of Bolivia",
  country: "Bolivia",
  level: "both",
  youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  descriptionEs:
    "Descubre los hechos y personajes que acompañaron el nacimiento de Bolivia.",
  descriptionEn: "Discover the events and people behind the birth of Bolivia.",
  published: true,
  creatorName: "Lumi Academy",
  price: 0,
  questions: [
    {
      question: "¿En qué año se declaró la independencia de Bolivia?",
      options: ["1825", "1810", "1879"],
      answer: 0,
      explanation: "Bolivia declaró su independencia el 6 de agosto de 1825.",
    },
    {
      question: "¿Cuál es la capital constitucional de Bolivia?",
      options: ["La Paz", "Sucre", "Santa Cruz"],
      answer: 1,
      explanation: "Sucre es la capital constitucional de Bolivia.",
    },
    {
      question: "¿Qué documento formalizó el nacimiento de la nueva República?",
      options: [
        "Acta de Independencia",
        "Tratado de Tordesillas",
        "Carta de Jamaica",
      ],
      answer: 0,
      explanation:
        "El Acta de Independencia formalizó la creación de la República.",
    },
  ],
};

type CourseLesson = {
  title: string;
  skill: string;
  target: string;
};

const courseLessons: Record<"es" | "en", CourseLesson[]> = {
  es: [
    {
      title: "Acomoda tus dedos",
      skill: "Siente las guías de F y J",
      target: "fjasdklñ",
    },
    {
      title: "Ritmo inicial",
      skill: "Combina la fila guía",
      target: "asa sala dada falda",
    },
    { title: "Índice fuerte", skill: "G y H", target: "fgh jhg gafas haga" },
    {
      title: "Fila guía completa",
      skill: "Precisión sin mirar",
      target: "la sala es genial",
    },
    {
      title: "Subimos a E e I",
      skill: "E I con dedo medio",
      target: "eje idea isla jefe",
    },
    {
      title: "R y U",
      skill: "Alcanza la fila superior",
      target: "rueda dura jurar",
    },
    {
      title: "W O Q P",
      skill: "Extremos superiores",
      target: "poco queso equipo",
    },
    {
      title: "Reto superior",
      skill: "Palabras de dos filas",
      target: "quiero aprender rapido",
    },
    {
      title: "Bajamos a C y M",
      skill: "Fila inferior central",
      target: "cama mimo comida",
    },
    { title: "V N", skill: "Índices hacia abajo", target: "nave vino ventana" },
    { title: "X Z", skill: "Meñique y anular", target: "zorro feliz examen" },
    {
      title: "Teclado completo",
      skill: "Las tres filas",
      target: "mi teclado es divertido",
    },
    { title: "Mayúsculas", skill: "Usa Shift", target: "Lumi vive en Bolivia" },
    {
      title: "Coma y punto",
      skill: "Pausas al escribir",
      target: "escribo bien, rapido y feliz.",
    },
    {
      title: "Signos y preguntas",
      skill: "¿ ? ¡ !",
      target: "¿listos? ¡vamos a escribir!",
    },
    {
      title: "Frases fluidas",
      skill: "Ritmo continuo",
      target: "cada dia escribo con mayor precision",
    },
    {
      title: "Desafío de velocidad",
      skill: "Mantén 85% o más",
      target: "lumi acompaña mi aventura de aprender",
    },
    {
      title: "Reto de palabras por minuto",
      skill: "Velocidad, precisión y resistencia",
      target:
        "cada dia practico con calma y precision. mis dedos encuentran cada tecla mientras mantengo un ritmo constante. escribir mejor me ayuda a estudiar, crear y comunicar mis ideas. hoy completo este desafio con confianza porque aprender un poco cada dia me permite crecer y alcanzar nuevas metas.",
    },
  ],
  en: [
    {
      title: "Place your fingers",
      skill: "Feel the guides on F and J",
      target: "fjasdkl;",
    },
    {
      title: "First rhythm",
      skill: "Mix the home row",
      target: "sad fall dad flask",
    },
    { title: "Strong index", skill: "G and H", target: "fish had glass" },
    {
      title: "Full home row",
      skill: "Accuracy without looking",
      target: "a glad lad has salad",
    },
    {
      title: "Up to E and I",
      skill: "Middle fingers reach up",
      target: "idea side field",
    },
    { title: "R and U", skill: "Reach the top row", target: "rule rude true" },
    { title: "W O Q P", skill: "Top-row edges", target: "power quiet people" },
    {
      title: "Top-row challenge",
      skill: "Words across two rows",
      target: "i want to type quickly",
    },
    {
      title: "Down to C and M",
      skill: "Lower middle row",
      target: "come calm comic",
    },
    {
      title: "V and N",
      skill: "Index fingers move down",
      target: "van vine invent",
    },
    {
      title: "X and Z",
      skill: "Ring and little finger",
      target: "zoom extra lazy",
    },
    {
      title: "Full keyboard",
      skill: "All three rows",
      target: "my keyboard is fun",
    },
    {
      title: "Capital letters",
      skill: "Use Shift",
      target: "Lumi lives in Bolivia",
    },
    {
      title: "Comma and period",
      skill: "Punctuation pauses",
      target: "i type well, fast and happy.",
    },
    {
      title: "Question marks",
      skill: "Questions and excitement",
      target: "are you ready? let us type!",
    },
    {
      title: "Fluent sentences",
      skill: "Continuous rhythm",
      target: "every day i type with more precision",
    },
    {
      title: "Speed challenge",
      skill: "Keep 85% or more",
      target: "lumi guides my learning adventure",
    },
    {
      title: "Words per minute challenge",
      skill: "Speed, accuracy and endurance",
      target:
        "every day i practice with calm and accuracy. my fingers find each key while i keep a steady rhythm. typing better helps me study, create, and share my ideas. today i complete this challenge with confidence because learning a little every day helps me grow and reach new goals.",
    },
  ],
};

const lessonAlternatives: Record<"es" | "en", string[][]> = {
  es: [
    [],
    ["ala sala asa dala", "sal falla las alas"],
    ["haga gafas gas hagas", "gafas haga hall gas"],
    ["las hadas salen", "la falda es lila"],
    ["isla eje idea lija", "jefe elige la isla"],
    ["dura rueda jugar", "jurar ayuda a lula"],
    ["queso puro equipo", "papa quiere queso"],
    ["puedo escribir mejor", "quiero jugar y aprender"],
    ["mimo cama camino", "comida rica mama"],
    ["vino nave nueve", "ventana nueva vino"],
    ["examen zorro feliz", "zeta extra feliz"],
    ["escribir con calma ayuda", "practicar teclado es genial"],
    ["Lumi aprende Contigo", "Bolivia Escribe Feliz"],
    ["escribo lento, luego rapido.", "mi teclado, mi aventura."],
    ["¿seguimos? ¡claro que si!", "¿preparado? ¡vamos juntos!"],
    ["cada practica mejora mi ritmo", "mis dedos escriben con confianza"],
    ["escribo con precision y buen ritmo", "cada tecla me acerca a mi meta"],
    [
      "practico cada dia para escribir mejor. mantengo la mirada en la pantalla y dejo que mis dedos encuentren las teclas. con paciencia, precision y un ritmo constante puedo compartir mis ideas con claridad y confianza.",
      "escribir con rapidez requiere calma y practica. respiro, acomodo mis manos y avanzo palabra por palabra. cada ejercicio fortalece mis dedos y me ayuda a estudiar, crear y aprender mucho mejor.",
    ],
  ],
  en: [
    [],
    ["sad lad fall ask", "all lads ask"],
    ["glass fish had gas", "a glad fish has gas"],
    ["a glad lad has salad", "all flags shall fall"],
    ["side idea field", "jill likes the field"],
    ["true rule rude", "jude hurried up"],
    ["quiet people power", "people quote poems"],
    ["i want to learn quickly", "we type words with care"],
    ["calm comic come", "mimi can come"],
    ["new van invent", "nine vines vanish"],
    ["extra lazy zoom", "zany foxes relax"],
    ["typing calmly feels great", "practice makes typing easier"],
    ["Lumi Learns With Me", "Bolivia Types Today"],
    ["i type slowly, then quickly.", "my keyboard, my adventure."],
    ["are we ready? yes, we are!", "can we type? let us begin!"],
    ["every practice improves my rhythm", "my fingers type with confidence"],
    ["i type with accuracy and rhythm", "every key brings me closer"],
    [
      "i practice every day to type better. i keep my eyes on the screen and let my fingers find the keys. with patience, accuracy, and a steady rhythm i can share my ideas clearly and confidently.",
      "typing quickly takes calm and practice. i breathe, place my hands, and move forward one word at a time. every exercise strengthens my fingers and helps me study, create, and learn much better.",
    ],
  ],
};

const copy = {
  es: {
    nav: ["Cursos", "Cómo funciona", "Planes", "Familias"],
    login: "Ingresar",
    start: "Comenzar ahora",
    eyebrow: "Plataforma educativa bilingüe",
    titleA: "Aprender hoy.",
    titleB: "Crecer para siempre.",
    intro:
      "Una experiencia educativa divertida y segura para que cada niño aprenda a su ritmo, acompañado por Lumi.",
    trial: "Probar una lección",
    plans: "Ver planes familiares",
    trusted: "Primer curso disponible",
    course: "Dactilografía divertida",
    courseDesc: "Aprende a escribir con todos los dedos mientras juegas.",
    progress: "Tu progreso de hoy",
    lesson: "Lección 1 de 18",
    practice: "Práctica rápida",
    practiceHint: "Escribe las letras resaltadas usando los dedos correctos.",
    settings: "Personalizar",
    reset: "Reiniciar",
    done: "¡Excelente! Completaste la práctica.",
    accuracy: "Precisión",
    streak: "Racha",
    stars: "Estrellas",
    why: "Mucho más que aprender una materia",
    whySub: "Lumi reúne distintas formas de aprender, practicar y crecer.",
    benefits: [
      [
        "Aprende jugando",
        "Misiones cortas, actividades y premios que mantienen la motivación en cada curso.",
      ],
      [
        "Avanza a su ritmo",
        "Cada materia permite practicar, repetir y avanzar según sus necesidades.",
      ],
      [
        "Acompañamiento familiar",
        "Los padres ven avances, tiempo de práctica y habilidades dominadas.",
      ],
    ],
    familyTitle: "Un plan para cada familia",
    familySub:
      "Perfiles separados, progreso individual y acceso desde cualquier computadora.",
    month: "/mes",
    choose: "Elegir plan",
    popular: "Más elegido",
    planNames: ["Individual", "Familia", "Familia Plus"],
    planKids: ["1 estudiante", "Hasta 3 estudiantes", "Hasta 5 estudiantes"],
    footer: "Producido por Ing. Nelson Mendoza",
    panelTitle: "Personaliza tu espacio",
    panelSub: "Los cambios se aplican en la práctica al instante.",
    theme: "Escenario",
    themes: ["Aula", "Espacio", "Océano"],
    hands: "Mostrar manos",
    sound: "Sonidos de acierto",
    big: "Texto grande",
    close: "Listo",
  },
  en: {
    nav: ["Courses", "How it works", "Plans", "Families"],
    login: "Log in",
    start: "Start now",
    eyebrow: "Bilingual learning platform",
    titleA: "Learn today.",
    titleB: "Grow forever.",
    intro:
      "A fun and safe learning experience where every child grows at their own pace, guided by Lumi.",
    trial: "Try a lesson",
    plans: "See family plans",
    trusted: "First course available",
    course: "Fun Typing",
    courseDesc: "Learn to type with every finger while you play.",
    progress: "Today’s progress",
    lesson: "Lesson 1 of 18",
    practice: "Quick practice",
    practiceHint: "Type the highlighted letters using the correct fingers.",
    settings: "Customize",
    reset: "Reset",
    done: "Great job! You completed the practice.",
    accuracy: "Accuracy",
    streak: "Streak",
    stars: "Stars",
    why: "Much more than learning one subject",
    whySub: "Lumi brings together different ways to learn, practice and grow.",
    benefits: [
      [
        "Learn through play",
        "Short missions, activities and rewards keep students motivated in every course.",
      ],
      [
        "Grow at their pace",
        "Every subject lets students practice, repeat and grow at their own pace.",
      ],
      [
        "Family guidance",
        "Parents see progress, practice time and mastered skills.",
      ],
    ],
    familyTitle: "A plan for every family",
    familySub:
      "Separate profiles, individual progress and access from any computer.",
    month: "/month",
    choose: "Choose plan",
    popular: "Most popular",
    planNames: ["Individual", "Family", "Family Plus"],
    planKids: ["1 student", "Up to 3 students", "Up to 5 students"],
    footer: "Produced by Eng. Nelson Mendoza",
    panelTitle: "Customize your space",
    panelSub: "Changes appear in the practice instantly.",
    theme: "World",
    themes: ["Classroom", "Space", "Ocean"],
    hands: "Show hands",
    sound: "Success sounds",
    big: "Large text",
    close: "Done",
  },
} as const;

const rows = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ñ"],
  ["Z", "X", "C", "V", "B", "N", "M"],
];

type VisualKey = { label: string; values?: string[]; wide?: string };

const typingKeyboard: Record<"es" | "en", VisualKey[][]> = {
  es: [
    [
      { label: "º", values: ["º", "ª"] },
      { label: "1\n!", values: ["1", "!"] },
      { label: '2\n"', values: ["2", '"'] },
      { label: "3\n#", values: ["3", "#"] },
      { label: "4\n$", values: ["4", "$"] },
      { label: "5\n%", values: ["5", "%"] },
      { label: "6\n&", values: ["6", "&"] },
      { label: "7\n/", values: ["7", "/"] },
      { label: "8\n(", values: ["8", "("] },
      { label: "9\n)", values: ["9", ")"] },
      { label: "0\n=", values: ["0", "="] },
      { label: "'\n?", values: ["'", "?"] },
      { label: "¿\n¡", values: ["¿", "¡"] },
      { label: "⌫", wide: "backspace" },
    ],
    [
      { label: "Tab", wide: "tab" },
      ..."QWERTYUIOP"
        .split("")
        .map((label) => ({ label, values: [label.toLowerCase(), label] })),
      { label: "´\n¨", values: ["´", "¨"] },
      { label: "+\n*", values: ["+", "*"] },
    ],
    [
      { label: "Bloq", wide: "caps" },
      ..."ASDFGHJKLÑ"
        .split("")
        .map((label) => ({ label, values: [label.toLowerCase(), label] })),
      { label: "{\n[", values: ["{", "["] },
      { label: "}\n]", values: ["}", "]"] },
      { label: "Enter", wide: "enter" },
    ],
    [
      { label: "Shift", wide: "shift" },
      ..."ZXCVBNM"
        .split("")
        .map((label) => ({ label, values: [label.toLowerCase(), label] })),
      { label: ";\n,", values: [";", ","] },
      { label: ":\n.", values: [":", "."] },
      { label: "_\n-", values: ["_", "-"] },
      { label: "Shift", wide: "shift" },
    ],
  ],
  en: [
    [
      { label: "`\n~", values: ["`", "~"] },
      { label: "1\n!", values: ["1", "!"] },
      { label: "2\n@", values: ["2", "@"] },
      { label: "3\n#", values: ["3", "#"] },
      { label: "4\n$", values: ["4", "$"] },
      { label: "5\n%", values: ["5", "%"] },
      { label: "6\n^", values: ["6", "^"] },
      { label: "7\n&", values: ["7", "&"] },
      { label: "8\n*", values: ["8", "*"] },
      { label: "9\n(", values: ["9", "("] },
      { label: "0\n)", values: ["0", ")"] },
      { label: "-\n_", values: ["-", "_"] },
      { label: "=\n+", values: ["=", "+"] },
      { label: "⌫", wide: "backspace" },
    ],
    [
      { label: "Tab", wide: "tab" },
      ..."QWERTYUIOP"
        .split("")
        .map((label) => ({ label, values: [label.toLowerCase(), label] })),
      { label: "[\n{", values: ["[", "{"] },
      { label: "]\n}", values: ["]", "}"] },
      { label: "\\\n|", values: ["\\", "|"] },
    ],
    [
      { label: "Caps", wide: "caps" },
      ..."ASDFGHJKL"
        .split("")
        .map((label) => ({ label, values: [label.toLowerCase(), label] })),
      { label: ";\n:", values: [";", ":"] },
      { label: "'\n\"", values: ["'", '"'] },
      { label: "Enter", wide: "enter" },
    ],
    [
      { label: "Shift", wide: "shift" },
      ..."ZXCVBNM"
        .split("")
        .map((label) => ({ label, values: [label.toLowerCase(), label] })),
      { label: ",\n<", values: [",", "<"] },
      { label: ".\n>", values: [".", ">"] },
      { label: "/\n?", values: ["/", "?"] },
      { label: "Shift", wide: "shift" },
    ],
  ],
};

function visualKeyMatches(key: VisualKey, expected: string) {
  return key.values?.includes(expected) || false;
}

function needsShift(expected: string) {
  if (!expected || expected === " ") return false;
  if (/^[A-ZÁÉÍÓÚÜÑ]$/.test(expected)) return true;
  return langShiftSymbols.has(expected);
}

const langShiftSymbols = new Set([
  "!",
  "?",
  '"',
  "#",
  "$",
  "%",
  "&",
  "/",
  "(",
  ")",
  "=",
  "ª",
  "¡",
  "¨",
  "*",
  "{",
  "}",
  "_",
  "~",
  "@",
  "^",
  "+",
  "|",
  ":",
  "<",
  ">",
]);

type ReadingExercise = {
  kind: "listen" | "choice" | "picture" | "build";
  display: string;
  sound: string;
  prompt: string;
  options?: string[];
  answer?: string;
  icon?: string;
  story?: string;
};
type ReadingLesson = {
  title: string;
  skill: string;
  exercises: ReadingExercise[];
};

const listenSet = (items: Array<[string, string, string, string]>) =>
  items.map(([display, sound, word, icon]) => ({
    kind: "listen" as const,
    display,
    sound,
    prompt: word,
    icon,
  }));
const choiceSet = (items: Array<[string, string, string[], string, string?]>) =>
  items.map(([display, sound, options, answer, prompt]) => ({
    kind: "choice" as const,
    display,
    sound,
    prompt: prompt || display,
    options,
    answer,
  }));
const pictureSet = (items: Array<[string, string[], string, string]>) =>
  items.map(([word, options, answer, icon]) => ({
    kind: "picture" as const,
    display: word,
    sound: word,
    prompt: word,
    options,
    answer,
    icon,
  }));
const buildSet = (items: Array<[string, string[], string, string]>) =>
  items.map(([word, options, answer, icon]) => ({
    kind: "build" as const,
    display: word,
    sound: word,
    prompt: word,
    options,
    answer,
    icon,
  }));

const readingLessons: Record<"es" | "en", ReadingLesson[]> = {
  es: [
    {
      title: "Las vocales suenan",
      skill: "Vocales · escuchar y repetir",
      exercises: listenSet([
        ["A a", "a", "araña", "🕷️"],
        ["E e", "e", "elefante", "🐘"],
        ["I i", "i", "iglú", "🧊"],
        ["O o", "o", "oso", "🐻"],
        ["U u", "u", "uva", "🍇"],
      ]),
    },
    {
      title: "Reconozco la vocal",
      skill: "Vocales · sonido y grafía",
      exercises: choiceSet([
        ["¿Qué vocal escuchas?", "a", ["a", "e", "o", "u"], "a"],
        ["¿Qué vocal escuchas?", "e", ["e", "i", "a", "o"], "e"],
        ["¿Qué vocal escuchas?", "i", ["i", "u", "e", "a"], "i"],
        ["¿Qué vocal escuchas?", "o", ["o", "a", "u", "i"], "o"],
        ["¿Qué vocal escuchas?", "u", ["u", "o", "i", "e"], "u"],
      ]),
    },
    {
      title: "La familia de la M",
      skill: "Sílabas directas",
      exercises: listenSet([
        ["ma", "ma", "mano", "✋"],
        ["me", "me", "mesa", "🪑"],
        ["mi", "mi", "mío", "🙋"],
        ["mo", "mo", "mono", "🐒"],
        ["mu", "mu", "muñeca", "🪆"],
      ]),
    },
    {
      title: "La familia de la P",
      skill: "Sílabas directas",
      exercises: listenSet([
        ["pa", "pa", "papá", "👨"],
        ["pe", "pe", "pelota", "⚽"],
        ["pi", "pi", "pipa", "🪈"],
        ["po", "po", "pollo", "🐥"],
        ["pu", "pu", "puerta", "🚪"],
      ]),
    },
    {
      title: "La familia de la S",
      skill: "Sílabas directas",
      exercises: listenSet([
        ["sa", "sa", "sapo", "🐸"],
        ["se", "se", "semilla", "🌱"],
        ["si", "si", "silla", "🪑"],
        ["so", "so", "sol", "☀️"],
        ["su", "su", "suma", "➕"],
      ]),
    },
    {
      title: "La familia de la L",
      skill: "Sílabas directas",
      exercises: listenSet([
        ["la", "la", "lápiz", "✏️"],
        ["le", "le", "leche", "🥛"],
        ["li", "li", "libro", "📘"],
        ["lo", "lo", "loro", "🦜"],
        ["lu", "lu", "luna", "🌙"],
      ]),
    },
    {
      title: "La familia de la T",
      skill: "Sílabas directas",
      exercises: listenSet([
        ["ta", "ta", "taza", "☕"],
        ["te", "te", "techo", "🏠"],
        ["ti", "ti", "tigre", "🐯"],
        ["to", "to", "tomate", "🍅"],
        ["tu", "tu", "tucán", "🐦"],
      ]),
    },
    {
      title: "Palabras con M y P",
      skill: "Palabra e imagen",
      exercises: pictureSet([
        ["mono", ["mono", "pan", "mapa", "pelota"], "mono", "🐒"],
        ["mapa", ["mano", "mapa", "pollo", "puerta"], "mapa", "🗺️"],
        ["pan", ["mono", "papá", "pan", "mesa"], "pan", "🍞"],
        ["mano", ["mano", "pelota", "mapa", "pan"], "mano", "✋"],
        ["papá", ["pollo", "mono", "mesa", "papá"], "papá", "👨"],
      ]),
    },
    {
      title: "Palabras con S y L",
      skill: "Palabra e imagen",
      exercises: pictureSet([
        ["sol", ["sol", "luna", "sapo", "silla"], "sol", "☀️"],
        ["luna", ["lápiz", "luna", "sol", "libro"], "luna", "🌙"],
        ["sapo", ["silla", "sol", "sapo", "loro"], "sapo", "🐸"],
        ["silla", ["silla", "sapo", "luna", "lápiz"], "silla", "🪑"],
        ["lápiz", ["libro", "sol", "lápiz", "sapo"], "lápiz", "✏️"],
      ]),
    },
    {
      title: "Leo palabras: los animales",
      skill: "Palabra e imagen",
      exercises: pictureSet([
        ["perro", ["gato", "perro", "pato", "sol"], "perro", "🐶"],
        ["gato", ["gato", "casa", "perro", "pato"], "gato", "🐱"],
        ["casa", ["pelota", "pato", "casa", "gato"], "casa", "🏠"],
        ["pelota", ["perro", "pelota", "casa", "pato"], "pelota", "⚽"],
        ["pato", ["gato", "casa", "perro", "pato"], "pato", "🦆"],
      ]),
    },
    {
      title: "Palabras con N y D",
      skill: "Palabra e imagen",
      exercises: pictureSet([
        ["nido", ["nido", "dado", "nube", "dedo"], "nido", "🪺"],
        ["dedo", ["nariz", "dedo", "nido", "dado"], "dedo", "☝️"],
        ["nube", ["nube", "nariz", "dedo", "dado"], "nube", "☁️"],
        ["dado", ["nido", "nube", "dado", "nariz"], "dado", "🎲"],
        ["nariz", ["dedo", "nariz", "nido", "dado"], "nariz", "👃"],
      ]),
    },
    {
      title: "Palabras con R y C",
      skill: "Palabra e imagen",
      exercises: pictureSet([
        ["rosa", ["rosa", "cama", "ratón", "coco"], "rosa", "🌹"],
        ["cama", ["cohete", "cama", "rosa", "ratón"], "cama", "🛏️"],
        ["ratón", ["coco", "cama", "ratón", "cohete"], "ratón", "🐭"],
        ["cohete", ["cohete", "rosa", "coco", "ratón"], "cohete", "🚀"],
        ["coco", ["cama", "ratón", "coco", "rosa"], "coco", "🥥"],
      ]),
    },
    {
      title: "Sílabas trabadas",
      skill: "Sílabas complejas",
      exercises: listenSet([
        ["bla", "bla", "blanco", "⚪"],
        ["pla", "pla", "plátano", "🍌"],
        ["tra", "tra", "tractor", "🚜"],
        ["cri", "cri", "grillo", "🦗"],
        ["gru", "gru", "gruta", "⛰️"],
      ]),
    },
    {
      title: "Armo palabras",
      skill: "Unir sílabas",
      exercises: buildSet([
        ["mesa", ["sa", "me"], "me|sa", "🪑"],
        ["pipa", ["pa", "pi"], "pi|pa", "🪈"],
        ["sapo", ["po", "sa"], "sa|po", "🐸"],
        ["luna", ["na", "lu"], "lu|na", "🌙"],
        ["dedo", ["do", "de"], "de|do", "☝️"],
      ]),
    },
    {
      title: "Leo frases cortas",
      skill: "Frases y comprensión",
      exercises: choiceSet([
        [
          "El perro corre.",
          "El perro corre",
          ["El perro", "El gato", "La luna"],
          "El perro",
          "¿Quién corre?",
        ],
        [
          "La luna sale.",
          "La luna sale",
          ["El sol", "La luna", "La casa"],
          "La luna",
          "¿Qué sale?",
        ],
        [
          "Mi mamá me ama.",
          "Mi mamá me ama",
          ["Mi papá", "Mi perro", "Mi mamá"],
          "Mi mamá",
          "¿Quién me ama?",
        ],
        [
          "El sol calienta.",
          "El sol calienta",
          ["El sol", "La luna", "El pan"],
          "El sol",
          "¿Qué calienta?",
        ],
        [
          "Ana lee un libro.",
          "Ana lee un libro",
          ["Un mapa", "Un libro", "Una carta"],
          "Un libro",
          "¿Qué lee Ana?",
        ],
      ]),
    },
    {
      title: "Entiendo lo que leo",
      skill: "Comprensión de detalles",
      exercises: choiceSet([
        [
          "El gato duerme en la silla.",
          "El gato duerme en la silla",
          ["En la silla", "En la luna", "En el mapa"],
          "En la silla",
          "¿Dónde duerme el gato?",
        ],
        [
          "Tomás come un tomate rojo.",
          "Tomás come un tomate rojo",
          ["Verde", "Rojo", "Azul"],
          "Rojo",
          "¿De qué color es el tomate?",
        ],
        [
          "La abeja vuela sobre la rosa.",
          "La abeja vuela sobre la rosa",
          ["Sobre la rosa", "Sobre la cama", "Sobre el pan"],
          "Sobre la rosa",
          "¿Sobre qué vuela la abeja?",
        ],
        [
          "El tren pasa por el túnel.",
          "El tren pasa por el túnel",
          ["Por la casa", "Por el túnel", "Por la luna"],
          "Por el túnel",
          "¿Por dónde pasa el tren?",
        ],
        [
          "Lucía pinta una flor amarilla.",
          "Lucía pinta una flor amarilla",
          ["Una flor", "Un sapo", "Un dado"],
          "Una flor",
          "¿Qué pinta Lucía?",
        ],
      ]),
    },
    {
      title: "Cuento: Tito el perrito",
      skill: "Mini-cuento y comprensión",
      exercises: choiceSet([
        [
          "Tito es un perrito pequeño. Tito vive en una casa azul. Cada mañana juega con una pelota roja. Por la noche duerme bajo la luna.",
          "Tito es un perrito pequeño. Tito vive en una casa azul. Cada mañana juega con una pelota roja. Por la noche duerme bajo la luna.",
          ["Tito", "Coco", "Max"],
          "Tito",
          "¿Cómo se llama el perrito?",
        ],
        [
          "El cuento de Tito",
          "Tito vive en una casa azul",
          ["Roja", "Verde", "Azul"],
          "Azul",
          "¿De qué color es su casa?",
        ],
        [
          "El cuento de Tito",
          "Tito juega con una pelota roja",
          ["Con un libro", "Con una pelota", "Con un lápiz"],
          "Con una pelota",
          "¿Con qué juega Tito?",
        ],
        [
          "El cuento de Tito",
          "La pelota es roja",
          ["Roja", "Azul", "Amarilla"],
          "Roja",
          "¿De qué color es la pelota?",
        ],
        [
          "El cuento de Tito",
          "Tito duerme bajo la luna",
          ["En el sol", "Bajo la luna", "En una nube"],
          "Bajo la luna",
          "¿Dónde duerme Tito?",
        ],
      ]),
    },
    {
      title: "Repaso final",
      skill: "Todas las habilidades",
      exercises: [
        {
          kind: "choice",
          display: "¿Qué vocal escuchas?",
          sound: "o",
          prompt: "Escucha y elige",
          options: ["o", "a", "u", "i"],
          answer: "o",
        },
        {
          kind: "listen",
          display: "ta",
          sound: "ta",
          prompt: "taza",
          icon: "☕",
        },
        {
          kind: "picture",
          display: "perro",
          sound: "perro",
          prompt: "perro",
          options: ["gato", "perro", "pato", "casa"],
          answer: "perro",
          icon: "🐶",
        },
        {
          kind: "build",
          display: "luna",
          sound: "luna",
          prompt: "luna",
          options: ["na", "lu"],
          answer: "lu|na",
          icon: "🌙",
        },
        {
          kind: "choice",
          display: "El sol calienta.",
          sound: "El sol calienta",
          prompt: "¿Qué calienta?",
          options: ["El sol", "La luna", "El pan"],
          answer: "El sol",
        },
      ],
    },
  ],
  en: [
    {
      title: "Vowels have sounds",
      skill: "Vowels · listen and repeat",
      exercises: listenSet([
        ["A a", "a", "apple", "🍎"],
        ["E e", "e", "elephant", "🐘"],
        ["I i", "i", "igloo", "🧊"],
        ["O o", "o", "octopus", "🐙"],
        ["U u", "u", "umbrella", "☂️"],
      ]),
    },
    {
      title: "Recognize the vowel",
      skill: "Vowels · sound and letter",
      exercises: choiceSet([
        ["Which vowel do you hear?", "a", ["a", "e", "o", "u"], "a"],
        ["Which vowel do you hear?", "e", ["e", "i", "a", "o"], "e"],
        ["Which vowel do you hear?", "i", ["i", "u", "e", "a"], "i"],
        ["Which vowel do you hear?", "o", ["o", "a", "u", "i"], "o"],
        ["Which vowel do you hear?", "u", ["u", "o", "i", "e"], "u"],
      ]),
    },
    {
      title: "The M family",
      skill: "Direct syllables",
      exercises: listenSet([
        ["ma", "ma", "map", "🗺️"],
        ["me", "me", "melon", "🍈"],
        ["mi", "mi", "mirror", "🪞"],
        ["mo", "mo", "monkey", "🐒"],
        ["mu", "mu", "music", "🎵"],
      ]),
    },
    {
      title: "The P family",
      skill: "Direct syllables",
      exercises: listenSet([
        ["pa", "pa", "papa", "👨"],
        ["pe", "pe", "pen", "🖊️"],
        ["pi", "pi", "pig", "🐷"],
        ["po", "po", "pot", "🍲"],
        ["pu", "pu", "pudding", "🍮"],
      ]),
    },
    {
      title: "The S family",
      skill: "Direct syllables",
      exercises: listenSet([
        ["sa", "sa", "sand", "🏖️"],
        ["se", "se", "seed", "🌱"],
        ["si", "si", "sit", "🪑"],
        ["so", "so", "sun", "☀️"],
        ["su", "su", "soup", "🥣"],
      ]),
    },
    {
      title: "The L family",
      skill: "Direct syllables",
      exercises: listenSet([
        ["la", "la", "lamp", "💡"],
        ["le", "le", "lemon", "🍋"],
        ["li", "li", "lion", "🦁"],
        ["lo", "lo", "log", "🪵"],
        ["lu", "lu", "lunar", "🌙"],
      ]),
    },
    {
      title: "The T family",
      skill: "Direct syllables",
      exercises: listenSet([
        ["ta", "ta", "table", "🪑"],
        ["te", "te", "ten", "🔟"],
        ["ti", "ti", "tiger", "🐯"],
        ["to", "to", "tomato", "🍅"],
        ["tu", "tu", "tulip", "🌷"],
      ]),
    },
    {
      title: "Words with M and P",
      skill: "Word and picture",
      exercises: pictureSet([
        ["monkey", ["monkey", "bread", "map", "ball"], "monkey", "🐒"],
        ["map", ["hand", "map", "chicken", "door"], "map", "🗺️"],
        ["bread", ["monkey", "dad", "bread", "table"], "bread", "🍞"],
        ["hand", ["hand", "ball", "map", "bread"], "hand", "✋"],
        ["dad", ["chicken", "monkey", "table", "dad"], "dad", "👨"],
      ]),
    },
    {
      title: "Words with S and L",
      skill: "Word and picture",
      exercises: pictureSet([
        ["sun", ["sun", "moon", "frog", "chair"], "sun", "☀️"],
        ["moon", ["pencil", "moon", "sun", "book"], "moon", "🌙"],
        ["frog", ["chair", "sun", "frog", "parrot"], "frog", "🐸"],
        ["chair", ["chair", "frog", "moon", "pencil"], "chair", "🪑"],
        ["pencil", ["book", "sun", "pencil", "frog"], "pencil", "✏️"],
      ]),
    },
    {
      title: "Animal words",
      skill: "Word and picture",
      exercises: pictureSet([
        ["dog", ["cat", "dog", "duck", "sun"], "dog", "🐶"],
        ["cat", ["cat", "house", "dog", "duck"], "cat", "🐱"],
        ["house", ["ball", "duck", "house", "cat"], "house", "🏠"],
        ["ball", ["dog", "ball", "house", "duck"], "ball", "⚽"],
        ["duck", ["cat", "house", "dog", "duck"], "duck", "🦆"],
      ]),
    },
    {
      title: "Words with N and D",
      skill: "Word and picture",
      exercises: pictureSet([
        ["nest", ["nest", "dice", "cloud", "finger"], "nest", "🪺"],
        ["finger", ["nose", "finger", "nest", "dice"], "finger", "☝️"],
        ["cloud", ["cloud", "nose", "finger", "dice"], "cloud", "☁️"],
        ["dice", ["nest", "cloud", "dice", "nose"], "dice", "🎲"],
        ["nose", ["finger", "nose", "nest", "dice"], "nose", "👃"],
      ]),
    },
    {
      title: "Words with R and C",
      skill: "Word and picture",
      exercises: pictureSet([
        ["rose", ["rose", "bed", "mouse", "coconut"], "rose", "🌹"],
        ["bed", ["rocket", "bed", "rose", "mouse"], "bed", "🛏️"],
        ["mouse", ["coconut", "bed", "mouse", "rocket"], "mouse", "🐭"],
        ["rocket", ["rocket", "rose", "coconut", "mouse"], "rocket", "🚀"],
        ["coconut", ["bed", "mouse", "coconut", "rose"], "coconut", "🥥"],
      ]),
    },
    {
      title: "Blended sounds",
      skill: "Complex syllables",
      exercises: listenSet([
        ["bla", "bla", "blank", "⚪"],
        ["pla", "pla", "plant", "🌱"],
        ["tra", "tra", "tractor", "🚜"],
        ["cri", "cri", "cricket", "🦗"],
        ["gru", "gru", "group", "👥"],
      ]),
    },
    {
      title: "Build words",
      skill: "Join syllables",
      exercises: buildSet([
        ["table", ["ble", "ta"], "ta|ble", "🪑"],
        ["paper", ["per", "pa"], "pa|per", "📄"],
        ["sunny", ["ny", "sun"], "sun|ny", "☀️"],
        ["lunar", ["nar", "lu"], "lu|nar", "🌙"],
        ["finger", ["ger", "fin"], "fin|ger", "☝️"],
      ]),
    },
    {
      title: "Read short sentences",
      skill: "Sentences and meaning",
      exercises: choiceSet([
        [
          "The dog runs.",
          "The dog runs",
          ["The dog", "The cat", "The moon"],
          "The dog",
          "Who runs?",
        ],
        [
          "The moon rises.",
          "The moon rises",
          ["The sun", "The moon", "The house"],
          "The moon",
          "What rises?",
        ],
        [
          "My mom loves me.",
          "My mom loves me",
          ["My dad", "My dog", "My mom"],
          "My mom",
          "Who loves me?",
        ],
        [
          "The sun warms us.",
          "The sun warms us",
          ["The sun", "The moon", "The bread"],
          "The sun",
          "What warms us?",
        ],
        [
          "Ana reads a book.",
          "Ana reads a book",
          ["A map", "A book", "A letter"],
          "A book",
          "What does Ana read?",
        ],
      ]),
    },
    {
      title: "Understand what I read",
      skill: "Reading details",
      exercises: choiceSet([
        [
          "The cat sleeps on the chair.",
          "The cat sleeps on the chair",
          ["On the chair", "On the moon", "On the map"],
          "On the chair",
          "Where does the cat sleep?",
        ],
        [
          "Tom eats a red tomato.",
          "Tom eats a red tomato",
          ["Green", "Red", "Blue"],
          "Red",
          "What color is the tomato?",
        ],
        [
          "The bee flies over the rose.",
          "The bee flies over the rose",
          ["Over the rose", "Over the bed", "Over the bread"],
          "Over the rose",
          "What does the bee fly over?",
        ],
        [
          "The train goes through the tunnel.",
          "The train goes through the tunnel",
          ["The house", "The tunnel", "The moon"],
          "The tunnel",
          "Where does the train go?",
        ],
        [
          "Lucy paints a yellow flower.",
          "Lucy paints a yellow flower",
          ["A flower", "A frog", "A die"],
          "A flower",
          "What does Lucy paint?",
        ],
      ]),
    },
    {
      title: "Story: Tito the puppy",
      skill: "Story comprehension",
      exercises: choiceSet([
        [
          "Tito is a small puppy. He lives in a blue house. Each morning he plays with a red ball. At night he sleeps under the moon.",
          "Tito is a small puppy. He lives in a blue house. Each morning he plays with a red ball. At night he sleeps under the moon.",
          ["Tito", "Coco", "Max"],
          "Tito",
          "What is the puppy's name?",
        ],
        [
          "Tito's story",
          "Tito lives in a blue house",
          ["Red", "Green", "Blue"],
          "Blue",
          "What color is his house?",
        ],
        [
          "Tito's story",
          "Tito plays with a red ball",
          ["A book", "A ball", "A pencil"],
          "A ball",
          "What does Tito play with?",
        ],
        [
          "Tito's story",
          "The ball is red",
          ["Red", "Blue", "Yellow"],
          "Red",
          "What color is the ball?",
        ],
        [
          "Tito's story",
          "Tito sleeps under the moon",
          ["In the sun", "Under the moon", "In a cloud"],
          "Under the moon",
          "Where does Tito sleep?",
        ],
      ]),
    },
    {
      title: "Final review",
      skill: "All reading skills",
      exercises: [
        {
          kind: "choice",
          display: "Which vowel do you hear?",
          sound: "o",
          prompt: "Listen and choose",
          options: ["o", "a", "u", "i"],
          answer: "o",
        },
        {
          kind: "listen",
          display: "ta",
          sound: "ta",
          prompt: "table",
          icon: "🪑",
        },
        {
          kind: "picture",
          display: "dog",
          sound: "dog",
          prompt: "dog",
          options: ["cat", "dog", "duck", "house"],
          answer: "dog",
          icon: "🐶",
        },
        {
          kind: "build",
          display: "lunar",
          sound: "lunar",
          prompt: "lunar",
          options: ["nar", "lu"],
          answer: "lu|nar",
          icon: "🌙",
        },
        {
          kind: "choice",
          display: "The sun warms us.",
          sound: "The sun warms us",
          prompt: "What warms us?",
          options: ["The sun", "The moon", "The bread"],
          answer: "The sun",
        },
      ],
    },
  ],
};

type MathProblem = {
  display: string;
  answer: string;
  options?: string[];
  promptEs?: string;
  promptEn?: string;
};
type MathLesson = {
  es: string;
  en: string;
  skillEs: string;
  skillEn: string;
  icon: string;
  problems: MathProblem[];
};
const mathProblems = (
  items: Array<[string, number | string, string[]?]>,
): MathProblem[] =>
  items.map(([display, answer, options]) => ({
    display,
    answer: String(answer),
    options,
  }));
const mathLessons: MathLesson[] = [
  {
    es: "El concepto de juntar",
    en: "The idea of joining",
    skillEs: "Suma concreta",
    skillEn: "Concrete addition",
    icon: "🧱",
    problems: mathProblems([
      ["2 + 3", 5],
      ["1 + 4", 5],
      ["3 + 2", 5],
      ["4 + 3", 7],
      ["2 + 6", 8],
    ]),
  },
  {
    es: "El concepto de quitar",
    en: "The idea of taking away",
    skillEs: "Resta concreta",
    skillEn: "Concrete subtraction",
    icon: "👾",
    problems: mathProblems([
      ["6 − 2", 4],
      ["5 − 1", 4],
      ["7 − 3", 4],
      ["8 − 2", 6],
      ["9 − 4", 5],
    ]),
  },
  {
    es: "La recta numérica",
    en: "The number line",
    skillEs: "Avanzar y retroceder",
    skillEn: "Move forward and backward",
    icon: "🐸",
    problems: mathProblems([
      ["3 → +2", 5],
      ["6 → −3", 3],
      ["4 → +4", 8],
      ["9 → −2", 7],
      ["5 → +3", 8],
    ]),
  },
  {
    es: "Amigos del 10",
    en: "Friends of 10",
    skillEs: "Parejas que forman diez",
    skillEn: "Pairs that make ten",
    icon: "🌈",
    problems: mathProblems([
      ["3 + ? = 10", 7],
      ["1 + ? = 10", 9],
      ["6 + ? = 10", 4],
      ["8 + ? = 10", 2],
      ["5 + ? = 10", 5],
    ]),
  },
  {
    es: "Sumar con cero",
    en: "Adding zero",
    skillEs: "El valor no cambia",
    skillEn: "The value stays the same",
    icon: "📦",
    problems: mathProblems([
      ["4 + 0", 4],
      ["0 + 7", 7],
      ["9 + 0", 9],
      ["0 + 3", 3],
      ["6 + 0", 6],
    ]),
  },
  {
    es: "Restar hasta cero",
    en: "Subtracting to zero",
    skillEs: "Cuenta regresiva",
    skillEn: "Countdown",
    icon: "🚀",
    problems: mathProblems([
      ["5 − 5", 0],
      ["4 − 4", 0],
      ["7 − 7", 0],
      ["9 − 9", 0],
      ["3 − 3", 0],
    ]),
  },
  {
    es: "La suma se puede girar",
    en: "Addition can turn around",
    skillEs: "Propiedad conmutativa",
    skillEn: "Commutative property",
    icon: "⚖️",
    problems: mathProblems([
      ["3 + 2 = 2 + ?", 3],
      ["4 + 1 = 1 + ?", 4],
      ["6 + 2 = 2 + ?", 6],
      ["5 + 3 = 3 + ?", 5],
      ["7 + 1 = 1 + ?", 7],
    ]),
  },
  {
    es: "Dobles",
    en: "Doubles",
    skillEs: "Sumar el mismo número",
    skillEn: "Add the same number",
    icon: "🪞",
    problems: mathProblems([
      ["2 + 2", 4],
      ["3 + 3", 6],
      ["4 + 4", 8],
      ["5 + 5", 10],
      ["6 + 6", 12],
    ]),
  },
  {
    es: "Casi dobles",
    en: "Near doubles",
    skillEs: "Doble más uno",
    skillEn: "Double plus one",
    icon: "👯",
    problems: mathProblems([
      ["4 + 5", 9],
      ["6 + 7", 13],
      ["3 + 4", 7],
      ["8 + 9", 17],
      ["5 + 6", 11],
    ]),
  },
  {
    es: "Sumas cruzando la decena",
    en: "Adding across ten",
    skillEs: "Completar diez",
    skillEn: "Make ten first",
    icon: "🚗",
    problems: mathProblems([
      ["8 + 5", 13],
      ["9 + 4", 13],
      ["7 + 6", 13],
      ["8 + 7", 15],
      ["9 + 8", 17],
    ]),
  },
  {
    es: "Restar pasando por diez",
    en: "Subtracting across ten",
    skillEs: "Romper la decena",
    skillEn: "Break apart ten",
    icon: "🗼",
    problems: mathProblems([
      ["13 − 5", 8],
      ["12 − 4", 8],
      ["15 − 7", 8],
      ["14 − 6", 8],
      ["17 − 9", 8],
    ]),
  },
  {
    es: "Suma de dos dígitos",
    en: "Two-digit addition",
    skillEs: "Sin llevar",
    skillEn: "Without regrouping",
    icon: "🧮",
    problems: mathProblems([
      ["21 + 13", 34],
      ["32 + 16", 48],
      ["43 + 25", 68],
      ["12 + 27", 39],
      ["51 + 18", 69],
    ]),
  },
  {
    es: "Resta de dos dígitos",
    en: "Two-digit subtraction",
    skillEs: "Sin prestar",
    skillEn: "Without borrowing",
    icon: "🏦",
    problems: mathProblems([
      ["46 − 23", 23],
      ["58 − 17", 41],
      ["79 − 35", 44],
      ["64 − 22", 42],
      ["87 − 46", 41],
    ]),
  },
  {
    es: "La fábrica de decenas",
    en: "The tens factory",
    skillEs: "Suma llevando",
    skillEn: "Addition with regrouping",
    icon: "🏭",
    problems: mathProblems([
      ["28 + 17", 45],
      ["36 + 29", 65],
      ["47 + 18", 65],
      ["59 + 24", 83],
      ["68 + 27", 95],
    ]),
  },
  {
    es: "Desarmando el atado",
    en: "Unbundling a ten",
    skillEs: "Resta prestando",
    skillEn: "Subtraction with borrowing",
    icon: "🎋",
    problems: mathProblems([
      ["42 − 18", 24],
      ["53 − 27", 26],
      ["61 − 35", 26],
      ["74 − 48", 26],
      ["82 − 56", 26],
    ]),
  },
  {
    es: "Familias de operaciones",
    en: "Fact families",
    skillEs: "Sumas y restas relacionadas",
    skillEn: "Related addition and subtraction",
    icon: "🔺",
    problems: mathProblems([
      ["3 + 7", 10],
      ["10 − 7", 3],
      ["4 + 6", 10],
      ["10 − 4", 6],
      ["12 − 5", 7],
    ]),
  },
  {
    es: "Detectives de palabras",
    en: "Word detectives",
    skillEs: "Problemas verbales",
    skillEn: "Word problems",
    icon: "🕵️",
    problems: mathProblems([
      ["Lumi tenía 5 estrellas y ganó 3. ¿Cuántas tiene?", 8],
      ["Había 9 globos y se fueron 4. ¿Cuántos quedan?", 5],
      ["Ana juntó 6 flores y luego 2 más.", 8],
      ["Tomás tenía 10 fichas y regaló 3.", 7],
      ["Hay 7 aves y llegan 5 más.", 12],
    ]),
  },
  {
    es: "El gran mercado",
    en: "The big market",
    skillEs: "Cálculo mental y repaso",
    skillEn: "Mental math review",
    icon: "🛒",
    problems: mathProblems([
      ["Pan 4 Bs + leche 6 Bs", 10],
      ["Pago 20 Bs por algo de 13 Bs. Cambio:", 7],
      ["2 jugos de 5 Bs", 10],
      ["Tengo 15 Bs y gasto 8 Bs", 7],
      ["3 frutas de 4 Bs", 12],
    ]),
  },
  {
    es: "El tren de cargas",
    en: "The cargo train",
    skillEs: "Multiplicación como suma repetida",
    skillEn: "Multiplication as repeated addition",
    icon: "🚂",
    problems: mathProblems([
      ["3 + 3 + 3 + 3", 12],
      ["2 + 2 + 2", 6],
      ["5 + 5 + 5", 15],
      ["4 + 4", 8],
      ["6 + 6 + 6", 18],
    ]),
  },
  {
    es: "Sembrando el huerto",
    en: "Planting the garden",
    skillEs: "Filas y columnas",
    skillEn: "Rows and columns",
    icon: "🌱",
    problems: mathProblems([
      ["3 filas × 4 columnas", 12],
      ["2 filas × 5 columnas", 10],
      ["4 filas × 3 columnas", 12],
      ["5 filas × 2 columnas", 10],
      ["3 filas × 6 columnas", 18],
    ]),
  },
  {
    es: "La tabla del 2",
    en: "The 2 times table",
    skillEs: "El doble de las cosas",
    skillEn: "Double everything",
    icon: "👟",
    problems: mathProblems([
      ["2 × 3", 6],
      ["2 × 5", 10],
      ["2 × 7", 14],
      ["2 × 9", 18],
      ["2 × 10", 20],
    ]),
  },
  {
    es: "La tabla del 5",
    en: "The 5 times table",
    skillEs: "Reloj y dedos",
    skillEn: "Clock and fingers",
    icon: "✋",
    problems: mathProblems([
      ["5 × 2", 10],
      ["5 × 4", 20],
      ["5 × 6", 30],
      ["5 × 8", 40],
      ["5 × 10", 50],
    ]),
  },
  {
    es: "La tabla del 10",
    en: "The 10 times table",
    skillEs: "El truco del cero",
    skillEn: "The zero trick",
    icon: "🔟",
    problems: mathProblems([
      ["10 × 2", 20],
      ["10 × 4", 40],
      ["10 × 7", 70],
      ["10 × 9", 90],
      ["10 × 12", 120],
    ]),
  },
  {
    es: "Girar la galleta",
    en: "Turn the cookie",
    skillEs: "Propiedad conmutativa",
    skillEn: "Commutative property",
    icon: "🍪",
    problems: mathProblems([
      ["2 × 5 = 5 × ?", 2],
      ["3 × 4 = 4 × ?", 3],
      ["6 × 2 = 2 × ?", 6],
      ["7 × 3 = 3 × ?", 7],
      ["8 × 4 = 4 × ?", 8],
    ]),
  },
  {
    es: "Tablas del 3 y 4",
    en: "The 3 and 4 tables",
    skillEs: "Saltos con ritmo",
    skillEn: "Rhythmic skip counting",
    icon: "🎵",
    problems: mathProblems([
      ["3 × 4", 12],
      ["4 × 5", 20],
      ["3 × 7", 21],
      ["4 × 8", 32],
      ["3 × 9", 27],
    ]),
  },
  {
    es: "Tablas del 6 y 7",
    en: "The 6 and 7 tables",
    skillEs: "Descomponer para resolver",
    skillEn: "Break apart to solve",
    icon: "🧱",
    problems: mathProblems([
      ["6 × 4", 24],
      ["7 × 3", 21],
      ["6 × 7", 42],
      ["7 × 8", 56],
      ["6 × 9", 54],
    ]),
  },
  {
    es: "Tablas del 8 y 9",
    en: "The 8 and 9 tables",
    skillEs: "Trucos visuales",
    skillEn: "Visual strategies",
    icon: "👐",
    problems: mathProblems([
      ["8 × 4", 32],
      ["9 × 3", 27],
      ["8 × 7", 56],
      ["9 × 8", 72],
      ["9 × 9", 81],
    ]),
  },
  {
    es: "El cero y el uno",
    en: "Zero and one",
    skillEs: "Multiplicar por 0 y 1",
    skillEn: "Multiply by 0 and 1",
    icon: "🕳️",
    problems: mathProblems([
      ["5 × 0", 0],
      ["7 × 1", 7],
      ["0 × 9", 0],
      ["1 × 12", 12],
      ["8 × 0", 0],
    ]),
  },
  {
    es: "Repartiendo caramelos",
    en: "Sharing candy",
    skillEs: "División equitativa",
    skillEn: "Equal sharing",
    icon: "🍬",
    problems: mathProblems([
      ["12 ÷ 3", 4],
      ["10 ÷ 2", 5],
      ["15 ÷ 5", 3],
      ["18 ÷ 6", 3],
      ["20 ÷ 4", 5],
    ]),
  },
  {
    es: "Empacando galletas",
    en: "Packing cookies",
    skillEs: "División como agrupación",
    skillEn: "Division by grouping",
    icon: "📦",
    problems: mathProblems([
      ["15 en grupos de 5", 3],
      ["12 en grupos de 3", 4],
      ["18 en grupos de 6", 3],
      ["20 en grupos de 4", 5],
      ["24 en grupos de 8", 3],
    ]),
  },
  {
    es: "La familia de factores",
    en: "The factor family",
    skillEs: "Multiplicar y dividir",
    skillEn: "Multiply and divide",
    icon: "👨‍👩‍👧",
    problems: mathProblems([
      ["4 × 5", 20],
      ["20 ÷ 5", 4],
      ["20 ÷ 4", 5],
      ["3 × 6", 18],
      ["18 ÷ 3", 6],
    ]),
  },
  {
    es: "Lo que sobra",
    en: "What is left over",
    skillEs: "División con residuo",
    skillEn: "Division with remainders",
    icon: "🎂",
    problems: mathProblems([
      ["11 ÷ 3 · sobra", 2],
      ["14 ÷ 4 · sobra", 2],
      ["17 ÷ 5 · sobra", 2],
      ["10 ÷ 3 · sobra", 1],
      ["19 ÷ 6 · sobra", 1],
    ]),
  },
  {
    es: "Cero y uno al dividir",
    en: "Zero and one in division",
    skillEs: "Reglas especiales",
    skillEn: "Special rules",
    icon: "🚫",
    problems: mathProblems([
      ["10 ÷ 1", 10],
      ["0 ÷ 5", 0],
      ["7 ÷ 1", 7],
      ["5 ÷ 0", "No se puede"],
      ["0 ÷ 9", 0],
    ]),
  },
  {
    es: "El súper escalador",
    en: "The super climber",
    skillEs: "Multiplicar por decenas",
    skillEn: "Multiply by tens",
    icon: "🧗",
    problems: mathProblems([
      ["3 × 20", 60],
      ["4 × 30", 120],
      ["6 × 40", 240],
      ["5 × 50", 250],
      ["8 × 20", 160],
    ]),
  },
  {
    es: "Historias de dos pasos",
    en: "Two-step stories",
    skillEs: "Multiplicar y después sumar o restar",
    skillEn: "Multiply then add or subtract",
    icon: "📚",
    problems: mathProblems([
      ["3 cajas × 4 lápices − 2", 10],
      ["2 bolsas × 5 frutas + 3", 13],
      ["4 mesas × 3 niños − 1", 11],
      ["5 platos × 2 panes + 4", 14],
      ["3 equipos × 6 puntos − 5", 13],
    ]),
  },
  {
    es: "El restaurante matemático",
    en: "The math restaurant",
    skillEs: "Proyecto final",
    skillEn: "Final project",
    icon: "🍽️",
    problems: mathProblems([
      ["3 jugos de 4 Bs", 12],
      ["2 platos de 15 Bs", 30],
      ["Cuenta de 24 Bs entre 3", 8],
      ["4 postres de 6 Bs", 24],
      ["Cuenta de 40 Bs entre 5", 8],
    ]),
  },
];

function mathOptions(problem: MathProblem, language: "es" | "en") {
  if (problem.options) return problem.options;
  const value = Number(problem.answer);
  if (Number.isNaN(value))
    return [language === "es" ? "No se puede" : "Cannot divide", "0", "5"];
  const candidates = [
    String(value),
    String(value + 1),
    String(Math.max(0, value - 2)),
    String(value + 3),
  ];
  return [...new Set(candidates)].slice(0, 3);
}

type EnglishWord = { word: string; meaning: string; icon: string };
type EnglishLesson = {
  title: string;
  module: number;
  moduleEs: string;
  moduleEn: string;
  mechanicEs: string;
  mechanicEn: string;
  words: EnglishWord[];
};
const ew = (items: Array<[string, string, string]>): EnglishWord[] =>
  items.map(([word, meaning, icon]) => ({ word, meaning, icon }));
const englishLessons: EnglishLesson[] = [
  {
    title: "Hello & Goodbye",
    module: 1,
    moduleEs: "Mis primeras palabras y emociones",
    moduleEn: "My first words and emotions",
    mechanicEs: "Saluda a quienes llegan y despídete de quienes se van.",
    mechanicEn: "Greet characters who arrive and say goodbye when they leave.",
    words: ew([
      ["Hello", "Hola", "👋"],
      ["Hi", "Hola", "😊"],
      ["Goodbye", "Adiós", "🚪"],
      ["Bye", "Chau", "🙋"],
    ]),
  },
  {
    title: "How Are You Today?",
    module: 1,
    moduleEs: "Mis primeras palabras y emociones",
    moduleEn: "My first words and emotions",
    mechanicEs: "Reconoce la emoción y forma una frase: I am happy.",
    mechanicEn: "Recognize the emotion and build a sentence: I am happy.",
    words: ew([
      ["Happy", "Feliz", "😊"],
      ["Sad", "Triste", "😢"],
      ["Angry", "Enojado", "😠"],
      ["Tired", "Cansado", "🥱"],
    ]),
  },
  {
    title: "Numbers 1 to 5",
    module: 1,
    moduleEs: "Mis primeras palabras y emociones",
    moduleEn: "My first words and emotions",
    mechanicEs: "Escucha el número y cuenta la cantidad correcta de globos.",
    mechanicEn: "Hear the number and count the correct number of balloons.",
    words: ew([
      ["One", "Uno", "🎈"],
      ["Two", "Dos", "🎈🎈"],
      ["Three", "Tres", "🎈🎈🎈"],
      ["Four", "Cuatro", "4️⃣"],
      ["Five", "Cinco", "5️⃣"],
    ]),
  },
  {
    title: "Primary Colors",
    module: 1,
    moduleEs: "Mis primeras palabras y emociones",
    moduleEn: "My first words and emotions",
    mechanicEs: "Escucha el color y elige la pintura correcta.",
    mechanicEn: "Hear the color and choose the correct paint.",
    words: ew([
      ["Red", "Rojo", "🔴"],
      ["Blue", "Azul", "🔵"],
      ["Yellow", "Amarillo", "🟡"],
      ["Green", "Verde", "🟢"],
    ]),
  },
  {
    title: "Body Parts",
    module: 2,
    moduleEs: "Mi cuerpo y mi entorno",
    moduleEn: "My body and my surroundings",
    mechanicEs: "Arma el robot eligiendo la parte del cuerpo indicada.",
    mechanicEn: "Build the robot by choosing the requested body part.",
    words: ew([
      ["Head", "Cabeza", "🙂"],
      ["Eyes", "Ojos", "👀"],
      ["Ears", "Orejas", "👂"],
      ["Nose", "Nariz", "👃"],
      ["Mouth", "Boca", "👄"],
    ]),
  },
  {
    title: "Family Members",
    module: 2,
    moduleEs: "Mi cuerpo y mi entorno",
    moduleEn: "My body and my surroundings",
    mechanicEs: "Completa el árbol familiar con cada personaje.",
    mechanicEn: "Complete the family tree with each person.",
    words: ew([
      ["Mom", "Mamá", "👩"],
      ["Dad", "Papá", "👨"],
      ["Brother", "Hermano", "👦"],
      ["Sister", "Hermana", "👧"],
      ["Baby", "Bebé", "👶"],
    ]),
  },
  {
    title: "Classroom Objects",
    module: 2,
    moduleEs: "Mi cuerpo y mi entorno",
    moduleEn: "My body and my surroundings",
    mechanicEs: "Encuentra el objeto y guárdalo en la mochila mágica.",
    mechanicEn: "Find the object and place it in the magic backpack.",
    words: ew([
      ["Pencil", "Lápiz", "✏️"],
      ["Book", "Libro", "📘"],
      ["Chair", "Silla", "🪑"],
      ["Bag", "Mochila", "🎒"],
    ]),
  },
  {
    title: "Numbers 6 to 10",
    module: 2,
    moduleEs: "Mi cuerpo y mi entorno",
    moduleEn: "My body and my surroundings",
    mechanicEs: "Relaciona el número escrito con su pronunciación.",
    mechanicEn: "Match the written number to its pronunciation.",
    words: ew([
      ["Six", "Seis", "6️⃣"],
      ["Seven", "Siete", "7️⃣"],
      ["Eight", "Ocho", "8️⃣"],
      ["Nine", "Nueve", "9️⃣"],
      ["Ten", "Diez", "🔟"],
    ]),
  },
  {
    title: "Farm Animals",
    module: 3,
    moduleEs: "Animales y comida",
    moduleEn: "Animals and food",
    mechanicEs: "Escucha el sonido y abre la puerta del animal correcto.",
    mechanicEn: "Hear the sound and open the correct animal's door.",
    words: ew([
      ["Cow", "Vaca", "🐄"],
      ["Dog", "Perro", "🐶"],
      ["Cat", "Gato", "🐱"],
      ["Duck", "Pato", "🦆"],
      ["Pig", "Cerdo", "🐷"],
    ]),
  },
  {
    title: "Fruits",
    module: 3,
    moduleEs: "Animales y comida",
    moduleEn: "Animals and food",
    mechanicEs: "Atrapa solamente la fruta que Lumi pronuncia.",
    mechanicEn: "Catch only the fruit Lumi says.",
    words: ew([
      ["Apple", "Manzana", "🍎"],
      ["Banana", "Plátano", "🍌"],
      ["Orange", "Naranja", "🍊"],
      ["Grape", "Uva", "🍇"],
    ]),
  },
  {
    title: "Food & Preferences",
    module: 3,
    moduleEs: "Animales y comida",
    moduleEn: "Animals and food",
    mechanicEs: "Alimenta a la mascota y expresa lo que te gusta.",
    mechanicEn: "Feed the pet and say what you like.",
    words: ew([
      ["Pizza", "Pizza", "🍕"],
      ["Milk", "Leche", "🥛"],
      ["Water", "Agua", "💧"],
      ["Bread", "Pan", "🍞"],
      ["I like", "Me gusta", "😋"],
    ]),
  },
  {
    title: "Wild Animals",
    module: 3,
    moduleEs: "Animales y comida",
    moduleEn: "Animals and food",
    mechanicEs: "Encuentra los animales ocultos en el safari.",
    mechanicEn: "Find the hidden animals on safari.",
    words: ew([
      ["Lion", "León", "🦁"],
      ["Elephant", "Elefante", "🐘"],
      ["Monkey", "Mono", "🐒"],
      ["Bird", "Ave", "🐦"],
    ]),
  },
  {
    title: "Basic Shapes",
    module: 4,
    moduleEs: "Mi mundo diario",
    moduleEn: "My everyday world",
    mechanicEs: "Sigue la forma y reconoce su nombre en inglés.",
    mechanicEn: "Trace the shape and recognize its English name.",
    words: ew([
      ["Circle", "Círculo", "⚪"],
      ["Square", "Cuadrado", "⬜"],
      ["Triangle", "Triángulo", "🔺"],
      ["Star", "Estrella", "⭐"],
    ]),
  },
  {
    title: "Weather & Nature",
    module: 4,
    moduleEs: "Mi mundo diario",
    moduleEn: "My everyday world",
    mechanicEs: "Cambia el clima del paisaje según la instrucción.",
    mechanicEn: "Change the landscape weather by following the instruction.",
    words: ew([
      ["Sunny", "Soleado", "☀️"],
      ["Rainy", "Lluvioso", "🌧️"],
      ["Windy", "Ventoso", "💨"],
      ["Cold", "Frío", "🥶"],
      ["Hot", "Caluroso", "🥵"],
    ]),
  },
  {
    title: "Clothes",
    module: 4,
    moduleEs: "Mi mundo diario",
    moduleEn: "My everyday world",
    mechanicEs: "Viste al personaje con la prenda indicada.",
    mechanicEn: "Dress the character with the requested item.",
    words: ew([
      ["Shirt", "Camisa", "👕"],
      ["Pants", "Pantalones", "👖"],
      ["Shoes", "Zapatos", "👟"],
      ["Hat", "Sombrero", "🧢"],
    ]),
  },
  {
    title: "Action Verbs",
    module: 5,
    moduleEs: "Acción y consolidación",
    moduleEn: "Action and consolidation",
    mechanicEs: "Elige el verbo para mover al personaje.",
    mechanicEn: "Choose the verb to move the character.",
    words: ew([
      ["Run", "Correr", "🏃"],
      ["Jump", "Saltar", "🤸"],
      ["Dance", "Bailar", "💃"],
      ["Sleep", "Dormir", "😴"],
    ]),
  },
  {
    title: "Parts of the House",
    module: 5,
    moduleEs: "Acción y consolidación",
    moduleEn: "Action and consolidation",
    mechanicEs: "Abre las puertas y explora cada habitación.",
    mechanicEn: "Open the doors and explore each room.",
    words: ew([
      ["Bedroom", "Dormitorio", "🛏️"],
      ["Kitchen", "Cocina", "🍳"],
      ["Bathroom", "Baño", "🛁"],
      ["Living room", "Sala", "🛋️"],
    ]),
  },
  {
    title: "Ultimate Review Challenge",
    module: 5,
    moduleEs: "Acción y consolidación",
    moduleEn: "Action and consolidation",
    mechanicEs: "Supera cinco estaciones y consigue tu diploma LumiEnglish.",
    mechanicEn: "Complete five stations and earn your LumiEnglish diploma.",
    words: ew([
      ["Hello", "Hola", "👋"],
      ["Happy", "Feliz", "😊"],
      ["Apple", "Manzana", "🍎"],
      ["Lion", "León", "🦁"],
      ["Jump", "Saltar", "🤸"],
    ]),
  },
];

function englishChoices(lesson: EnglishLesson, word: EnglishWord) {
  const choices = [
    word,
    ...lesson.words.filter((item) => item.word !== word.word).slice(0, 2),
  ];
  return choices.sort(
    (a, b) =>
      ((a.word.length + word.word.length) % 3) -
      ((b.word.length + word.word.length) % 3),
  );
}

function readingPicture(word: string) {
  const pictures: Record<string, string> = {
    mono: "🐒",
    pan: "🍞",
    mapa: "🗺️",
    pelota: "⚽",
    mano: "✋",
    papá: "👨",
    pollo: "🐥",
    mesa: "🪑",
    puerta: "🚪",
    sol: "☀️",
    luna: "🌙",
    sapo: "🐸",
    silla: "🪑",
    loro: "🦜",
    lápiz: "✏️",
    libro: "📘",
    perro: "🐶",
    gato: "🐱",
    pato: "🦆",
    casa: "🏠",
    nido: "🪺",
    dado: "🎲",
    nube: "☁️",
    dedo: "☝️",
    nariz: "👃",
    rosa: "🌹",
    cama: "🛏️",
    ratón: "🐭",
    coco: "🥥",
    cohete: "🚀",
    monkey: "🐒",
    bread: "🍞",
    map: "🗺️",
    ball: "⚽",
    hand: "✋",
    dad: "👨",
    chicken: "🐥",
    table: "🪑",
    door: "🚪",
    sun: "☀️",
    moon: "🌙",
    frog: "🐸",
    chair: "🪑",
    parrot: "🦜",
    pencil: "✏️",
    book: "📘",
    dog: "🐶",
    cat: "🐱",
    duck: "🦆",
    house: "🏠",
    nest: "🪺",
    dice: "🎲",
    cloud: "☁️",
    finger: "☝️",
    nose: "👃",
    rose: "🌹",
    bed: "🛏️",
    mouse: "🐭",
    coconut: "🥥",
    rocket: "🚀",
  };
  return pictures[word.toLowerCase()] || "🖼️";
}

type FingerId =
  | "l-pinky"
  | "l-ring"
  | "l-middle"
  | "l-index"
  | "thumb"
  | "r-index"
  | "r-middle"
  | "r-ring"
  | "r-pinky";

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
  const [curriculumSearch, setCurriculumSearch] = useState("");
  const [quickSubject, setQuickSubject] = useState<
    "typing" | "reading" | "math" | "english"
  >("typing");
  const [quickRound, setQuickRound] = useState(0);
  const [quickFeedback, setQuickFeedback] = useState("");
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
  const [courseResult, setCourseResult] = useState<{
    passed: boolean;
    accuracy: number;
    stars: number;
    wpm?: number;
  } | null>(null);
  const [courseStartedAt, setCourseStartedAt] = useState<number | null>(null);
  const [courseElapsedSeconds, setCourseElapsedSeconds] = useState(0);
  const [pressedFinger, setPressedFinger] = useState<FingerId | null>(null);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("8");
  const [childAvatar, setChildAvatar] = useState("🌟");
  const [childGradeBand, setChildGradeBand] = useState<"primary" | "secondary">(
    "primary",
  );
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
  const [mathOpen, setMathOpen] = useState(false);
  const [mathAssessmentIndex, setMathAssessmentIndex] = useState(0);
  const [mathAssessmentScore, setMathAssessmentScore] = useState(0);
  const [mathLesson, setMathLesson] = useState<number | null>(null);
  const [mathExercise, setMathExercise] = useState(0);
  const [mathLessonDone, setMathLessonDone] = useState(false);
  const [mathFeedback, setMathFeedback] = useState("");
  const [mathBusy, setMathBusy] = useState(false);
  const [englishOpen, setEnglishOpen] = useState(false);
  const [englishAssessmentIndex, setEnglishAssessmentIndex] = useState(0);
  const [englishAssessmentScore, setEnglishAssessmentScore] = useState(0);
  const [englishLesson, setEnglishLesson] = useState<number | null>(null);
  const [englishStep, setEnglishStep] = useState(0);
  const [englishLessonDone, setEnglishLessonDone] = useState(false);
  const [englishFeedback, setEnglishFeedback] = useState("");
  const [englishBusy, setEnglishBusy] = useState(false);
  const [englishListening, setEnglishListening] = useState(false);
  const [historyLessons, setHistoryLessons] = useState<HistoryLesson[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLesson, setHistoryLesson] = useState<HistoryLesson | null>(
    null,
  );
  const [historyQuestion, setHistoryQuestion] = useState(0);
  const [historyScore, setHistoryScore] = useState(0);
  const [historyFeedback, setHistoryFeedback] = useState("");
  const [historyDone, setHistoryDone] = useState(false);
  const [purchases, setPurchases] = useState<CoursePurchase[]>([]);
  const [purchaseLesson, setPurchaseLesson] = useState<HistoryLesson | null>(null);
  const [purchaseChildId, setPurchaseChildId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qr">("qr");
  const [purchaseMessage, setPurchaseMessage] = useState("");
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [creatorRole, setCreatorRole] = useState<"owner" | "teacher" | null>(
    null,
  );
  const [courseCreators, setCourseCreators] = useState<CourseCreator[]>([]);
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [adminEditingId, setAdminEditingId] = useState<string | null>(null);
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  const [historyDraft, setHistoryDraft] = useState<HistoryLesson>({
    ...sampleHistoryLesson,
    id: "",
    youtubeUrl: "",
    published: false,
  });
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastFunnyErrorRef = useRef(0);
  const t = copy[lang];
  const target = lang === "es" ? "asdf jklñ" : "asdf jkl;";
  const current = target[typed] ?? "";
  const accuracy =
    typed + mistakes === 0
      ? 100
      : Math.round((typed / (typed + mistakes)) * 100);
  const worlds = ["classroom", "space", "ocean"];
  const isAdmin =
    !!account?.email && ADMIN_EMAILS.includes(account.email.toLowerCase());
  const isCourseCreator = isAdmin || creatorRole === "teacher";
  const visibleHistoryLessons = historyLessons.filter(
    (lesson) =>
      lesson.published &&
      (!activeChild ||
        lesson.level === "both" ||
        lesson.level === activeChild.gradeBand),
  );
  const editableHistoryLessons = historyLessons.filter(
    (lesson) => isAdmin || lesson.creatorEmail === account?.email?.toLowerCase(),
  );
  const confirmedCourseIds = new Set(
    purchases
      .filter(
        (purchase) =>
          purchase.status === "confirmed" &&
          (!activeChild || purchase.childId === activeChild.id),
      )
      .map((purchase) => purchase.courseId),
  );
  const reportTotals = purchases.reduce(
    (totals, purchase) => {
      if (purchase.status === "confirmed") {
        totals.sales += purchase.price;
        totals.platform += purchase.platformAmount;
        totals.teachers += purchase.teacherAmount;
      }
      if (purchase.status === "pending") totals.pending += 1;
      return totals;
    },
    { sales: 0, platform: 0, teachers: 0, pending: 0 },
  );
  const quickChallenges = {
    reading:
      lang === "es"
        ? [
            {
              prompt: "¿Cuál palabra corresponde a 🐶?",
              options: ["perro", "gato", "pato"],
              answer: "perro",
            },
            {
              prompt: "Completa: 🏠 es una…",
              options: ["casa", "mesa", "masa"],
              answer: "casa",
            },
          ]
        : [
            {
              prompt: "Which word matches 🐶?",
              options: ["dog", "cat", "duck"],
              answer: "dog",
            },
            {
              prompt: "Complete: 🏠 is a…",
              options: ["house", "mouse", "horse"],
              answer: "house",
            },
          ],
    math:
      lang === "es"
        ? [
            {
              prompt: "¿Cuánto es 7 + 5?",
              options: ["10", "12", "14"],
              answer: "12",
            },
            {
              prompt: "¿Cuánto es 15 − 6?",
              options: ["8", "9", "11"],
              answer: "9",
            },
          ]
        : [
            {
              prompt: "What is 7 + 5?",
              options: ["10", "12", "14"],
              answer: "12",
            },
            {
              prompt: "What is 15 − 6?",
              options: ["8", "9", "11"],
              answer: "9",
            },
          ],
    english:
      lang === "es"
        ? [
            {
              prompt: "¿Qué significa “apple”?",
              options: ["Manzana 🍎", "Naranja 🍊", "Uva 🍇"],
              answer: "Manzana 🍎",
            },
            {
              prompt: "¿Qué significa “happy”?",
              options: ["Feliz 😊", "Triste 😢", "Cansado 😴"],
              answer: "Feliz 😊",
            },
          ]
        : [
            {
              prompt: "Choose the picture for “apple”",
              options: ["Apple 🍎", "Orange 🍊", "Grape 🍇"],
              answer: "Apple 🍎",
            },
            {
              prompt: "Choose the face for “happy”",
              options: ["Happy 😊", "Sad 😢", "Tired 😴"],
              answer: "Happy 😊",
            },
          ],
  };

  useEffect(
    () =>
      onAuthStateChanged(auth, async (currentAccount) => {
        setAccount(currentAccount);
        if (currentAccount) {
          await loadCreatorRole(currentAccount);
          await loadChildren(currentAccount.uid);
          await loadHistoryLessons();
          await loadPurchases(currentAccount);
        } else {
          setChildren([]);
          setFamilyOpen(false);
          setActiveChild(null);
          setCreatorRole(null);
          setAdminOpen(false);
          setPurchases([]);
          await loadHistoryLessons();
        }
      }),
    [],
  );

  useEffect(() => {
    if (!courseResult || !courseLesson || courseBusy) return;
    const advanceWithEnter = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      if (courseResult.passed && courseLesson < 18)
        startCourseLesson(courseLesson + 1);
      else startCourseLesson(courseLesson, !courseResult.passed);
    };
    window.addEventListener("keydown", advanceWithEnter);
    return () => window.removeEventListener("keydown", advanceWithEnter);
  }, [courseResult, courseLesson, courseBusy]);

  useEffect(() => {
    if (courseLesson !== 18 || courseResult || !courseStartedAt) return;
    const timer = window.setInterval(
      () =>
        setCourseElapsedSeconds(
          Math.max(1, Math.floor((Date.now() - courseStartedAt) / 1000)),
        ),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [courseLesson, courseResult, courseStartedAt]);

  useEffect(() => {
    if (!readingOpen || readingStage >= 7) return;
    const timer = window.setInterval(
      () => setReadingSeconds((seconds) => Math.min(300, seconds + 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [readingOpen, readingStage]);

  async function loadChildren(uid: string) {
    const snapshot = await getDocs(
      query(
        collection(db, "parents", uid, "children"),
        orderBy("createdAt", "asc"),
      ),
    );
    setChildren(
      snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      })) as ChildProfile[],
    );
  }

  async function loadPurchases(user = auth.currentUser) {
    if (!user?.email) return setPurchases([]);
    const email = user.email.toLowerCase();
    let purchasesQuery;
    if (ADMIN_EMAILS.includes(email)) {
      purchasesQuery = query(collection(db, "coursePurchases"));
    } else {
      const creator = await getDoc(doc(db, "courseCreators", email));
      purchasesQuery = creator.exists() && creator.data().active === true
        ? query(collection(db, "coursePurchases"), where("teacherEmail", "==", email))
        : query(collection(db, "coursePurchases"), where("buyerId", "==", user.uid));
    }
    const snapshot = await getDocs(purchasesQuery);
    setPurchases(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as CoursePurchase[]);
  }

  async function loadHistoryLessons() {
    const lessonsRef = collection(db, "courses", "history-culture", "lessons");
    const email = auth.currentUser?.email?.toLowerCase() || "";
    const admin = ADMIN_EMAILS.includes(email);
    const creatorDoc =
      email && !admin ? await getDoc(doc(db, "courseCreators", email)) : null;
    const creator = !!creatorDoc?.exists() && creatorDoc.data().active === true;
    if (admin) {
      const snapshot = await getDocs(query(lessonsRef, orderBy("order", "asc")));
      setHistoryLessons(snapshot.docs.map((item) => normalizeHistoryLesson(item.id, item.data())).sort((a, b) => a.order - b.order));
      return;
    }
    const publishedSnapshot = await getDocs(query(lessonsRef, where("published", "==", true)));
    const ownSnapshot = creator ? await getDocs(query(lessonsRef, where("creatorEmail", "==", email))) : null;
    const lessons = new Map<string, HistoryLesson>();
    publishedSnapshot.docs.forEach((item) => lessons.set(item.id, normalizeHistoryLesson(item.id, item.data())));
    ownSnapshot?.docs.forEach((item) => lessons.set(item.id, normalizeHistoryLesson(item.id, item.data())));
    setHistoryLessons([...lessons.values()].sort((a, b) => a.order - b.order));
  }

  function normalizeHistoryLesson(
    id: string,
    data: Record<string, unknown>,
  ): HistoryLesson {
    const rawQuestions = Array.isArray(data.questions) ? data.questions : [];
    const questions = rawQuestions
      .map((item) => {
        const q = (item || {}) as Partial<HistoryQuestion>;
        return {
          question: String(q.question || ""),
          options: Array.isArray(q.options) ? q.options.map(String) : [],
          answer: Number.isInteger(q.answer) ? Number(q.answer) : 0,
          explanation: String(q.explanation || ""),
        };
      })
      .filter((q) => q.question && q.options.length >= 2);
    return {
      id,
      order: Number(data.order) || 1,
      titleEs: String(data.titleEs || data.title || "Lección sin título"),
      titleEn: String(
        data.titleEn || data.titleEs || data.title || "Untitled lesson",
      ),
      country: String(data.country || "Historia"),
      level:
        data.level === "primary" || data.level === "secondary"
          ? data.level
          : "both",
      youtubeUrl: String(
        data.youtubeUrl || data.videoUrl || data.youtube || "",
      ),
      descriptionEs: String(data.descriptionEs || data.description || ""),
      descriptionEn: String(
        data.descriptionEn || data.descriptionEs || data.description || "",
      ),
      published: data.published === true,
      questions,
      creatorEmail: String(
        data.creatorEmail || data.updatedBy || "",
      ).toLowerCase(),
      creatorName: String(data.creatorName || "Maestro Lumi"),
      price: Math.max(0, Number(data.price) || 0),
    };
  }

  async function loadCreatorRole(user: User) {
    const email = user.email?.toLowerCase() || "";
    if (ADMIN_EMAILS.includes(email)) {
      setCreatorRole("owner");
      await loadCourseCreators();
      return;
    }
    const creator = await getDoc(doc(db, "courseCreators", email));
    setCreatorRole(
      creator.exists() && creator.data().active === true ? "teacher" : null,
    );
  }

  async function loadCourseCreators() {
    if (
      !auth.currentUser?.email ||
      !ADMIN_EMAILS.includes(auth.currentUser.email.toLowerCase())
    )
      return;
    const snapshot = await getDocs(collection(db, "courseCreators"));
    setCourseCreators(
      snapshot.docs.map((item) => item.data() as CourseCreator),
    );
  }

  function youtubeEmbed(url: string) {
    const clean = url.trim();
    const direct = /^[\w-]{11}$/.test(clean) ? clean : "";
    const match = clean.match(
      /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/i,
    );
    const id = direct || match?.[1] || "";
    return id
      ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`
      : "";
  }

  function openHistoryCourse() {
    setHistoryOpen(true);
    setHistoryLesson(null);
    setHistoryDone(false);
  }
  function startHistoryLesson(lesson: HistoryLesson) {
    setHistoryLesson(lesson);
    setHistoryQuestion(0);
    setHistoryScore(0);
    setHistoryFeedback("");
    setHistoryDone(false);
  }

  async function answerHistory(answer: number) {
    if (!historyLesson || historyFeedback) return;
    const currentQuestion = historyLesson.questions[historyQuestion];
    const correct = answer === currentQuestion.answer;
    if (correct) {
      setHistoryScore((score) => score + 1);
      playTone("correct");
    } else playTone("error");
    setHistoryFeedback(
      `${correct ? "✓" : "💡"} ${currentQuestion.explanation}`,
    );
  }

  async function nextHistoryQuestion() {
    if (!historyLesson || !activeChild || !account) return;
    if (historyQuestion < historyLesson.questions.length - 1) {
      setHistoryQuestion((value) => value + 1);
      setHistoryFeedback("");
      return;
    }
    const finalScore = historyScore + (historyFeedback.startsWith("✓") ? 0 : 0);
    const passed =
      Math.round((finalScore / historyLesson.questions.length) * 100) >= 80;
    setHistoryDone(true);
    if (passed) {
      await updateDoc(
        doc(db, "parents", account.uid, "children", activeChild.id),
        {
          historyCompletedLessons: arrayUnion(historyLesson.id),
          stars: activeChild.stars + 2,
          lastHistoryAt: serverTimestamp(),
        },
      );
      const updated = {
        ...activeChild,
        historyCompletedLessons: [
          ...new Set([
            ...(activeChild.historyCompletedLessons || []),
            historyLesson.id,
          ]),
        ],
        stars: activeChild.stars + 2,
      };
      setActiveChild(updated);
      setChildren((profiles) =>
        profiles.map((profile) =>
          profile.id === updated.id ? updated : profile,
        ),
      );
    }
  }

  function newHistoryDraft() {
    setAdminEditingId(null);
    setHistoryDraft({
      ...sampleHistoryLesson,
      id: "",
      titleEs: "",
      titleEn: "",
      country: "",
      youtubeUrl: "",
      descriptionEs: "",
      descriptionEn: "",
      published: false,
      questions: [
        { question: "", options: ["", "", ""], answer: 0, explanation: "" },
      ],
    });
    setAdminMessage("");
  }
  function editHistoryLesson(lesson: HistoryLesson) {
    setAdminEditingId(lesson.id);
    setHistoryDraft(JSON.parse(JSON.stringify(lesson)));
    setAdminMessage("");
  }
  async function saveHistoryLesson() {
    if (
      !isCourseCreator ||
      !historyDraft.titleEs.trim() ||
      !youtubeEmbed(historyDraft.youtubeUrl) ||
      historyDraft.questions.some(
        (q) => !q.question.trim() || q.options.some((o) => !o.trim()),
      )
    ) {
      setAdminMessage(
        lang === "es"
          ? "Completa el título, un enlace válido de YouTube y todas las preguntas."
          : "Complete the title, a valid YouTube link, and every question.",
      );
      return;
    }
    setAdminBusy(true);
    try {
      const id =
        adminEditingId ||
        `${historyDraft.titleEs
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`;
      const currentEmail = account?.email?.toLowerCase() || "";
      const creatorEmail = historyDraft.creatorEmail || currentEmail;
      const creatorName = historyDraft.creatorName || account?.displayName || "Maestro Lumi";
      await setDoc(
        doc(db, "courses", "history-culture", "lessons", id),
        {
          ...historyDraft,
          id,
          creatorEmail,
          creatorName,
          updatedAt: serverTimestamp(),
          updatedBy: currentEmail,
        },
        { merge: true },
      );
      await loadHistoryLessons();
      setAdminEditingId(id);
      setAdminMessage(
        lang === "es"
          ? "Lección guardada correctamente."
          : "Lesson saved successfully.",
      );
    } finally {
      setAdminBusy(false);
    }
  }
  async function removeHistoryLesson(id: string) {
    if (
      !isCourseCreator ||
      !window.confirm(
        lang === "es" ? "¿Eliminar esta lección?" : "Delete this lesson?",
      )
    )
      return;
    await deleteDoc(doc(db, "courses", "history-culture", "lessons", id));
    await loadHistoryLessons();
    newHistoryDraft();
  }

  async function saveCourseCreator() {
    const email = teacherEmail.trim().toLowerCase();
    if (!isAdmin || !email.includes("@") || !teacherName.trim()) {
      setAdminMessage("Completa el nombre y correo de la maestra.");
      return;
    }
    await setDoc(doc(db, "courseCreators", email), {
      email,
      name: teacherName.trim(),
      role: "teacher",
      active: true,
      createdAt: serverTimestamp(),
    });
    setTeacherEmail("");
    setTeacherName("");
    await loadCourseCreators();
    setAdminMessage(
      "Maestra autorizada. Ya puede crear su cuenta o ingresar con ese correo.",
    );
  }
  async function toggleCourseCreator(creator: CourseCreator) {
    if (!isAdmin) return;
    await updateDoc(doc(db, "courseCreators", creator.email), {
      active: !creator.active,
    });
    await loadCourseCreators();
  }

  function hasHistoryAccess(lesson: HistoryLesson) {
    return lesson.price <= 0 || isAdmin || lesson.creatorEmail === account?.email?.toLowerCase() || confirmedCourseIds.has(lesson.id);
  }

  function beginCoursePurchase(lesson: HistoryLesson) {
    if (!account) return openAccount("login");
    if (isAdmin || creatorRole === "teacher") return;
    if (!children.length) {
      setFamilyOpen(true);
      return;
    }
    setPurchaseLesson(lesson);
    setPurchaseChildId(activeChild?.id || children[0].id);
    setPaymentMethod("qr");
    setPurchaseMessage("");
  }

  async function createCoursePurchase() {
    if (!account?.email || !purchaseLesson || !purchaseChildId || purchaseBusy) return;
    const child = children.find((profile) => profile.id === purchaseChildId);
    if (!child) return;
    const duplicate = purchases.find(
      (purchase) =>
        purchase.courseId === purchaseLesson.id &&
        purchase.childId === child.id &&
        (purchase.status === "pending" || purchase.status === "confirmed"),
    );
    if (duplicate) {
      setPurchaseMessage(
        duplicate.status === "confirmed"
          ? "Este estudiante ya tiene acceso al curso."
          : "Ya existe una solicitud pendiente para este curso y estudiante.",
      );
      return;
    }
    setPurchaseBusy(true);
    const price = Math.max(0, purchaseLesson.price);
    try {
      await addDoc(collection(db, "coursePurchases"), {
        courseId: purchaseLesson.id,
        courseTitle: purchaseLesson.titleEs,
        teacherEmail: purchaseLesson.creatorEmail || ADMIN_EMAILS[0],
        teacherName: purchaseLesson.creatorName || "Lumi Academy",
        buyerId: account.uid,
        buyerEmail: account.email.toLowerCase(),
        childId: child.id,
        childName: child.name,
        paymentMethod,
        status: "pending",
        price,
        platformAmount: Math.round(price * 10) / 100,
        teacherAmount: Math.round(price * 90) / 100,
        createdAt: serverTimestamp(),
      });
      await loadPurchases(account);
      setPurchaseMessage(
        paymentMethod === "qr"
          ? "Solicitud registrada. Realiza el pago QR y espera la confirmación de Lumi Academy."
          : "Solicitud registrada. El acceso se habilitará cuando Lumi Academy confirme el pago en efectivo.",
      );
    } finally {
      setPurchaseBusy(false);
    }
  }

  async function updatePurchaseStatus(purchase: CoursePurchase, status: "confirmed" | "rejected" | "refunded") {
    if (!isAdmin) return;
    await updateDoc(doc(db, "coursePurchases", purchase.id), {
      status,
      reviewedAt: serverTimestamp(),
      reviewedBy: account?.email?.toLowerCase() || "",
    });
    await loadPurchases(account);
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
    const startFrequency =
      kind === "correct" ? 620 : kind === "complete" ? 520 : 260;
    const endFrequency =
      kind === "correct" ? 880 : kind === "complete" ? 1040 : 115;
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      endFrequency,
      now + (kind === "complete" ? 0.22 : 0.12),
    );
    gain.gain.setValueAtTime(kind === "error" ? 0.035 : 0.045, now);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      now + (kind === "complete" ? 0.3 : 0.16),
    );
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + (kind === "complete" ? 0.31 : 0.17));
  }

  function speakFeedback(message: string, playful = false) {
    if (
      !sound ||
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    )
      return;
    window.speechSynthesis.cancel();
    const voice = new SpeechSynthesisUtterance(message);
    voice.lang = lang === "es" ? "es-BO" : "en-US";
    voice.rate = playful ? 1.18 : 1.05;
    voice.pitch = playful ? 1.45 : 1.2;
    voice.volume = 0.42;
    window.speechSynthesis.speak(voice);
  }

  function celebrateCorrect(nextTyped: number) {
    playTone("correct");
    if (nextTyped % 5 === 0)
      speakFeedback(lang === "es" ? "¡Yey!" : "Yay!", true);
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
        const result = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        );
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
      setAuthError(
        code.includes("email-already-in-use")
          ? lang === "es"
            ? "Este correo ya está registrado."
            : "This email is already registered."
          : code.includes("invalid-credential")
            ? lang === "es"
              ? "Correo o contraseña incorrectos."
              : "Incorrect email or password."
            : code.includes("weak-password")
              ? lang === "es"
                ? "La contraseña debe tener al menos 6 caracteres."
                : "Password must contain at least 6 characters."
              : lang === "es"
                ? "No pudimos completar la operación. Inténtalo nuevamente."
                : "We could not complete the operation. Please try again.",
      );
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
        <span
          key={index}
          className={
            index < typed ? "typed" : index === typed ? "current-letter" : ""
          }
        >
          {letter === " " ? "\u00A0" : letter}
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

  function chooseQuickAnswer(answer: string, correct: string) {
    const right = answer === correct;
    setQuickFeedback(
      right
        ? lang === "es"
          ? "¡Yey! Respuesta correcta."
          : "Yay! Correct answer."
        : lang === "es"
          ? "No te preocupes. Observa y prueba otra vez."
          : "Don't worry. Look carefully and try again.",
    );
    right ? celebrateCorrect(1) : reactToError();
  }

  function nextQuickRound() {
    setQuickRound((round) => round + 1);
    setQuickFeedback("");
    resetPractice();
  }

  function enterChildSpace(child: ChildProfile) {
    const preferences = {
      world: 0,
      hands: true,
      sound: true,
      bigText: false,
      ...child.keyboardSettings,
    };
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
      await updateDoc(
        doc(db, "parents", account.uid, "children", activeChild.id),
        { keyboardSettings },
      );
      const updatedChild = { ...activeChild, keyboardSettings };
      setActiveChild(updatedChild);
      setChildren((currentChildren) =>
        currentChildren.map((child) =>
          child.id === activeChild.id ? updatedChild : child,
        ),
      );
      setSettingsMessage(
        lang === "es" ? "Configuración guardada" : "Settings saved",
      );
      window.setTimeout(() => setSettingsOpen(false), 650);
    } catch {
      setSettingsMessage(
        lang === "es"
          ? "No se pudo guardar. Inténtalo nuevamente."
          : "Could not save. Please try again.",
      );
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
      window.setTimeout(
        () =>
          readingVoice(
            lang === "es"
              ? `¡Qué bien que estás aquí, ${activeChild.name}! Necesitamos tu ayuda para una misión importante.`
              : `We're so glad you're here, ${activeChild.name}! We need your help with an important mission.`,
          ),
        250,
      );
    }
  }

  function advanceReadingIntro() {
    const next = readingStage + 1;
    setReadingStage(next);
    setReadingFeedback("");
    const messages =
      lang === "es"
        ? [
            "Para esta misión aprenderás un poco todos los días. Nosotros te enseñaremos a hacerlo.",
            "Cada sesión dura cinco minutos. En el reloj podrás ver cuánto llevas. ¡Comencemos!",
          ]
        : [
            "For this mission, you will learn a little every day. We will show you how.",
            "Each session lasts five minutes. The clock shows your time. Let's begin!",
          ];
    if (next <= 2)
      window.setTimeout(() => readingVoice(messages[next - 1]), 150);
  }

  function gentleReadingFeedback() {
    setReadingFeedback(
      lang === "es"
        ? "No te preocupes. Respira, observa y prueba otra vez. Lumi cree en ti."
        : "Don't worry. Take a breath, look carefully, and try again. Lumi believes in you.",
    );
    playTone("error");
  }

  function answerAssessment(correct: boolean) {
    if (!correct) {
      gentleReadingFeedback();
      return;
    }
    const nextScore = readingScore + 1;
    setReadingScore(nextScore);
    setReadingFeedback(
      lang === "es"
        ? "¡Muy bien! Sigamos con la misión."
        : "Great job! Let's continue the mission.",
    );
    playTone("correct");
    if (readingStage === 6) {
      window.setTimeout(() => void completeReadingAssessment(nextScore), 650);
    } else {
      window.setTimeout(() => {
        setReadingStage((stage) => stage + 1);
        setReadingFeedback("");
        setReadingSequence([]);
      }, 650);
    }
  }

  function chooseSequencePiece(piece: number, total: number) {
    const expected = readingSequence.length + 1;
    if (piece !== expected) {
      setReadingSequence([]);
      gentleReadingFeedback();
      return;
    }
    const next = [...readingSequence, piece];
    setReadingSequence(next);
    if (next.length === total) answerAssessment(true);
  }

  async function completeReadingAssessment(finalScore: number) {
    if (!account || !activeChild) return;
    setReadingBusy(true);
    try {
      await updateDoc(
        doc(db, "parents", account.uid, "children", activeChild.id),
        {
          readingAssessmentScore: finalScore,
          readingLevel: 1,
          readingCompletedLessons: [],
          subjects: arrayUnion("reading"),
        },
      );
      const updated = {
        ...activeChild,
        readingAssessmentScore: finalScore,
        readingLevel: 1,
        readingCompletedLessons: [],
        subjects: [...new Set([...(activeChild.subjects || []), "reading"])],
      };
      setActiveChild(updated);
      setChildren((profiles) =>
        profiles.map((profile) =>
          profile.id === updated.id ? updated : profile,
        ),
      );
      setReadingStage(7);
      setReadingFeedback("");
      speakFeedback(
        lang === "es"
          ? "¡Misión completada! Ya sabemos por dónde comenzar tu aventura de lectura."
          : "Mission complete! We now know where to begin your reading adventure.",
        true,
      );
    } finally {
      setReadingBusy(false);
    }
  }

  function startReadingLesson(lessonNumber: number) {
    setReadingLesson(lessonNumber);
    setReadingExercise(0);
    setReadingBuild([]);
    setReadingLessonDone(false);
    setReadingFeedback("");
    const exercise = readingLessons[lang][lessonNumber - 1].exercises[0];
    window.setTimeout(
      () => readingVoice(`${exercise.display}. ${exercise.sound}`),
      180,
    );
  }

  async function completeReadingExercise() {
    if (!account || !activeChild || !readingLesson || readingBusy) return;
    const lesson = readingLessons[lang][readingLesson - 1];
    if (readingExercise < lesson.exercises.length - 1) {
      playTone("correct");
      setReadingFeedback(
        lang === "es"
          ? "¡Muy bien! Vamos al siguiente ejercicio."
          : "Great job! Let's go to the next activity.",
      );
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
    setReadingFeedback(
      lang === "es"
        ? "¡Lección completada! Abriste la siguiente misión."
        : "Lesson complete! You unlocked the next mission.",
    );
    setReadingBusy(true);
    const completed = activeChild.readingCompletedLessons || [];
    const firstCompletion = !completed.includes(readingLesson);
    const nextLevel =
      firstCompletion && readingLesson >= (activeChild.readingLevel || 1)
        ? Math.min(18, readingLesson + 1)
        : activeChild.readingLevel || 1;
    const updated = {
      ...activeChild,
      readingLevel: nextLevel,
      readingCompletedLessons: firstCompletion
        ? [...completed, readingLesson]
        : completed,
      stars: activeChild.stars + (firstCompletion ? 2 : 0),
    };
    try {
      await updateDoc(
        doc(db, "parents", account.uid, "children", activeChild.id),
        {
          readingLevel: nextLevel,
          readingCompletedLessons: arrayUnion(readingLesson),
          stars: updated.stars,
          lastReadingAt: serverTimestamp(),
        },
      );
      setActiveChild(updated);
      setChildren((profiles) =>
        profiles.map((profile) =>
          profile.id === updated.id ? updated : profile,
        ),
      );
      setReadingLessonDone(true);
    } finally {
      setReadingBusy(false);
    }
  }

  function answerReadingLesson(option: string) {
    if (!readingLesson || readingBusy || readingLessonDone) return;
    const exercise =
      readingLessons[lang][readingLesson - 1].exercises[readingExercise];
    if (option !== exercise.answer) {
      gentleReadingFeedback();
      return;
    }
    void completeReadingExercise();
  }

  function chooseReadingSyllable(syllable: string) {
    if (!readingLesson || readingLessonDone) return;
    const exercise =
      readingLessons[lang][readingLesson - 1].exercises[readingExercise];
    const attempt = [...readingBuild, syllable];
    setReadingBuild(attempt);
    if (attempt.length === 2) {
      if (attempt.join("|") === exercise.answer) void completeReadingExercise();
      else {
        setReadingBuild([]);
        gentleReadingFeedback();
      }
    }
  }

  const mathAssessment = [
    { display: "2 + 3", answer: "5", options: ["4", "5", "6"] },
    { display: "7 − 2", answer: "5", options: ["3", "5", "6"] },
    { display: "2 × 4", answer: "8", options: ["6", "8", "10"] },
    { display: "12 ÷ 3", answer: "4", options: ["3", "4", "6"] },
    { display: "8 + 7", answer: "15", options: ["14", "15", "16"] },
  ];

  function openMathCourse() {
    if (!activeChild) return;
    setMathOpen(true);
    setMathLesson(null);
    setMathFeedback("");
    if (activeChild.mathAssessmentScore === undefined) {
      setMathAssessmentIndex(0);
      setMathAssessmentScore(0);
      window.setTimeout(
        () =>
          readingVoice(
            lang === "es"
              ? `¡Hola, ${activeChild.name}! Ayuda a Lumi a resolver cinco retos para encontrar tu punto de partida.`
              : `Hi, ${activeChild.name}! Help Lumi solve five challenges to find your starting point.`,
          ),
        200,
      );
    }
  }

  async function answerMathAssessment(option: string) {
    if (!account || !activeChild || mathBusy) return;
    const problem = mathAssessment[mathAssessmentIndex];
    const expected =
      problem.answer === "No se puede" && lang === "en"
        ? "Cannot divide"
        : problem.answer;
    if (option !== expected) {
      setMathFeedback(
        lang === "es"
          ? "No pasa nada. Cuenta con calma y vuelve a intentarlo."
          : "That's okay. Count calmly and try again.",
      );
      playTone("error");
      return;
    }
    const score = mathAssessmentScore + 1;
    setMathAssessmentScore(score);
    playTone("correct");
    if (mathAssessmentIndex < mathAssessment.length - 1) {
      setMathFeedback(
        lang === "es"
          ? "¡Muy bien! Vamos al siguiente reto."
          : "Great job! On to the next challenge.",
      );
      window.setTimeout(() => {
        setMathAssessmentIndex((value) => value + 1);
        setMathFeedback("");
      }, 450);
      return;
    }
    setMathBusy(true);
    try {
      await updateDoc(
        doc(db, "parents", account.uid, "children", activeChild.id),
        {
          mathAssessmentScore: score,
          mathLevel: 1,
          mathCompletedLessons: [],
          subjects: arrayUnion("math"),
        },
      );
      const updated = {
        ...activeChild,
        mathAssessmentScore: score,
        mathLevel: 1,
        mathCompletedLessons: [],
        subjects: [...new Set([...(activeChild.subjects || []), "math"])],
      };
      setActiveChild(updated);
      setChildren((profiles) =>
        profiles.map((profile) =>
          profile.id === updated.id ? updated : profile,
        ),
      );
      setMathFeedback("");
      speakFeedback(
        lang === "es"
          ? "¡Evaluación terminada! Tu camino matemático está listo."
          : "Assessment complete! Your math path is ready.",
        true,
      );
    } finally {
      setMathBusy(false);
    }
  }

  function startMathLesson(lessonNumber: number) {
    setMathLesson(lessonNumber);
    setMathExercise(0);
    setMathLessonDone(false);
    setMathFeedback("");
    const lesson = mathLessons[lessonNumber - 1];
    window.setTimeout(
      () =>
        readingVoice(
          `${lang === "es" ? lesson.es : lesson.en}. ${lesson.problems[0].display}`,
        ),
      180,
    );
  }

  async function answerMathLesson(option: string) {
    if (!account || !activeChild || !mathLesson || mathBusy || mathLessonDone)
      return;
    const lesson = mathLessons[mathLesson - 1];
    const problem = lesson.problems[mathExercise];
    if (option !== problem.answer) {
      setMathFeedback(
        lang === "es"
          ? "Casi. Usa los objetos, cuenta otra vez y prueba de nuevo."
          : "Almost. Use the objects, count again, and try once more.",
      );
      playTone("error");
      return;
    }
    playTone("correct");
    if (mathExercise < lesson.problems.length - 1) {
      setMathFeedback(
        lang === "es"
          ? "¡Correcto! Siguiente ejercicio."
          : "Correct! Next activity.",
      );
      window.setTimeout(() => {
        const next = mathExercise + 1;
        setMathExercise(next);
        setMathFeedback("");
        readingVoice(lesson.problems[next].display);
      }, 450);
      return;
    }
    setMathBusy(true);
    playTone("complete");
    const completed = activeChild.mathCompletedLessons || [];
    const firstCompletion = !completed.includes(mathLesson);
    const nextLevel =
      firstCompletion && mathLesson >= (activeChild.mathLevel || 1)
        ? Math.min(36, mathLesson + 1)
        : activeChild.mathLevel || 1;
    const updated = {
      ...activeChild,
      mathLevel: nextLevel,
      mathCompletedLessons: firstCompletion
        ? [...completed, mathLesson]
        : completed,
      stars: activeChild.stars + (firstCompletion ? 2 : 0),
    };
    try {
      await updateDoc(
        doc(db, "parents", account.uid, "children", activeChild.id),
        {
          mathLevel: nextLevel,
          mathCompletedLessons: arrayUnion(mathLesson),
          stars: updated.stars,
          lastMathAt: serverTimestamp(),
        },
      );
      setActiveChild(updated);
      setChildren((profiles) =>
        profiles.map((profile) =>
          profile.id === updated.id ? updated : profile,
        ),
      );
      setMathFeedback(
        lang === "es"
          ? "¡Lección completada! Abriste el siguiente reto."
          : "Lesson complete! You unlocked the next challenge.",
      );
      setMathLessonDone(true);
    } finally {
      setMathBusy(false);
    }
  }

  const englishAssessment = [
    { prompt: "👋", answer: "Hello", options: ["Hello", "Goodbye", "Happy"] },
    { prompt: "🔴", answer: "Red", options: ["Blue", "Red", "Green"] },
    { prompt: "🐶", answer: "Dog", options: ["Cat", "Cow", "Dog"] },
    { prompt: "3️⃣", answer: "Three", options: ["Two", "Three", "Five"] },
    { prompt: "🍎", answer: "Apple", options: ["Banana", "Apple", "Bread"] },
  ];

  function openEnglishCourse() {
    if (!activeChild) return;
    setEnglishOpen(true);
    setEnglishLesson(null);
    setEnglishFeedback("");
    if (activeChild.englishAssessmentScore === undefined) {
      setEnglishAssessmentIndex(0);
      setEnglishAssessmentScore(0);
      window.setTimeout(
        () =>
          readingVoice(
            `Hello, ${activeChild.name}! Let's discover your English adventure.`,
          ),
        200,
      );
    }
  }

  async function answerEnglishAssessment(option: string) {
    if (!account || !activeChild || englishBusy) return;
    const challenge = englishAssessment[englishAssessmentIndex];
    if (option !== challenge.answer) {
      setEnglishFeedback(
        lang === "es"
          ? "No te preocupes. Escucha otra vez y prueba de nuevo."
          : "Don't worry. Listen again and try once more.",
      );
      playTone("error");
      return;
    }
    const score = englishAssessmentScore + 1;
    setEnglishAssessmentScore(score);
    playTone("correct");
    if (englishAssessmentIndex < englishAssessment.length - 1) {
      setEnglishFeedback(
        lang === "es"
          ? "¡Excelente! Siguiente palabra."
          : "Excellent! Next word.",
      );
      window.setTimeout(() => {
        setEnglishAssessmentIndex((value) => value + 1);
        setEnglishFeedback("");
      }, 450);
      return;
    }
    setEnglishBusy(true);
    try {
      await updateDoc(
        doc(db, "parents", account.uid, "children", activeChild.id),
        {
          englishAssessmentScore: score,
          englishLevel: 1,
          englishCompletedLessons: [],
          subjects: arrayUnion("english"),
        },
      );
      const updated = {
        ...activeChild,
        englishAssessmentScore: score,
        englishLevel: 1,
        englishCompletedLessons: [],
        subjects: [...new Set([...(activeChild.subjects || []), "english"])],
      };
      setActiveChild(updated);
      setChildren((profiles) =>
        profiles.map((profile) =>
          profile.id === updated.id ? updated : profile,
        ),
      );
      setEnglishFeedback("");
      speakFeedback("Great job! Your English adventure is ready.", true);
    } finally {
      setEnglishBusy(false);
    }
  }

  function startEnglishLesson(lessonNumber: number) {
    setEnglishLesson(lessonNumber);
    setEnglishStep(0);
    setEnglishLessonDone(false);
    setEnglishFeedback("");
    const lesson = englishLessons[lessonNumber - 1];
    window.setTimeout(
      () =>
        readingVoice(
          `${lesson.title}. ${lesson.words.map((word) => word.word).join(", ")}`,
        ),
      180,
    );
  }

  async function advanceEnglishStep() {
    if (!account || !activeChild || !englishLesson || englishBusy) return;
    if (englishStep < 4) {
      playTone("correct");
      setEnglishFeedback(
        lang === "es"
          ? "¡Muy bien! Continuemos."
          : "Great job! Let's continue.",
      );
      window.setTimeout(() => {
        setEnglishStep((value) => value + 1);
        setEnglishFeedback("");
      }, 450);
      return;
    }
    setEnglishBusy(true);
    playTone("complete");
    const completed = activeChild.englishCompletedLessons || [];
    const firstCompletion = !completed.includes(englishLesson);
    const nextLevel =
      firstCompletion && englishLesson >= (activeChild.englishLevel || 1)
        ? Math.min(18, englishLesson + 1)
        : activeChild.englishLevel || 1;
    const updated = {
      ...activeChild,
      englishLevel: nextLevel,
      englishCompletedLessons: firstCompletion
        ? [...completed, englishLesson]
        : completed,
      stars: activeChild.stars + (firstCompletion ? 2 : 0),
    };
    try {
      await updateDoc(
        doc(db, "parents", account.uid, "children", activeChild.id),
        {
          englishLevel: nextLevel,
          englishCompletedLessons: arrayUnion(englishLesson),
          stars: updated.stars,
          lastEnglishAt: serverTimestamp(),
        },
      );
      setActiveChild(updated);
      setChildren((profiles) =>
        profiles.map((profile) =>
          profile.id === updated.id ? updated : profile,
        ),
      );
      setEnglishFeedback(
        lang === "es"
          ? "¡Lección completada! Ganaste dos estrellas."
          : "Lesson complete! You earned two stars.",
      );
      setEnglishLessonDone(true);
    } finally {
      setEnglishBusy(false);
    }
  }

  function answerEnglishPractice(option: string) {
    if (!englishLesson || englishLessonDone) return;
    const lesson = englishLessons[englishLesson - 1];
    const target =
      lesson.words[
        englishStep === 2 ? 1 % lesson.words.length : 3 % lesson.words.length
      ];
    if (option !== target.word) {
      setEnglishFeedback(
        lang === "es"
          ? "Casi. Presiona el audio y escucha con atención."
          : "Almost. Press the audio and listen carefully.",
      );
      playTone("error");
      return;
    }
    void advanceEnglishStep();
  }

  function startEnglishPronunciation() {
    if (!englishLesson || typeof window === "undefined") return;
    type RecognitionResult = { 0: { transcript: string } };
    type RecognitionEvent = { results: { 0: RecognitionResult } };
    type RecognitionInstance = {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      onresult: ((event: RecognitionEvent) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
      start: () => void;
    };
    type RecognitionConstructor = new () => RecognitionInstance;
    const browserWindow = window as unknown as {
      SpeechRecognition?: RecognitionConstructor;
      webkitSpeechRecognition?: RecognitionConstructor;
    };
    const Recognition =
      browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setEnglishFeedback(
        lang === "es"
          ? "Tu navegador no tiene reconocimiento de voz. Repite en voz alta y presiona «Ya lo dije»."
          : "Voice recognition is unavailable. Repeat aloud and press “I said it”.",
      );
      return;
    }
    const lesson = englishLessons[englishLesson - 1];
    const target = lesson.words[2 % lesson.words.length].word.toLowerCase();
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const heard = event.results[0][0].transcript.toLowerCase();
      if (heard.includes(target)) {
        setEnglishFeedback(`✓ ${heard}`);
        playTone("correct");
        window.setTimeout(() => void advanceEnglishStep(), 500);
      } else {
        setEnglishFeedback(
          lang === "es"
            ? `Escuché “${heard}”. Probemos otra vez.`
            : `I heard “${heard}”. Let's try again.`,
        );
        playTone("error");
      }
    };
    recognition.onerror = () =>
      setEnglishFeedback(
        lang === "es"
          ? "No pude escuchar con claridad. Puedes intentarlo otra vez o usar «Ya lo dije»."
          : "I couldn't hear clearly. Try again or use “I said it”.",
      );
    recognition.onend = () => setEnglishListening(false);
    setEnglishListening(true);
    recognition.start();
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
      const available = alternatives.filter(
        (option) => option !== courseTarget,
      );
      nextTarget =
        available[Math.floor(Math.random() * available.length)] ||
        alternatives[0];
    }
    setCourseLesson(safeLesson);
    setCourseTarget(nextTarget);
    setCourseTyped(0);
    setCourseMistakes(0);
    setCourseResult(null);
    setCourseStartedAt(Date.now());
    setCourseElapsedSeconds(0);
    setPressedFinger(null);
    if (safeLesson === 1) {
      window.setTimeout(
        () =>
          speakFeedback(
            lang === "es"
              ? "Acomoda tus dedos. Siente las pequeñas ranuras de las letras F y J. Después, presiona cada tecla iluminada."
              : "Place your fingers. Feel the small guides on the F and J keys. Then press each highlighted key.",
          ),
        250,
      );
    }
  }

  async function finishCourseLesson(
    lessonNumber: number,
    finalMistakes: number,
  ) {
    if (!account || !activeChild || courseBusy) return;
    const finalAccuracy = Math.round(
      (courseTarget.length / (courseTarget.length + finalMistakes)) * 100,
    );
    const passed = lessonNumber === 1 || finalAccuracy >= 80;
    const earnedStars =
      finalAccuracy >= 95 ? 3 : finalAccuracy >= 88 ? 2 : passed ? 1 : 0;
    const elapsed = Math.max(
      1,
      courseElapsedSeconds ||
        (courseStartedAt
          ? Math.floor((Date.now() - courseStartedAt) / 1000)
          : 1),
    );
    const wpm =
      lessonNumber === 18
        ? Math.round(courseTarget.length / 5 / (elapsed / 60))
        : undefined;
    setCourseResult({
      passed,
      accuracy: finalAccuracy,
      stars: earnedStars,
      wpm,
    });
    if (!passed) {
      speakFeedback(
        lang === "es"
          ? "Respira. ¡Vamos otra vez!"
          : "Take a breath. Let's try again!",
        true,
      );
      return;
    }
    playTone("complete");
    speakFeedback(
      lang === "es" ? "¡Yey! ¡Lección completada!" : "Yay! Lesson complete!",
      true,
    );

    setCourseBusy(true);
    const completed = activeChild.completedLessons || [];
    const firstCompletion = !completed.includes(lessonNumber);
    const nextLevel =
      firstCompletion && lessonNumber >= activeChild.level
        ? Math.min(18, lessonNumber + 1)
        : activeChild.level;
    const nextStars = activeChild.stars + (firstCompletion ? earnedStars : 0);
    const nextCompleted = firstCompletion
      ? [...completed, lessonNumber]
      : completed;
    const nextChild: ChildProfile = {
      ...activeChild,
      level: nextLevel,
      stars: nextStars,
      completedLessons: nextCompleted,
      bestAccuracy: Math.max(activeChild.bestAccuracy || 0, finalAccuracy),
      courseCompleted: lessonNumber === 18 || activeChild.courseCompleted,
    };

    try {
      await updateDoc(
        doc(db, "parents", account.uid, "children", activeChild.id),
        {
          level: nextLevel,
          stars: nextStars,
          completedLessons: arrayUnion(lessonNumber),
          bestAccuracy: nextChild.bestAccuracy,
          courseCompleted: nextChild.courseCompleted || false,
          lastLessonAt: serverTimestamp(),
        },
      );
      setActiveChild(nextChild);
      setChildren((profiles) =>
        profiles.map((profile) =>
          profile.id === nextChild.id ? nextChild : profile,
        ),
      );
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
      window.setTimeout(
        () =>
          setPressedFinger((finger) =>
            finger === correctFinger ? null : finger,
          ),
        180,
      );
      const nextTyped = courseTyped + 1;
      setCourseTyped(nextTyped);
      celebrateCorrect(nextTyped);
      if (nextTyped === courseTarget.length)
        void finishCourseLesson(courseLesson, courseMistakes);
    } else if (pressed) {
      setCourseMistakes((value) => value + 1);
      reactToError();
    }
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Lumi Academy">
          <span className="brand-mark">
            <i>L</i>
            <b>✦</b>
          </span>
          <span>
            <strong>Lumi</strong>
            <small>ACADEMY</small>
          </span>
        </a>
        <nav>
          {t.nav.map((item, i) => (
            <a key={item} href={["#courses", "#how", "#courses", "#families"][i]}>
              {item}
            </a>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className="language"
            onClick={() => setLang(lang === "es" ? "en" : "es")}
            aria-label="Change language"
          >
            <b>{lang.toUpperCase()}</b>
            <span>⌄</span>
          </button>
          {account && isCourseCreator && (
            <button
              className="creator-access-button"
              onClick={() => {
                setAdminOpen(true);
                newHistoryDraft();
                void loadHistoryLessons();
                if (isAdmin) void loadCourseCreators();
              }}
            >
              🧑‍🏫{" "}
              {isAdmin
                ? lang === "es"
                  ? "Administración"
                  : "Administration"
                : lang === "es"
                  ? "Panel docente"
                  : "Teacher panel"}
            </button>
          )}
          {account ? (
            <button
              className="account-button"
              onClick={() => {
                if (isCourseCreator) {
                  setAdminOpen(true);
                  void loadPurchases(account);
                } else setFamilyOpen(true);
              }}
            >
              <span>{account.displayName?.charAt(0).toUpperCase() || (isAdmin ? "A" : "F")}</span>
              {account.displayName ||
                (isAdmin
                  ? lang === "es" ? "Mi administración" : "My administration"
                  : creatorRole === "teacher"
                    ? lang === "es" ? "Mi panel docente" : "My teacher panel"
                    : lang === "es" ? "Mi familia" : "My family")}
            </button>
          ) : (
            <button
              className="button primary small access-button"
              onClick={() => openAccount("login")}
            >
              {t.login}
            </button>
          )}
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <h1 className="hero-platform-title">
            <span>✦</span>
            {t.eyebrow}
          </h1>
          <h2 className="hero-slogan">
            {t.titleA}
            <br />
            <em>{t.titleB}</em>
          </h2>
          <p>{t.intro}</p>
          <div className="hero-buttons">
            <a className="button primary" href="#practice">
              {t.trial} <span>→</span>
            </a>
            <a className="button secondary" href="#courses">
              {t.plans}
            </a>
          </div>
        </div>

        <div className="hero-visual" aria-label="Lumi learning preview">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="lumi">
            <span className="ray r1" />
            <span className="ray r2" />
            <span className="ray r3" />
            <span className="ray r4" />
            <div className="lumi-body">
              <i>•</i>
              <i>•</i>
              <b>⌣</b>
            </div>
            <div className="lumi-tail" />
          </div>
          <div className="floating-card card-progress">
            <span className="round-icon purple">✓</span>
            <div>
              <small>{t.progress}</small>
              <b>3 {lang === "es" ? "lecciones" : "lessons"}</b>
            </div>
          </div>
          <div className="floating-card card-streak">
            <span>🔥</span>
            <div>
              <b>5 {lang === "es" ? "días" : "days"}</b>
              <small>{t.streak}</small>
            </div>
          </div>
          <div className="floating-key k1">A</div>
          <div className="floating-key k2">S</div>
          <div className="floating-key k3">D</div>
          <div className="keyboard-mini">
            <div>Q W E R T Y U I O P</div>
            <div>A S D F G H J K L Ñ</div>
            <div>Z X C V B N M</div>
            <span />
          </div>
        </div>
      </section>

      <section
        className="education-path curriculum-board"
        id="courses"
        aria-label={lang === "es" ? "Áreas educativas" : "Learning areas"}
      >
        <div className="curriculum-board-heading">
          <div>
            <span className="section-kicker">{lang === "es" ? "PIZARRA DE APRENDIZAJE" : "LEARNING BOARD"}</span>
            <h2>{lang === "es" ? "Currículos disponibles" : "Available curricula"}</h2>
            <p>{lang === "es" ? "Busca una materia, descubre sus actividades y encuentra el curso adecuado para cada estudiante." : "Search for a subject, discover its activities and find the right course for each student."}</p>
          </div>
          <label className="curriculum-search">
            <span>⌕</span>
            <input value={curriculumSearch} onChange={(event) => setCurriculumSearch(event.target.value)} placeholder={lang === "es" ? "Buscar cursos o materias…" : "Search courses or subjects…"} />
            {curriculumSearch && <button onClick={() => setCurriculumSearch("")}>×</button>}
          </label>
        </div>
        {(() => {
          const baseCurricula = [
            { id: "typing", icon: "⌨", title: lang === "es" ? "Dactilografía" : "Typing", detail: lang === "es" ? "18 lecciones · Precisión, velocidad y palabras por minuto" : "18 lessons · Accuracy, speed and words per minute", color: "purple" },
            { id: "reading", icon: "📖", title: lang === "es" ? "Lectura" : "Reading", detail: lang === "es" ? "18 lecciones · Sonidos, palabras y comprensión" : "18 lessons · Sounds, words and comprehension", color: "turquoise" },
            { id: "math", icon: "🔢", title: lang === "es" ? "Matemáticas" : "Mathematics", detail: lang === "es" ? "36 lecciones · Retos, lógica y resolución" : "36 lessons · Challenges, logic and problem solving", color: "yellow" },
            { id: "english", icon: "🌎", title: lang === "es" ? "Inglés" : "English", detail: lang === "es" ? "18 lecciones · Vocabulario, escucha y pronunciación" : "18 lessons · Vocabulary, listening and pronunciation", color: "coral" },
          ];
          const teacherCurricula = visibleHistoryLessons.map((lesson) => ({ id: lesson.id, icon: "🏛️", title: lang === "es" ? lesson.titleEs : lesson.titleEn, detail: `${lesson.country} · ${lesson.price > 0 ? `${lesson.price} Bs` : lang === "es" ? "Gratis" : "Free"} · ${lesson.creatorName || "Lumi Academy"}`, color: "blue", lesson }));
          const boardItems = [...baseCurricula, ...teacherCurricula].filter((item) => `${item.title} ${item.detail}`.toLocaleLowerCase().includes(curriculumSearch.trim().toLocaleLowerCase()));
          return <div className="curriculum-board-shell">
            <div className="curriculum-scroll">
              {boardItems.map((item) => <article className={`curriculum-card curriculum-${item.color}`} key={item.id}>
                <span className="curriculum-icon">{item.icon}</span>
                <div><small>{lang === "es" ? "CURSO DISPONIBLE" : "AVAILABLE COURSE"}</small><h3>{item.title}</h3><p>{item.detail}</p></div>
                <button onClick={() => "lesson" in item && item.lesson ? (item.lesson.price > 0 && !hasHistoryAccess(item.lesson) ? beginCoursePurchase(item.lesson) : activeChild ? (openHistoryCourse(), window.setTimeout(() => startHistoryLesson(item.lesson!), 0)) : account ? setFamilyOpen(true) : openAccount("login")) : account ? setFamilyOpen(true) : openAccount("login")}>{lang === "es" ? "Ver curso →" : "View course →"}</button>
              </article>)}
              {boardItems.length === 0 && <div className="curriculum-empty"><span>🔎</span><b>{lang === "es" ? "No encontramos ese curso" : "We couldn't find that course"}</b><p>{lang === "es" ? "Prueba buscando otra materia o palabra." : "Try another subject or keyword."}</p></div>}
            </div>
            <div className="curriculum-scroll-hint"><span>↔</span>{lang === "es" ? "Desliza para ver más currículos" : "Scroll to see more curricula"}</div>
          </div>;
        })()}
      </section>

      <section className={`practice-section ${worlds[world]}`} id="practice">
        <div className="section-heading">
          <span className="section-kicker">LUMI ACADEMY</span>
          <h2>{t.practice}</h2>
          <p>
            {lang === "es"
              ? "Elige un curso y entrena una habilidad en pocos minutos."
              : "Choose a course and train one skill in just a few minutes."}
          </p>
        </div>
        <div className="practice-shell">
          <div
            className="quick-subjects"
            role="tablist"
            aria-label={
              lang === "es"
                ? "Cursos de práctica rápida"
                : "Quick practice courses"
            }
          >
            {(
              [
                ["typing", "⌨", lang === "es" ? "Dactilografía" : "Typing"],
                ["reading", "📖", lang === "es" ? "Lectura" : "Reading"],
                ["math", "🔢", lang === "es" ? "Matemáticas" : "Mathematics"],
                ["english", "🌎", lang === "es" ? "Inglés" : "English"],
              ] as const
            ).map(([id, icon, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={quickSubject === id}
                className={quickSubject === id ? "active" : ""}
                onClick={() => {
                  setQuickSubject(id);
                  setQuickFeedback("");
                }}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="practice-top">
            <span className="lesson-pill">
              {lang === "es" ? "Práctica de 2 minutos" : "2-minute practice"}
            </span>
            <div className="practice-actions">
              <button onClick={nextQuickRound}>
                ↻{" "}
                {quickSubject === "typing"
                  ? t.reset
                  : lang === "es"
                    ? "Otro reto"
                    : "Next challenge"}
              </button>
            </div>
          </div>
          {quickSubject === "typing" ? (
            <>
              <div className={`typing-prompt ${bigText ? "large" : ""}`}>
                {typed >= target.length ? (
                  <b className="complete">{t.done}</b>
                ) : (
                  renderedTarget
                )}
              </div>
              <input
                autoComplete="off"
                autoCapitalize="off"
                aria-label={t.practiceHint}
                className="typing-capture"
                value=""
                onKeyDown={handleKey}
                onChange={() => {}}
                placeholder={
                  lang === "es"
                    ? "Haz clic aquí y comienza a escribir…"
                    : "Click here and start typing…"
                }
              />
              <div className="keyboard">
                {rows.map((row, rowIndex) => (
                  <div className="key-row" key={rowIndex}>
                    {row.map((key) => (
                      <span
                        key={key}
                        className={
                          current.toUpperCase() === key ? "active-key" : ""
                        }
                      >
                        {key}
                      </span>
                    ))}
                  </div>
                ))}
                <div className="space-key">
                  <span className={current === " " ? "active-key" : ""}>
                    SPACE
                  </span>
                </div>
              </div>
              {hands && (
                <div className="hands">
                  <span className="left-hand">☝</span>
                  <span className="right-hand">☝</span>
                </div>
              )}
              <div className="practice-stats">
                <span>
                  <b>{accuracy}%</b>
                  <small>{t.accuracy}</small>
                </span>
                <span>
                  <b>
                    {typed}/{target.length}
                  </b>
                  <small>{lang === "es" ? "Progreso" : "Progress"}</small>
                </span>
                <span>
                  <b>{Math.max(1, Math.round(typed / 2))}</b>
                  <small>{t.stars}</small>
                </span>
              </div>
            </>
          ) : (
            (() => {
              const challenge =
                quickChallenges[quickSubject][
                  quickRound % quickChallenges[quickSubject].length
                ];
              return (
                <div className="quick-challenge">
                  <span className="quick-icon">
                    {quickSubject === "reading"
                      ? "📚"
                      : quickSubject === "math"
                        ? "🧩"
                        : "🎧"}
                  </span>
                  <h3>{challenge.prompt}</h3>
                  {quickSubject === "english" && (
                    <button
                      className="quick-listen"
                      onClick={() =>
                        readingVoice(quickRound % 2 === 0 ? "apple" : "happy")
                      }
                    >
                      🔊 {lang === "es" ? "Escuchar palabra" : "Listen"}
                    </button>
                  )}
                  <div className="quick-options">
                    {challenge.options.map((option) => (
                      <button
                        key={option}
                        onClick={() =>
                          chooseQuickAnswer(option, challenge.answer)
                        }
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  {quickFeedback && (
                    <p
                      className={
                        quickFeedback.includes("Yey") ||
                        quickFeedback.includes("Yay")
                          ? "correct"
                          : "try"
                      }
                    >
                      {quickFeedback}
                    </p>
                  )}
                </div>
              );
            })()
          )}
        </div>
      </section>

      <section className="benefits" id="how">
        <div className="section-heading">
          <span className="section-kicker">
            {lang === "es" ? "APRENDER CON LUMI" : "LEARN WITH LUMI"}
          </span>
          <h2>{t.why}</h2>
          <p>{t.whySub}</p>
        </div>
        <div className="benefit-grid">
          {t.benefits.map((benefit, index) => (
            <article key={benefit[0]}>
              <span className={`benefit-icon icon-${index}`}>
                {["✦", "↗", "♡"][index]}
              </span>
              <h3>{benefit[0]}</h3>
              <p>{benefit[1]}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="family-banner" id="families">
        <div>
          <span>✦</span>
          <h2>
            {lang === "es"
              ? "Cada estudiante tiene su propia forma de brillar."
              : "Every student has their own way to shine."}
          </h2>
          <p>
            {lang === "es"
              ? "Lumi se adapta a su ritmo, sus intereses y sus necesidades."
              : "Lumi adapts to their pace, interests and needs."}
          </p>
        </div>
        <button
          className="button light"
          onClick={() => (account ? setFamilyOpen(true) : openAccount("login"))}
        >
          {t.login} →
        </button>
      </section>

      <footer>
        <a className="brand footer-brand" href="#top">
          <span className="brand-mark">
            <i>L</i>
            <b>✦</b>
          </span>
          <span>
            <strong>Lumi</strong>
            <small>ACADEMY</small>
          </span>
        </a>
        <p>© 2026 Lumi Academy · {t.footer}</p>
        <div>
          <a href="#">Privacidad</a>
          <a href="#">Ayuda</a>
        </div>
      </footer>

      {settingsOpen && activeChild && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setSettingsOpen(false)}
        >
          <aside
            className="settings-panel"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="settings-head">
              <div>
                <span className="section-kicker">
                  {activeChild.name.toUpperCase()}
                </span>
                <h2>
                  {lang === "es"
                    ? "Configurar su teclado"
                    : "Keyboard settings"}
                </h2>
                <p>
                  {lang === "es"
                    ? "Estas preferencias se guardarán únicamente para este estudiante."
                    : "These preferences are saved only for this student."}
                </p>
              </div>
              <button onClick={() => setSettingsOpen(false)}>×</button>
            </div>
            <div
              className={`keyboard-settings-preview preview-${world} ${bigText ? "large" : ""}`}
            >
              <span>
                {hands ? "☝  A S D F   J K L Ñ  ☝" : "A S D F   J K L Ñ"}
              </span>
              <small>
                {sound ? "🔊" : "🔇"}{" "}
                {lang === "es" ? "Vista previa" : "Preview"}
              </small>
            </div>
            <label>{t.theme}</label>
            <div className="choice-row">
              {t.themes.map((theme, index) => (
                <button
                  className={world === index ? "selected" : ""}
                  key={theme}
                  onClick={() => setWorld(index)}
                >
                  <i className={`theme-dot dot-${index}`} />
                  {theme}
                </button>
              ))}
            </div>
            <div className="toggle-row">
              <span>{t.hands}</span>
              <button
                className={hands ? "toggle on" : "toggle"}
                onClick={() => setHands(!hands)}
              >
                <i />
              </button>
            </div>
            <div className="toggle-row">
              <span>
                {lang === "es"
                  ? "Sonidos de acierto y error"
                  : "Success and error sounds"}
              </span>
              <button
                className={sound ? "toggle on" : "toggle"}
                onClick={() => setSound(!sound)}
              >
                <i />
              </button>
            </div>
            <div className="toggle-row">
              <span>{t.big}</span>
              <button
                className={bigText ? "toggle on" : "toggle"}
                onClick={() => setBigText(!bigText)}
              >
                <i />
              </button>
            </div>
            <button
              disabled={settingsBusy}
              className="button primary panel-save"
              onClick={saveStudentSettings}
            >
              {settingsBusy
                ? lang === "es"
                  ? "Guardando…"
                  : "Saving…"
                : lang === "es"
                  ? "Guardar configuración"
                  : "Save settings"}
            </button>
            {settingsMessage && (
              <p
                className={`settings-message ${settingsMessage.includes("No ") || settingsMessage.includes("Could ") ? "error" : ""}`}
              >
                {settingsMessage}
              </p>
            )}
          </aside>
        </div>
      )}

      {authOpen && (
        <div
          className="modal-backdrop centered"
          onMouseDown={() => setAuthOpen(false)}
        >
          <section
            className="auth-card"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setAuthOpen(false)}>
              ×
            </button>
            <span className="brand-mark auth-logo">
              <i>L</i>
              <b>✦</b>
            </span>
            <span className="section-kicker">LUMI</span>
            <h2>
              {authMode === "login"
                ? lang === "es"
                  ? "Bienvenido de nuevo"
                  : "Welcome back"
                : lang === "es"
                  ? "Crea tu cuenta familiar"
                  : "Create your family account"}
            </h2>
            <p>
              {authMode === "login"
                ? lang === "es"
                  ? "Ingresa para continuar el aprendizaje."
                  : "Log in to continue learning."
                : lang === "es"
                  ? "El adulto crea la cuenta y luego agrega los perfiles infantiles."
                  : "An adult creates the account and then adds child profiles."}
            </p>
            <form onSubmit={submitAccount}>
              {authMode === "register" && (
                <label>
                  {lang === "es"
                    ? "Nombre del padre, madre o tutor"
                    : "Parent or guardian name"}
                  <input
                    value={parentName}
                    onChange={(event) => setParentName(event.target.value)}
                    required
                  />
                </label>
              )}
              <label>
                {lang === "es" ? "Correo electrónico" : "Email"}
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <label>
                {lang === "es" ? "Contraseña" : "Password"}
                <input
                  type="password"
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
              {authError && <div className="form-error">{authError}</div>}
              <button
                disabled={authBusy}
                className="button primary auth-submit"
              >
                {authBusy
                  ? lang === "es"
                    ? "Procesando…"
                    : "Working…"
                  : authMode === "login"
                    ? t.login
                    : t.start}
              </button>
            </form>
            <button
              className="mode-switch"
              onClick={() => {
                setAuthMode(authMode === "login" ? "register" : "login");
                setAuthError("");
              }}
            >
              {authMode === "login"
                ? lang === "es"
                  ? "¿Aún no tienes cuenta? Crear cuenta"
                  : "No account yet? Create one"
                : lang === "es"
                  ? "Ya tengo una cuenta"
                  : "I already have an account"}
            </button>
          </section>
        </div>
      )}

      {activeChild && (
        <div
          className="student-backdrop"
          onMouseDown={() => setActiveChild(null)}
        >
          <section
            className="student-dashboard"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="student-topbar">
              <button
                className="student-family-back"
                onClick={() => {
                  setActiveChild(null);
                  setFamilyOpen(true);
                }}
              >
                ← {lang === "es" ? "Mi familia" : "My family"}
              </button>
              <a
                className="brand"
                href="#top"
                onClick={() => setActiveChild(null)}
              >
                <span className="brand-mark">
                  <i>L</i>
                  <b>✦</b>
                </span>
                <span>
                  <strong>Lumi</strong>
                  <small>ACADEMY</small>
                </span>
              </a>
              <div className="student-top-actions">
                <button
                  className="student-settings"
                  onClick={() => {
                    setSettingsMessage("");
                    setSettingsOpen(true);
                  }}
                >
                  ⚙ {lang === "es" ? "Mi teclado" : "My keyboard"}
                </button>
                <button
                  className="student-close"
                  onClick={() => setActiveChild(null)}
                  aria-label={lang === "es" ? "Cerrar" : "Close"}
                >
                  ×
                </button>
              </div>
            </header>

            <div className="student-welcome">
              <div className="student-avatar">
                {activeChild.avatar}
                <span>✦</span>
              </div>
              <div>
                <span className="student-kicker">
                  {lang === "es" ? "TU AVENTURA DE HOY" : "TODAY'S ADVENTURE"}
                </span>
                <h2>
                  {lang === "es"
                    ? `¡Hola, ${activeChild.name}!`
                    : `Hi, ${activeChild.name}!`}
                </h2>
                <p>
                  {lang === "es"
                    ? "Lumi está listo para aprender contigo. Continúa donde lo dejaste."
                    : "Lumi is ready to learn with you. Continue where you left off."}
                </p>
              </div>
              <button
                className="button primary student-continue"
                onClick={startChildLesson}
              >
                {lang === "es" ? "Continuar lección" : "Continue lesson"}{" "}
                <span>→</span>
              </button>
            </div>

            <div className="student-stat-grid">
              <article>
                <span className="stat-icon purple-stat">★</span>
                <div>
                  <b>{activeChild.stars || 0}</b>
                  <small>
                    {lang === "es" ? "Estrellas ganadas" : "Stars earned"}
                  </small>
                </div>
              </article>
              <article>
                <span className="stat-icon orange-stat">🔥</span>
                <div>
                  <b>{activeChild.streak || 0}</b>
                  <small>
                    {lang === "es" ? "Días de racha" : "Streak days"}
                  </small>
                </div>
              </article>
              <article>
                <span className="stat-icon mint-stat">↗</span>
                <div>
                  <b>{Math.max(1, activeChild.level)}</b>
                  <small>
                    {lang === "es" ? "Nivel actual" : "Current level"}
                  </small>
                </div>
              </article>
            </div>

            <section className="student-subjects">
              <div>
                <span className="section-kicker">
                  {activeChild.gradeBand === "secondary"
                    ? lang === "es"
                      ? "SECUNDARIA"
                      : "SECONDARY"
                    : lang === "es"
                      ? "PRIMARIA"
                      : "PRIMARY"}
                </span>
                <h3>{lang === "es" ? "Mis materias" : "My subjects"}</h3>
              </div>
              <div className="subject-tabs">
                <button className="active">
                  <span>⌨</span>
                  <b>{lang === "es" ? "Dactilografía" : "Typing"}</b>
                  <small>{lang === "es" ? "En curso" : "In progress"}</small>
                </button>
                <button className="reading-subject" onClick={openReadingCourse}>
                  <span>📖</span>
                  <b>{lang === "es" ? "Lectura" : "Reading"}</b>
                  <small>
                    {activeChild.readingAssessmentScore === undefined
                      ? lang === "es"
                        ? "Evaluación inicial"
                        : "Initial assessment"
                      : lang === "es"
                        ? `${activeChild.readingCompletedLessons?.length || 0} de 18`
                        : `${activeChild.readingCompletedLessons?.length || 0} of 18`}
                  </small>
                </button>
                <button className="math-subject" onClick={openMathCourse}>
                  <span>🔢</span>
                  <b>{lang === "es" ? "Matemáticas" : "Mathematics"}</b>
                  <small>
                    {activeChild.mathAssessmentScore === undefined
                      ? lang === "es"
                        ? "Evaluación inicial"
                        : "Initial assessment"
                      : lang === "es"
                        ? `${activeChild.mathCompletedLessons?.length || 0} de 36`
                        : `${activeChild.mathCompletedLessons?.length || 0} of 36`}
                  </small>
                </button>
                <button className="english-subject" onClick={openEnglishCourse}>
                  <span>🌎</span>
                  <b>{lang === "es" ? "Inglés" : "English"}</b>
                  <small>
                    {activeChild.englishAssessmentScore === undefined
                      ? lang === "es"
                        ? "Evaluación inicial"
                        : "Initial assessment"
                      : lang === "es"
                        ? `${activeChild.englishCompletedLessons?.length || 0} de 18`
                        : `${activeChild.englishCompletedLessons?.length || 0} of 18`}
                  </small>
                </button>
                <button className="history-subject" onClick={openHistoryCourse}>
                  <span>🏛️</span>
                  <b>
                    {lang === "es"
                      ? "Historia y cultura"
                      : "History and culture"}
                  </b>
                  <small>
                    {lang === "es"
                      ? `${activeChild.historyCompletedLessons?.length || 0} completadas`
                      : `${activeChild.historyCompletedLessons?.length || 0} completed`}
                  </small>
                </button>
              </div>
            </section>

            <div className="student-content-grid">
              <section className="learning-map-card">
                <div className="map-heading">
                  <div>
                    <span className="section-kicker">LUMITYPE</span>
                    <h3>
                      {lang === "es" ? "Mapa de aprendizaje" : "Learning map"}
                    </h3>
                    <p>
                      {lang === "es"
                        ? "Completa cada misión para abrir la siguiente."
                        : "Complete each mission to unlock the next one."}
                    </p>
                  </div>
                  <span className="map-stage">
                    {lang === "es" ? "ETAPA 1" : "STAGE 1"}
                  </span>
                </div>
                <div className="learning-path">
                  {courseLessons[lang].map((lesson, index) => {
                    const lessonNumber = index + 1;
                    const state = activeChild.completedLessons?.includes(
                      lessonNumber,
                    )
                      ? "completed"
                      : lessonNumber === activeChild.level
                        ? "current"
                        : "locked";
                    return (
                      <article
                        className={`lesson-node ${state}`}
                        key={lesson.title}
                      >
                        <span className="lesson-orb">
                          {state === "completed"
                            ? "✓"
                            : state === "locked"
                              ? "🔒"
                              : lessonNumber}
                        </span>
                        <div>
                          <small>
                            {lang === "es"
                              ? `LECCIÓN ${lessonNumber}`
                              : `LESSON ${lessonNumber}`}
                          </small>
                          <b>{lesson.title}</b>
                          <p>{lesson.skill}</p>
                        </div>
                        {state !== "locked" && (
                          <button
                            onClick={() => startCourseLesson(lessonNumber)}
                          >
                            {state === "completed"
                              ? lang === "es"
                                ? "Repetir"
                                : "Repeat"
                              : lang === "es"
                                ? "Empezar"
                                : "Start"}
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>

              <aside className="student-side">
                <section className="daily-mission">
                  <span className="mission-lumi">✦</span>
                  <small>
                    {lang === "es" ? "MISIÓN DIARIA" : "DAILY MISSION"}
                  </small>
                  <h3>
                    {lang === "es"
                      ? "Completa una lección"
                      : "Complete one lesson"}
                  </h3>
                  <p>
                    {lang === "es"
                      ? "Practica con calma y consigue al menos 80% de precisión."
                      : "Practice calmly and earn at least 80% accuracy."}
                  </p>
                  <div>
                    <i
                      style={{
                        width: `${Math.min(100, (activeChild.completedLessons?.length || 0) * 20)}%`,
                      }}
                    />
                  </div>
                  <span>{activeChild.completedLessons?.length || 0} / 18</span>
                </section>
                <section className="next-reward">
                  <div>
                    <span>🎁</span>
                    <small>
                      {lang === "es" ? "PRÓXIMA RECOMPENSA" : "NEXT REWARD"}
                    </small>
                  </div>
                  <h3>{lang === "es" ? "Cofre violeta" : "Purple chest"}</h3>
                  <p>
                    {lang === "es"
                      ? "Completa 3 lecciones para abrirlo."
                      : "Complete 3 lessons to unlock it."}
                  </p>
                  <div className="reward-stars">
                    ★ ★ <i>★</i>
                  </div>
                </section>
              </aside>
            </div>
          </section>
        </div>
      )}

      {readingOpen && activeChild && (
        <div
          className="reading-backdrop"
          onMouseDown={() => setReadingOpen(false)}
        >
          <section
            className="reading-player"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="reading-header">
              <button
                onClick={() =>
                  readingLesson ? setReadingLesson(null) : setReadingOpen(false)
                }
              >
                ←{" "}
                {readingLesson
                  ? lang === "es"
                    ? "Mapa"
                    : "Map"
                  : lang === "es"
                    ? "Mis materias"
                    : "My subjects"}
              </button>
              <div>
                <span>LUMIREAD</span>
                <b>
                  {readingStage < 7
                    ? lang === "es"
                      ? "Misión inicial"
                      : "First mission"
                    : lang === "es"
                      ? "Aventura de lectura"
                      : "Reading adventure"}
                </b>
              </div>
              <div className="reading-clock">
                <span>⏱</span>
                <b>
                  {String(Math.floor(readingSeconds / 60)).padStart(2, "0")}:
                  {String(readingSeconds % 60).padStart(2, "0")}
                </b>
                <small>/ 05:00</small>
              </div>
            </header>

            {readingStage < 7 && (
              <div className="reading-mission">
                <div className="reading-world">
                  <div className="reading-character character-lumi">
                    <span>✦</span>
                    <i>•‿•</i>
                    <b>Lumi</b>
                  </div>
                  <div className="mission-path">★ · · · · · ★</div>
                  <div className="reading-character character-milo">
                    <span>📚</span>
                    <i>◕‿◕</i>
                    <b>Milo</b>
                  </div>
                </div>
                {(readingStage === 0 || readingStage === 1) && (
                  <div className="reading-dialogue">
                    <span>{readingStage === 0 ? "Lumi" : "Milo"}</span>
                    <h2>
                      {readingStage === 0
                        ? lang === "es"
                          ? `¡Qué bien que estás aquí, ${activeChild.name}!`
                          : `We're glad you're here, ${activeChild.name}!`
                        : lang === "es"
                          ? "Aprenderemos un poco todos los días"
                          : "We will learn a little every day"}
                    </h2>
                    <p>
                      {readingStage === 0
                        ? lang === "es"
                          ? "Necesitamos tu ayuda para una misión muy importante."
                          : "We need your help with a very important mission."
                        : lang === "es"
                          ? "Nosotros te enseñaremos. Cada sesión durará cinco minutos y el reloj te mostrará cuánto llevas."
                          : "We will guide you. Each session takes five minutes and the clock shows your time."}
                    </p>
                    <button
                      className="reading-next"
                      onClick={advanceReadingIntro}
                      aria-label={lang === "es" ? "Continuar" : "Continue"}
                    >
                      →
                    </button>
                  </div>
                )}

                {readingStage === 2 && (
                  <div className="reading-challenge">
                    <small>
                      {lang === "es"
                        ? "OBSERVA CON ATENCIÓN"
                        : "LOOK CAREFULLY"}
                    </small>
                    <h2>
                      {lang === "es"
                        ? "¿Cuántas estrellas ves?"
                        : "How many stars do you see?"}
                    </h2>
                    <div className="counting-objects">⭐ ⭐ ⭐ ⭐ ⭐</div>
                    <div className="reading-options">
                      {[4, 5, 6].map((number) => (
                        <button
                          key={number}
                          onClick={() => answerAssessment(number === 5)}
                        >
                          {number}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {readingStage === 3 && (
                  <div className="reading-challenge">
                    <small>
                      {lang === "es" ? "ARMA LA IMAGEN" : "BUILD THE PICTURE"}
                    </small>
                    <h2>
                      {lang === "es"
                        ? "Presiona las piezas del 1 al 4"
                        : "Press the pieces from 1 to 4"}
                    </h2>
                    <div className="picture-puzzle">
                      {[3, 1, 4, 2].map((piece) => (
                        <button
                          className={
                            readingSequence.includes(piece) ? "placed" : ""
                          }
                          key={piece}
                          onClick={() => chooseSequencePiece(piece, 4)}
                        >
                          <span>{piece}</span>
                          {["☀️", "🏠", "🌳", "☁️"][piece - 1]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {readingStage === 4 && (
                  <div className="reading-challenge">
                    <small>
                      {lang === "es"
                        ? "UNE LOS NÚMEROS"
                        : "CONNECT THE NUMBERS"}
                    </small>
                    <h2>
                      {lang === "es"
                        ? "Forma una casita del 1 al 5"
                        : "Build a little house from 1 to 5"}
                    </h2>
                    <div className="house-dots">
                      <span
                        className={readingSequence.includes(1) ? "joined" : ""}
                        onClick={() => chooseSequencePiece(1, 5)}
                      >
                        1
                      </span>
                      <span
                        className={readingSequence.includes(2) ? "joined" : ""}
                        onClick={() => chooseSequencePiece(2, 5)}
                      >
                        2
                      </span>
                      <span
                        className={readingSequence.includes(3) ? "joined" : ""}
                        onClick={() => chooseSequencePiece(3, 5)}
                      >
                        3
                      </span>
                      <span
                        className={readingSequence.includes(4) ? "joined" : ""}
                        onClick={() => chooseSequencePiece(4, 5)}
                      >
                        4
                      </span>
                      <span
                        className={readingSequence.includes(5) ? "joined" : ""}
                        onClick={() => chooseSequencePiece(5, 5)}
                      >
                        5
                      </span>
                    </div>
                  </div>
                )}

                {readingStage === 5 && (
                  <div className="reading-challenge">
                    <small>{lang === "es" ? "ESCUCHA" : "LISTEN"}</small>
                    <h2>
                      {lang === "es"
                        ? "¿Estos sonidos son iguales?"
                        : "Are these sounds the same?"}
                    </h2>
                    <button
                      className="listen-button"
                      onClick={() =>
                        readingVoice(lang === "es" ? "ma, ma" : "ma, ma")
                      }
                    >
                      🔊 {lang === "es" ? "Oír otra vez" : "Hear again"}
                    </button>
                    <div className="reading-options wide">
                      <button onClick={() => answerAssessment(true)}>
                        {lang === "es" ? "Iguales" : "Same"}
                      </button>
                      <button onClick={() => answerAssessment(false)}>
                        {lang === "es" ? "Diferentes" : "Different"}
                      </button>
                    </div>
                  </div>
                )}

                {readingStage === 6 && (
                  <div className="reading-challenge">
                    <small>
                      {lang === "es" ? "LETRA Y SONIDO" : "LETTER AND SOUND"}
                    </small>
                    <h2>
                      {lang === "es"
                        ? "¿Qué letra hace el sonido mmm?"
                        : "Which letter makes the sound mmm?"}
                    </h2>
                    <button
                      className="listen-button"
                      onClick={() => readingVoice("mmm")}
                    >
                      🔊 mmm
                    </button>
                    <div className="reading-options">
                      {["M", "S", "P"].map((letter) => (
                        <button
                          key={letter}
                          onClick={() => answerAssessment(letter === "M")}
                        >
                          {letter}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {readingFeedback && (
                  <div className="reading-feedback">{readingFeedback}</div>
                )}
                <div className="mission-progress">
                  <i
                    style={{
                      width: `${Math.min(100, ((readingStage + 1) / 7) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {readingStage === 7 && !readingLesson && (
              <div className="reading-map">
                <div className="reading-map-title">
                  <div>
                    <span className="section-kicker">
                      LUMIREAD · 5 MINUTOS AL DÍA
                    </span>
                    <h2>
                      {lang === "es"
                        ? `Tu aventura de lectura, ${activeChild.name}`
                        : `Your reading adventure, ${activeChild.name}`}
                    </h2>
                    <p>
                      {lang === "es"
                        ? "Escucha, juega y aprende. Cada misión abre la siguiente."
                        : "Listen, play and learn. Each mission unlocks the next."}
                    </p>
                  </div>
                  <div className="assessment-badge">
                    <span>🏅</span>
                    <b>
                      {activeChild.readingAssessmentScore ?? readingScore}/5
                    </b>
                    <small>
                      {lang === "es" ? "Misión inicial" : "First mission"}
                    </small>
                  </div>
                </div>
                <div className="reading-lesson-grid">
                  {readingLessons[lang].map((lesson, index) => {
                    const number = index + 1;
                    const completed =
                      activeChild.readingCompletedLessons?.includes(number);
                    const available =
                      completed || number === (activeChild.readingLevel || 1);
                    return (
                      <article
                        className={`${completed ? "completed" : ""} ${available ? "available" : "locked"}`}
                        key={lesson.title}
                      >
                        <span>
                          {completed ? "✓" : available ? number : "🔒"}
                        </span>
                        <div>
                          <small>
                            {lang === "es"
                              ? `LECCIÓN ${number}`
                              : `LESSON ${number}`}
                          </small>
                          <b>{lesson.title}</b>
                          <p>{lesson.skill}</p>
                        </div>
                        {available && (
                          <button onClick={() => startReadingLesson(number)}>
                            {completed
                              ? lang === "es"
                                ? "Repetir"
                                : "Repeat"
                              : lang === "es"
                                ? "Empezar"
                                : "Start"}
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            )}

            {readingStage === 7 &&
              readingLesson &&
              (() => {
                const lesson = readingLessons[lang][readingLesson - 1];
                const exercise = lesson.exercises[readingExercise];
                return (
                  <div className="reading-lesson-player">
                    <div className="reading-exercise-head">
                      <button onClick={() => setReadingLesson(null)}>
                        ← {lang === "es" ? "Mapa" : "Map"}
                      </button>
                      <span>
                        {lang === "es"
                          ? `Ejercicio ${readingExercise + 1} de 5`
                          : `Activity ${readingExercise + 1} of 5`}
                      </span>
                    </div>
                    <div className="reading-exercise-progress">
                      <i
                        style={{
                          width: `${((readingExercise + (readingLessonDone ? 1 : 0)) / 5) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="lesson-book">
                      {exercise.icon ||
                        (exercise.kind === "picture"
                          ? readingPicture(exercise.answer || "")
                          : "📖")}
                    </div>
                    <span className="section-kicker">
                      {lesson.skill.toUpperCase()}
                    </span>
                    <h2>{lesson.title}</h2>
                    {exercise.story && (
                      <div className="reading-story">{exercise.story}</div>
                    )}
                    <div
                      className={
                        exercise.display.length > 45
                          ? "reading-display sentence"
                          : "reading-display"
                      }
                    >
                      {exercise.display}
                    </div>
                    <p>{exercise.prompt}</p>
                    <button
                      className="listen-button"
                      onClick={() => readingVoice(exercise.sound)}
                    >
                      🔊 {lang === "es" ? "Escuchar" : "Listen"}
                    </button>
                    {exercise.kind === "listen" && !readingLessonDone && (
                      <button
                        className="repeat-confirm"
                        onClick={() => void completeReadingExercise()}
                      >
                        ✓{" "}
                        {lang === "es"
                          ? "Ya lo escuché y repetí"
                          : "I listened and repeated"}
                      </button>
                    )}
                    {(exercise.kind === "choice" ||
                      exercise.kind === "picture") &&
                      !readingLessonDone && (
                        <div
                          className={
                            exercise.kind === "picture"
                              ? "lesson-answer-grid picture-answers"
                              : "lesson-answer-grid"
                          }
                        >
                          {exercise.options?.map((option) => (
                            <button
                              disabled={readingBusy}
                              key={option}
                              onClick={() => answerReadingLesson(option)}
                            >
                              {exercise.kind === "picture" && (
                                <span>{readingPicture(option)}</span>
                              )}
                              <b>{option}</b>
                            </button>
                          ))}
                        </div>
                      )}
                    {exercise.kind === "build" && !readingLessonDone && (
                      <>
                        <div className="assembled-word">
                          {readingBuild.length
                            ? readingBuild.join(" + ")
                            : lang === "es"
                              ? "Toca las sílabas en orden"
                              : "Tap the syllables in order"}
                        </div>
                        <div className="syllable-options">
                          {exercise.options?.map((option, index) => (
                            <button
                              key={`${option}-${index}`}
                              onClick={() => chooseReadingSyllable(option)}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                        <button
                          className="clear-build"
                          onClick={() => setReadingBuild([])}
                        >
                          {lang === "es" ? "Borrar intento" : "Clear attempt"}
                        </button>
                      </>
                    )}
                    {readingFeedback && (
                      <div className="reading-feedback">{readingFeedback}</div>
                    )}
                    {readingLessonDone && (
                      <button
                        className="button primary next-reading-lesson"
                        onClick={() =>
                          readingLesson < 18
                            ? startReadingLesson(readingLesson + 1)
                            : setReadingLesson(null)
                        }
                      >
                        {readingLesson < 18
                          ? lang === "es"
                            ? "Siguiente lección →"
                            : "Next lesson →"
                          : lang === "es"
                            ? "Finalizar curso"
                            : "Finish course"}
                      </button>
                    )}
                  </div>
                );
              })()}
          </section>
        </div>
      )}

      {mathOpen && activeChild && (
        <div
          className="reading-backdrop math-backdrop"
          onMouseDown={() => setMathOpen(false)}
        >
          <section
            className="reading-player math-player"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="reading-header math-header">
              <button
                onClick={() =>
                  mathLesson ? setMathLesson(null) : setMathOpen(false)
                }
              >
                ←{" "}
                {mathLesson
                  ? lang === "es"
                    ? "Mapa"
                    : "Map"
                  : lang === "es"
                    ? "Mis materias"
                    : "My subjects"}
              </button>
              <div>
                <span>LUMIMATH</span>
                <b>
                  {lang === "es" ? "Aventura matemática" : "Math adventure"}
                </b>
              </div>
              <div className="math-counter">
                <span>★</span>
                <b>{activeChild.mathCompletedLessons?.length || 0}/36</b>
              </div>
            </header>

            {activeChild.mathAssessmentScore === undefined && (
              <div className="math-assessment">
                <div className="math-mascot">
                  ✦<span>123</span>
                </div>
                <span className="section-kicker">
                  {lang === "es"
                    ? `RETO ${mathAssessmentIndex + 1} DE 5`
                    : `CHALLENGE ${mathAssessmentIndex + 1} OF 5`}
                </span>
                <h2>
                  {lang === "es"
                    ? `Descubramos tu poder matemático, ${activeChild.name}`
                    : `Let's discover your math power, ${activeChild.name}`}
                </h2>
                <p>
                  {lang === "es"
                    ? "Elige la respuesta. Si fallas, no te preocupes: puedes volver a intentarlo."
                    : "Choose the answer. If you miss, don't worry: you can try again."}
                </p>
                <div className="math-equation">
                  {mathAssessment[mathAssessmentIndex].display}
                </div>
                <button
                  className="listen-button"
                  onClick={() =>
                    readingVoice(mathAssessment[mathAssessmentIndex].display)
                  }
                >
                  🔊 {lang === "es" ? "Escuchar" : "Listen"}
                </button>
                <div className="math-answer-grid">
                  {mathAssessment[mathAssessmentIndex].options.map((option) => (
                    <button
                      disabled={mathBusy}
                      key={option}
                      onClick={() => void answerMathAssessment(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {mathFeedback && (
                  <div className="reading-feedback">{mathFeedback}</div>
                )}
                <div className="reading-exercise-progress">
                  <i
                    style={{
                      width: `${((mathAssessmentIndex + 1) / 5) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {activeChild.mathAssessmentScore !== undefined && !mathLesson && (
              <div className="reading-map math-map">
                <div className="reading-map-title">
                  <div>
                    <span className="section-kicker">
                      LUMIMATH · APRENDE JUGANDO
                    </span>
                    <h2>
                      {lang === "es"
                        ? `Tu camino matemático, ${activeChild.name}`
                        : `Your math path, ${activeChild.name}`}
                    </h2>
                    <p>
                      {lang === "es"
                        ? "Primero suma y resta; después multiplicación y división."
                        : "First addition and subtraction; then multiplication and division."}
                    </p>
                  </div>
                  <div className="assessment-badge math-badge">
                    <span>🏅</span>
                    <b>{activeChild.mathAssessmentScore}/5</b>
                    <small>
                      {lang === "es"
                        ? "Evaluación inicial"
                        : "Initial assessment"}
                    </small>
                  </div>
                </div>
                <div className="math-module-title">
                  <span>1</span>
                  <div>
                    <b>
                      {lang === "es"
                        ? "Suma y resta"
                        : "Addition and subtraction"}
                    </b>
                    <small>18 {lang === "es" ? "lecciones" : "lessons"}</small>
                  </div>
                </div>
                <div className="reading-lesson-grid math-lesson-grid">
                  {mathLessons.map((lesson, index) => {
                    const number = index + 1;
                    const completed =
                      activeChild.mathCompletedLessons?.includes(number);
                    const available =
                      completed || number === (activeChild.mathLevel || 1);
                    return (
                      <div key={lesson.es}>
                        {index === 18 && (
                          <div className="math-module-title second">
                            <span>2</span>
                            <div>
                              <b>
                                {lang === "es"
                                  ? "Multiplicación y división"
                                  : "Multiplication and division"}
                              </b>
                              <small>
                                18 {lang === "es" ? "lecciones" : "lessons"}
                              </small>
                            </div>
                          </div>
                        )}
                        <article
                          className={`${completed ? "completed" : ""} ${available ? "available" : "locked"}`}
                        >
                          <span>
                            {completed ? "✓" : available ? number : "🔒"}
                          </span>
                          <div>
                            <small>
                              {lang === "es"
                                ? `LECCIÓN ${number}`
                                : `LESSON ${number}`}
                            </small>
                            <b>
                              {lesson.icon}{" "}
                              {lang === "es" ? lesson.es : lesson.en}
                            </b>
                            <p>
                              {lang === "es" ? lesson.skillEs : lesson.skillEn}
                            </p>
                          </div>
                          {available && (
                            <button onClick={() => startMathLesson(number)}>
                              {completed
                                ? lang === "es"
                                  ? "Repetir"
                                  : "Repeat"
                                : lang === "es"
                                  ? "Empezar"
                                  : "Start"}
                            </button>
                          )}
                        </article>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeChild.mathAssessmentScore !== undefined &&
              mathLesson &&
              (() => {
                const lesson = mathLessons[mathLesson - 1];
                const problem = lesson.problems[mathExercise];
                return (
                  <div className="reading-lesson-player math-lesson-player">
                    <div className="reading-exercise-head">
                      <button onClick={() => setMathLesson(null)}>
                        ← {lang === "es" ? "Mapa" : "Map"}
                      </button>
                      <span>
                        {lang === "es"
                          ? `Ejercicio ${mathExercise + 1} de 5`
                          : `Activity ${mathExercise + 1} of 5`}
                      </span>
                    </div>
                    <div className="reading-exercise-progress">
                      <i
                        style={{
                          width: `${((mathExercise + (mathLessonDone ? 1 : 0)) / 5) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="math-lesson-icon">{lesson.icon}</div>
                    <span className="section-kicker">
                      {(lang === "es"
                        ? lesson.skillEs
                        : lesson.skillEn
                      ).toUpperCase()}
                    </span>
                    <h2>{lang === "es" ? lesson.es : lesson.en}</h2>
                    <p>
                      {lang === "es"
                        ? "Observa, piensa y elige la respuesta correcta."
                        : "Look, think, and choose the correct answer."}
                    </p>
                    <div
                      className={
                        problem.display.length > 25
                          ? "math-equation word-problem"
                          : "math-equation"
                      }
                    >
                      {problem.display}
                    </div>
                    <button
                      className="listen-button"
                      onClick={() => readingVoice(problem.display)}
                    >
                      🔊 {lang === "es" ? "Escuchar reto" : "Hear challenge"}
                    </button>
                    {!mathLessonDone && (
                      <div className="math-answer-grid">
                        {mathOptions(problem, lang).map((option) => (
                          <button
                            disabled={mathBusy}
                            key={option}
                            onClick={() => void answerMathLesson(option)}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    )}
                    {mathFeedback && (
                      <div className="reading-feedback">{mathFeedback}</div>
                    )}
                    {mathLessonDone && (
                      <button
                        className="button primary next-reading-lesson"
                        onClick={() =>
                          mathLesson < 36
                            ? startMathLesson(mathLesson + 1)
                            : setMathLesson(null)
                        }
                      >
                        {mathLesson < 36
                          ? lang === "es"
                            ? "Siguiente lección →"
                            : "Next lesson →"
                          : lang === "es"
                            ? "Finalizar curso"
                            : "Finish course"}
                      </button>
                    )}
                  </div>
                );
              })()}
          </section>
        </div>
      )}

      {englishOpen && activeChild && (
        <div
          className="reading-backdrop english-backdrop"
          onMouseDown={() => setEnglishOpen(false)}
        >
          <section
            className="reading-player english-player"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="reading-header english-header">
              <button
                onClick={() =>
                  englishLesson ? setEnglishLesson(null) : setEnglishOpen(false)
                }
              >
                ←{" "}
                {englishLesson
                  ? lang === "es"
                    ? "Mapa"
                    : "Map"
                  : lang === "es"
                    ? "Mis materias"
                    : "My subjects"}
              </button>
              <div>
                <span>LUMIENGLISH</span>
                <b>
                  {lang === "es" ? "Inglés interactivo" : "Interactive English"}
                </b>
              </div>
              <div className="english-counter">
                <span>🏆</span>
                <b>{activeChild.englishCompletedLessons?.length || 0}/18</b>
              </div>
            </header>

            {activeChild.englishAssessmentScore === undefined && (
              <div className="english-assessment">
                <div className="english-world">
                  🌎<span>Hello!</span>
                </div>
                <span className="section-kicker">
                  {lang === "es"
                    ? `PALABRA ${englishAssessmentIndex + 1} DE 5`
                    : `WORD ${englishAssessmentIndex + 1} OF 5`}
                </span>
                <h2>
                  {lang === "es"
                    ? `Descubramos cuánto inglés conoces, ${activeChild.name}`
                    : `Let's discover how much English you know, ${activeChild.name}`}
                </h2>
                <p>
                  {lang === "es"
                    ? "Mira la imagen, escucha las opciones y elige la palabra correcta."
                    : "Look at the picture, hear the options, and choose the correct word."}
                </p>
                <div className="english-assessment-icon">
                  {englishAssessment[englishAssessmentIndex].prompt}
                </div>
                <button
                  className="listen-button"
                  onClick={() =>
                    englishAssessment[englishAssessmentIndex].options.forEach(
                      (option, index) =>
                        window.setTimeout(
                          () => readingVoice(option),
                          index * 650,
                        ),
                    )
                  }
                >
                  🔊 {lang === "es" ? "Escuchar opciones" : "Hear options"}
                </button>
                <div className="english-choice-grid">
                  {englishAssessment[englishAssessmentIndex].options.map(
                    (option) => (
                      <button
                        disabled={englishBusy}
                        key={option}
                        onClick={() => void answerEnglishAssessment(option)}
                        onMouseEnter={() => readingVoice(option)}
                      >
                        {option}
                      </button>
                    ),
                  )}
                </div>
                {englishFeedback && (
                  <div className="reading-feedback">{englishFeedback}</div>
                )}
                <div className="english-progress">
                  <i
                    style={{
                      width: `${((englishAssessmentIndex + 1) / 5) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {activeChild.englishAssessmentScore !== undefined &&
              !englishLesson && (
                <div className="reading-map english-map">
                  <div className="reading-map-title">
                    <div>
                      <span className="section-kicker">
                        LUMIENGLISH · LISTEN · PLAY · SPEAK
                      </span>
                      <h2>
                        {lang === "es"
                          ? `Tu aventura en inglés, ${activeChild.name}`
                          : `Your English adventure, ${activeChild.name}`}
                      </h2>
                      <p>
                        {lang === "es"
                          ? "Escucha, juega, pronuncia y gana estrellas en cada lección."
                          : "Listen, play, speak, and earn stars in every lesson."}
                      </p>
                    </div>
                    <div className="assessment-badge english-badge">
                      <span>🏅</span>
                      <b>{activeChild.englishAssessmentScore}/5</b>
                      <small>
                        {lang === "es"
                          ? "Evaluación inicial"
                          : "Initial assessment"}
                      </small>
                    </div>
                  </div>
                  <div className="reading-lesson-grid english-lesson-grid">
                    {englishLessons.map((lesson, index) => {
                      const number = index + 1;
                      const completed =
                        activeChild.englishCompletedLessons?.includes(number);
                      const available =
                        completed || number === (activeChild.englishLevel || 1);
                      const beginsModule =
                        index === 0 ||
                        englishLessons[index - 1].module !== lesson.module;
                      return (
                        <div key={lesson.title}>
                          {beginsModule && (
                            <div className="english-module-title">
                              <span>{lesson.module}</span>
                              <div>
                                <b>
                                  {lang === "es"
                                    ? lesson.moduleEs
                                    : lesson.moduleEn}
                                </b>
                                <small>
                                  {lang === "es" ? "MÓDULO" : "MODULE"}{" "}
                                  {lesson.module}
                                </small>
                              </div>
                            </div>
                          )}
                          <article
                            className={`${completed ? "completed" : ""} ${available ? "available" : "locked"}`}
                          >
                            <span>
                              {completed ? "✓" : available ? number : "🔒"}
                            </span>
                            <div>
                              <small>
                                {lang === "es"
                                  ? `LECCIÓN ${number}`
                                  : `LESSON ${number}`}
                              </small>
                              <b>
                                {lesson.words[0].icon} {lesson.title}
                              </b>
                              <p>
                                {lang === "es"
                                  ? lesson.mechanicEs
                                  : lesson.mechanicEn}
                              </p>
                            </div>
                            {available && (
                              <button
                                onClick={() => startEnglishLesson(number)}
                              >
                                {completed
                                  ? lang === "es"
                                    ? "Repetir"
                                    : "Repeat"
                                  : lang === "es"
                                    ? "Empezar"
                                    : "Start"}
                              </button>
                            )}
                          </article>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            {activeChild.englishAssessmentScore !== undefined &&
              englishLesson &&
              (() => {
                const lesson = englishLessons[englishLesson - 1];
                const practiceWord =
                  lesson.words[
                    englishStep === 2
                      ? 1 % lesson.words.length
                      : englishStep === 3
                        ? 2 % lesson.words.length
                        : 3 % lesson.words.length
                  ];
                const stageNames =
                  lang === "es"
                    ? [
                        "Introducción",
                        "Tarjetas con audio",
                        "Práctica interactiva",
                        "Pronunciación",
                        "Evaluación y recompensa",
                      ]
                    : [
                        "Introduction",
                        "Audio flashcards",
                        "Interactive practice",
                        "Pronunciation",
                        "Quiz and reward",
                      ];
                return (
                  <div className="english-lesson-player">
                    <div className="reading-exercise-head">
                      <button onClick={() => setEnglishLesson(null)}>
                        ← {lang === "es" ? "Mapa" : "Map"}
                      </button>
                      <span>
                        {englishStep + 1}/5 · {stageNames[englishStep]}
                      </span>
                    </div>
                    <div className="english-progress">
                      <i
                        style={{
                          width: `${((englishStep + (englishLessonDone ? 1 : 0)) / 5) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="section-kicker">
                      {lang === "es"
                        ? `MÓDULO ${lesson.module}`
                        : `MODULE ${lesson.module}`}
                    </span>
                    <h2>{lesson.title}</h2>
                    {englishStep === 0 && (
                      <div className="english-stage">
                        <div className="english-scene">
                          {lesson.words.map((word) => (
                            <span key={word.word}>{word.icon}</span>
                          ))}
                        </div>
                        <p>
                          {lang === "es"
                            ? lesson.mechanicEs
                            : lesson.mechanicEn}
                        </p>
                        <button
                          className="button primary"
                          onClick={() => {
                            readingVoice(
                              `${lesson.title}. ${lesson.words.map((word) => word.word).join(", ")}`,
                            );
                            void advanceEnglishStep();
                          }}
                        >
                          ▶{" "}
                          {lang === "es"
                            ? "Escuchar y comenzar"
                            : "Listen and begin"}
                        </button>
                      </div>
                    )}
                    {englishStep === 1 && (
                      <div className="english-stage">
                        <p>
                          {lang === "es"
                            ? "Presiona cada tarjeta para escuchar su pronunciación."
                            : "Press each card to hear its pronunciation."}
                        </p>
                        <div className="english-flashcards">
                          {lesson.words.map((word) => (
                            <button
                              key={word.word}
                              onClick={() => readingVoice(word.word)}
                            >
                              <span>{word.icon}</span>
                              <b>{word.word}</b>
                              <small>{word.meaning}</small>
                              <i>🔊</i>
                            </button>
                          ))}
                        </div>
                        <button
                          className="button primary"
                          onClick={() => void advanceEnglishStep()}
                        >
                          ✓{" "}
                          {lang === "es"
                            ? "Escuché las palabras"
                            : "I heard the words"}
                        </button>
                      </div>
                    )}
                    {(englishStep === 2 || englishStep === 4) &&
                      !englishLessonDone && (
                        <div className="english-stage">
                          <p>
                            {englishStep === 2
                              ? lang === "es"
                                ? "Escucha y selecciona la imagen correcta."
                                : "Listen and select the correct picture."
                              : lang === "es"
                                ? "Último reto: elige la palabra correcta."
                                : "Final challenge: choose the correct word."}
                          </p>
                          <button
                            className="english-sound-orb"
                            onClick={() => readingVoice(practiceWord.word)}
                          >
                            🔊
                            <small>
                              {lang === "es" ? "Escuchar" : "Listen"}
                            </small>
                          </button>
                          <div className="english-picture-choices">
                            {englishChoices(lesson, practiceWord).map(
                              (word) => (
                                <button
                                  key={word.word}
                                  onClick={() =>
                                    answerEnglishPractice(word.word)
                                  }
                                >
                                  <span>{word.icon}</span>
                                  <b>{word.word}</b>
                                </button>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                    {englishStep === 3 && (
                      <div className="english-stage pronunciation-stage">
                        <p>
                          {lang === "es"
                            ? "Presiona el micrófono y di la palabra en inglés."
                            : "Press the microphone and say the English word."}
                        </p>
                        <div className="pronunciation-word">
                          <span>{practiceWord.icon}</span>
                          <b>{practiceWord.word}</b>
                          <small>{practiceWord.meaning}</small>
                        </div>
                        <button
                          className={`microphone-button ${englishListening ? "listening" : ""}`}
                          onClick={startEnglishPronunciation}
                        >
                          🎙️
                          <small>
                            {englishListening
                              ? lang === "es"
                                ? "Escuchando…"
                                : "Listening…"
                              : lang === "es"
                                ? "Pronunciar"
                                : "Speak"}
                          </small>
                        </button>
                        <button
                          className="said-it-button"
                          onClick={() => void advanceEnglishStep()}
                        >
                          {lang === "es"
                            ? "Ya lo dije en voz alta"
                            : "I said it aloud"}
                        </button>
                      </div>
                    )}
                    {englishFeedback && (
                      <div className="reading-feedback">{englishFeedback}</div>
                    )}
                    {englishLessonDone && (
                      <div className="english-reward">
                        <span>🏆</span>
                        <h3>
                          {lang === "es"
                            ? "¡Dos estrellas para ti!"
                            : "Two stars for you!"}
                        </h3>
                        <button
                          className="button primary"
                          onClick={() =>
                            englishLesson < 18
                              ? startEnglishLesson(englishLesson + 1)
                              : setEnglishLesson(null)
                          }
                        >
                          {englishLesson < 18
                            ? lang === "es"
                              ? "Siguiente lección →"
                              : "Next lesson →"
                            : lang === "es"
                              ? "Finalizar curso"
                              : "Finish course"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
          </section>
        </div>
      )}

      {historyOpen && activeChild && (
        <div
          className="reading-backdrop history-backdrop"
          onMouseDown={() => setHistoryOpen(false)}
        >
          <section
            className="reading-player history-player"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="reading-header history-header">
              <button
                onClick={() =>
                  historyLesson ? setHistoryLesson(null) : setHistoryOpen(false)
                }
              >
                ←{" "}
                {historyLesson
                  ? lang === "es"
                    ? "Mapa"
                    : "Map"
                  : lang === "es"
                    ? "Mis materias"
                    : "My subjects"}
              </button>
              <div>
                <span>LUMIHISTORY</span>
                <b>
                  {lang === "es" ? "Historia y cultura" : "History and culture"}
                </b>
              </div>
              <div className="history-counter">
                🏛️{" "}
                <b>
                  {activeChild.historyCompletedLessons?.length || 0}/
                  {visibleHistoryLessons.length}
                </b>
              </div>
            </header>
            {!historyLesson && (
              <div className="history-map">
                <div className="reading-map-title">
                  <div>
                    <span className="section-kicker">
                      VIDEO · DESCUBRE · RESPONDE
                    </span>
                    <h2>
                      {lang === "es"
                        ? `Viaja por la historia, ${activeChild.name}`
                        : `Travel through history, ${activeChild.name}`}
                    </h2>
                    <p>
                      {lang === "es"
                        ? "Mira cada video, responde el cuestionario y consigue al menos 80% para completar la misión."
                        : "Watch each video, answer the quiz, and score at least 80% to complete the mission."}
                    </p>
                  </div>
                </div>
                <div className="history-lesson-grid">
                  {visibleHistoryLessons.map((lesson, index) => (
                    <article
                      key={lesson.id}
                      className={
                        activeChild.historyCompletedLessons?.includes(lesson.id)
                          ? "completed"
                          : ""
                      }
                    >
                      <span>
                        {activeChild.historyCompletedLessons?.includes(
                          lesson.id,
                        )
                          ? "✓"
                          : index + 1}
                      </span>
                      <div>
                        <small>
                          {lesson.country.toUpperCase()} ·{" "}
                          {lesson.level === "both"
                            ? lang === "es"
                              ? "TODOS LOS NIVELES"
                              : "ALL LEVELS"
                            : lesson.level.toUpperCase()}
                        </small>
                        <b>{lang === "es" ? lesson.titleEs : lesson.titleEn}</b>
                        <p>
                          {lang === "es"
                            ? lesson.descriptionEs
                            : lesson.descriptionEn}
                        </p>
                        <small className="course-teacher-name">
                          {lesson.creatorName || "Lumi Academy"} · {lesson.price > 0 ? `${lesson.price} Bs` : lang === "es" ? "GRATIS" : "FREE"}
                        </small>
                      </div>
                      <button onClick={() => hasHistoryAccess(lesson) ? startHistoryLesson(lesson) : beginCoursePurchase(lesson)}>
                        {hasHistoryAccess(lesson)
                          ? activeChild.historyCompletedLessons?.includes(lesson.id)
                            ? lang === "es" ? "Repetir" : "Repeat"
                            : lang === "es" ? "Comenzar" : "Start"
                          : lang === "es" ? `Comprar · ${lesson.price} Bs` : `Buy · ${lesson.price} Bs`}
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            )}
            {historyLesson && (
              <div className="history-lesson-player">
                <div className="history-title">
                  <span>🏛️</span>
                  <div>
                    <small>{historyLesson.country}</small>
                    <h2>
                      {lang === "es"
                        ? historyLesson.titleEs
                        : historyLesson.titleEn}
                    </h2>
                  </div>
                </div>
                <div className="history-learning-layout">
                  <div className="history-video">
                    {youtubeEmbed(historyLesson.youtubeUrl) ? (
                      <iframe
                        src={youtubeEmbed(historyLesson.youtubeUrl)}
                        title={
                          lang === "es"
                            ? historyLesson.titleEs
                            : historyLesson.titleEn
                        }
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    ) : (
                      <div className="history-content-warning">
                        🎬
                        <b>
                          {lang === "es"
                            ? "El enlace del video necesita ser corregido"
                            : "The video link needs to be corrected"}
                        </b>
                      </div>
                    )}
                    <p>
                      {lang === "es"
                        ? historyLesson.descriptionEs
                        : historyLesson.descriptionEn}
                    </p>
                  </div>
                  <div className="history-quiz">
                    {historyLesson.questions.length === 0 ? (
                      <div className="history-content-warning">
                        📝
                        <b>
                          {lang === "es"
                            ? "Esta lección todavía no tiene preguntas válidas"
                            : "This lesson does not have valid questions yet"}
                        </b>
                        <p>
                          {lang === "es"
                            ? "El docente debe editarla y guardar al menos una pregunta con sus opciones."
                            : "The teacher must edit it and save at least one question with options."}
                        </p>
                      </div>
                    ) : !historyDone ? (
                      <>
                        <span className="section-kicker">
                          {lang === "es"
                            ? `PREGUNTA ${historyQuestion + 1} DE ${historyLesson.questions.length}`
                            : `QUESTION ${historyQuestion + 1} OF ${historyLesson.questions.length}`}
                        </span>
                        <h3>
                          {historyLesson.questions[historyQuestion].question}
                        </h3>
                        <div>
                          {historyLesson.questions[historyQuestion].options.map(
                            (option, index) => (
                              <button
                                disabled={!!historyFeedback}
                                key={`${option}-${index}`}
                                onClick={() => void answerHistory(index)}
                              >
                                {option}
                              </button>
                            ),
                          )}
                        </div>
                        {historyFeedback && (
                          <aside>
                            <p>{historyFeedback}</p>
                            <button
                              className="button primary"
                              onClick={() => void nextHistoryQuestion()}
                            >
                              {historyQuestion <
                              historyLesson.questions.length - 1
                                ? lang === "es"
                                  ? "Siguiente pregunta →"
                                  : "Next question →"
                                : lang === "es"
                                  ? "Ver resultado"
                                  : "See result"}
                            </button>
                          </aside>
                        )}
                      </>
                    ) : (
                      <div className="history-result">
                        <span>
                          {Math.round(
                            (historyScore / historyLesson.questions.length) *
                              100,
                          ) >= 80
                            ? "🏆"
                            : "💪"}
                        </span>
                        <h3>
                          {Math.round(
                            (historyScore / historyLesson.questions.length) *
                              100,
                          )}
                          %
                        </h3>
                        <p>
                          {Math.round(
                            (historyScore / historyLesson.questions.length) *
                              100,
                          ) >= 80
                            ? lang === "es"
                              ? "¡Misión completada! Ganaste dos estrellas."
                              : "Mission complete! You earned two stars."
                            : lang === "es"
                              ? "No te preocupes. Mira nuevamente el video y vuelve a intentarlo."
                              : "Don't worry. Watch the video again and try once more."}
                        </p>
                        <button
                          className="button primary"
                          onClick={() => startHistoryLesson(historyLesson)}
                        >
                          {lang === "es"
                            ? "Repetir cuestionario"
                            : "Repeat quiz"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {courseLesson &&
        activeChild &&
        (() => {
          const lesson = courseLessons[lang][courseLesson - 1];
          const courseCurrent = courseTarget[courseTyped] || "";
          const activeFinger = fingerForKey(courseCurrent);
          const liveAccuracy =
            courseTyped + courseMistakes === 0
              ? 100
              : Math.round(
                  (courseTyped / (courseTyped + courseMistakes)) * 100,
                );
          return (
            <div
              className="course-backdrop"
              onMouseDown={() => setCourseLesson(null)}
            >
              <section
                className={`course-player student-theme-${world} ${bigText ? "student-big-text" : ""}`}
                onMouseDown={(event) => event.stopPropagation()}
              >
                <header className="course-player-head">
                  <button onClick={() => setCourseLesson(null)}>
                    ← {lang === "es" ? "Mapa" : "Map"}
                  </button>
                  <div>
                    <span>LUMITYPE</span>
                    <b>
                      {lang === "es"
                        ? `Lección ${courseLesson} de 18`
                        : `Lesson ${courseLesson} of 18`}
                    </b>
                  </div>
                  <div className="course-player-actions">
                    <button
                      className={`course-sound ${sound ? "on" : ""}`}
                      onClick={() => {
                        if (sound && typeof window !== "undefined")
                          window.speechSynthesis?.cancel();
                        setSound(!sound);
                      }}
                      aria-label={
                        sound
                          ? lang === "es"
                            ? "Silenciar sonidos"
                            : "Mute sounds"
                          : lang === "es"
                            ? "Activar sonidos"
                            : "Enable sounds"
                      }
                    >
                      {sound ? "🔊" : "🔇"}
                    </button>
                    <button
                      className="student-close"
                      onClick={() => setCourseLesson(null)}
                    >
                      ×
                    </button>
                  </div>
                </header>
                <div className="course-progress-line">
                  <i
                    style={{
                      width: `${(courseTyped / Math.max(1, courseTarget.length)) * 100}%`,
                    }}
                  />
                </div>

                <div className="course-player-body">
                  <div className="course-title">
                    <span>{activeChild.avatar}</span>
                    <div>
                      <small>{lesson.skill}</small>
                      <h2>{lesson.title}</h2>
                      <p>
                        {courseLesson === 1
                          ? lang === "es"
                            ? "Busca las pequeñas ranuras de F y J, acomoda allí tus índices y presiona todas las teclas iluminadas."
                            : "Find the small guides on F and J, place your index fingers there and press every highlighted key."
                          : courseLesson === 18
                            ? lang === "es"
                              ? "Escribe el texto completo. Verás tus palabras por minuto en tiempo real y necesitas 80% de precisión."
                              : "Type the full text. You will see your words per minute live and need 80% accuracy."
                            : lang === "es"
                              ? "Escribe el ejercicio con calma. Necesitas 80% de precisión para avanzar."
                              : "Type calmly. You need 80% accuracy to move forward."}
                      </p>
                    </div>
                  </div>

                  {!courseResult ? (
                    <>
                      <div className="course-target" aria-live="polite">
                        {courseTarget.split("").map((letter, index) => (
                          <span
                            key={index}
                            className={`${letter === " " ? "space-character" : ""} ${index < courseTyped ? "done" : index === courseTyped ? "now" : ""}`}
                          >
                            {letter === " " ? "\u00A0" : letter}
                          </span>
                        ))}
                      </div>
                      <input
                        autoFocus
                        className="course-capture"
                        value=""
                        onChange={() => {}}
                        onKeyDown={handleCourseKey}
                        autoComplete="off"
                        autoCapitalize="off"
                        aria-label={
                          lang === "es"
                            ? "Escribe el ejercicio"
                            : "Type the exercise"
                        }
                        placeholder={
                          lang === "es"
                            ? "Haz clic aquí y comienza…"
                            : "Click here and start…"
                        }
                      />
                      <div className="finger-instruction">
                        <span>☝</span>
                        <div>
                          <small>
                            {lang === "es" ? "DEDO CORRECTO" : "CORRECT FINGER"}
                          </small>
                          <b>{fingerNames[activeFinger][lang]}</b>
                        </div>
                      </div>
                      <div className="course-keyboard-wrap">
                        {hands && (
                          <div className="hand-guide" aria-hidden="true">
                            <div className="guide-hand left-guide-hand">
                              <div className="guide-palm" />
                              {(
                                [
                                  "l-pinky",
                                  "l-ring",
                                  "l-middle",
                                  "l-index",
                                ] as FingerId[]
                              ).map((finger) => (
                                <span
                                  key={finger}
                                  className={`guide-finger ${finger} ${activeFinger === finger ? "finger-active" : ""} ${pressedFinger === finger ? "finger-pressed" : ""}`}
                                >
                                  <i />
                                </span>
                              ))}
                              <span
                                className={`guide-thumb left-thumb ${activeFinger === "thumb" ? "finger-active" : ""} ${pressedFinger === "thumb" ? "finger-pressed" : ""}`}
                              >
                                <i />
                              </span>
                            </div>
                            <div className="guide-hand right-guide-hand">
                              <div className="guide-palm" />
                              {(
                                [
                                  "r-index",
                                  "r-middle",
                                  "r-ring",
                                  "r-pinky",
                                ] as FingerId[]
                              ).map((finger) => (
                                <span
                                  key={finger}
                                  className={`guide-finger ${finger} ${activeFinger === finger ? "finger-active" : ""} ${pressedFinger === finger ? "finger-pressed" : ""}`}
                                >
                                  <i />
                                </span>
                              ))}
                              <span
                                className={`guide-thumb right-thumb ${activeFinger === "thumb" ? "finger-active" : ""} ${pressedFinger === "thumb" ? "finger-pressed" : ""}`}
                              >
                                <i />
                              </span>
                            </div>
                          </div>
                        )}
                        <div
                          className="course-keyboard"
                          aria-label={
                            lang === "es"
                              ? "Teclado español completo"
                              : "Full English keyboard"
                          }
                        >
                          {typingKeyboard[lang].map((row, rowIndex) => (
                            <div
                              className={`physical-row row-${rowIndex}`}
                              key={rowIndex}
                            >
                              {row.map((key, keyIndex) => {
                                const active = visualKeyMatches(
                                  key,
                                  courseCurrent,
                                );
                                const shiftActive =
                                  key.wide === "shift" &&
                                  needsShift(courseCurrent);
                                return (
                                  <span
                                    className={`${key.wide ? `key-${key.wide}` : ""} ${active || shiftActive ? "active" : ""}`}
                                    key={`${key.label}-${keyIndex}`}
                                  >
                                    {key.label
                                      .split("\n")
                                      .map((part, partIndex) => (
                                        <i key={partIndex}>{part}</i>
                                      ))}
                                  </span>
                                );
                              })}
                            </div>
                          ))}
                          <div className="physical-row space-row">
                            <span
                              className={`course-space ${courseCurrent === " " ? "active" : ""}`}
                            >
                              <i>{lang === "es" ? "ESPACIO" : "SPACE"}</i>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="course-live-stats">
                        <span>
                          <b>
                            {courseLesson === 1
                              ? `${courseTyped}/${courseTarget.length}`
                              : `${liveAccuracy}%`}
                          </b>
                          <small>
                            {courseLesson === 1
                              ? lang === "es"
                                ? "Teclas ubicadas"
                                : "Keys found"
                              : t.accuracy}
                          </small>
                        </span>
                        <span>
                          <b>
                            {courseLesson === 18
                              ? Math.round(
                                  courseTyped /
                                    5 /
                                    (Math.max(1, courseElapsedSeconds) / 60),
                                )
                              : courseMistakes}
                          </b>
                          <small>
                            {courseLesson === 18
                              ? lang === "es"
                                ? "Palabras/min"
                                : "Words/min"
                              : lang === "es"
                                ? "Intentos"
                                : "Attempts"}
                          </small>
                        </span>
                        <span>
                          <b>
                            {courseTyped}/{courseTarget.length}
                          </b>
                          <small>
                            {lang === "es" ? "Progreso" : "Progress"}
                          </small>
                        </span>
                      </div>
                    </>
                  ) : (
                    <div
                      className={`course-result ${courseResult.passed ? "passed" : "retry"}`}
                    >
                      <div className="result-lumi">
                        {courseResult.passed ? "🌟" : "💪"}
                      </div>
                      <span>
                        {courseResult.passed
                          ? lang === "es"
                            ? "¡LECCIÓN COMPLETADA!"
                            : "LESSON COMPLETE!"
                          : lang === "es"
                            ? "¡CASI LO LOGRAS!"
                            : "ALMOST THERE!"}
                      </span>
                      <h2>
                        {courseResult.passed
                          ? lang === "es"
                            ? `¡Excelente, ${activeChild.name}!`
                            : `Great job, ${activeChild.name}!`
                          : lang === "es"
                            ? "Vamos a intentarlo otra vez"
                            : "Let's try one more time"}
                      </h2>
                      <p>
                        {courseResult.passed
                          ? lang === "es"
                            ? "Tu avance quedó guardado y abriste una nueva lección."
                            : "Your progress is saved and a new lesson is unlocked."
                          : lang === "es"
                            ? "Practica más despacio para alcanzar 80% de precisión."
                            : "Slow down to reach 80% accuracy."}
                      </p>
                      <div
                        className={`result-score ${courseResult.wpm !== undefined ? "with-wpm" : ""}`}
                      >
                        <span>
                          <b>{courseResult.accuracy}%</b>
                          <small>{t.accuracy}</small>
                        </span>
                        {courseResult.wpm !== undefined && (
                          <span>
                            <b>{courseResult.wpm}</b>
                            <small>
                              {lang === "es" ? "Palabras/min" : "Words/min"}
                            </small>
                          </span>
                        )}
                        <span>
                          <b>
                            {courseResult.stars
                              ? "★".repeat(courseResult.stars)
                              : "—"}
                          </b>
                          <small>{t.stars}</small>
                        </span>
                      </div>
                      <button
                        disabled={courseBusy}
                        className="button primary"
                        onClick={() =>
                          courseResult.passed && courseLesson < 18
                            ? startCourseLesson(courseLesson + 1)
                            : startCourseLesson(
                                courseLesson,
                                !courseResult.passed,
                              )
                        }
                      >
                        {courseBusy
                          ? lang === "es"
                            ? "Guardando…"
                            : "Saving…"
                          : courseResult.passed && courseLesson < 18
                            ? lang === "es"
                              ? "Siguiente lección"
                              : "Next lesson"
                            : courseResult.passed
                              ? lang === "es"
                                ? "Repetir reto"
                                : "Repeat challenge"
                              : lang === "es"
                                ? "Practicar con otro ejercicio"
                                : "Practice with another exercise"}
                      </button>
                      <small className="enter-hint">
                        ↵{" "}
                        {lang === "es"
                          ? "También puedes presionar Enter"
                          : "You can also press Enter"}
                      </small>
                    </div>
                  )}
                </div>
              </section>
            </div>
          );
        })()}

      {purchaseLesson && account && (
        <div className="modal-backdrop purchase-backdrop" onMouseDown={() => setPurchaseLesson(null)}>
          <section className="purchase-panel" onMouseDown={(event) => event.stopPropagation()}>
            <button className="purchase-close" onClick={() => setPurchaseLesson(null)}>×</button>
            <span className="section-kicker">COMPRA SEGURA · LUMI ACADEMY</span>
            <h2>{lang === "es" ? purchaseLesson.titleEs : purchaseLesson.titleEn}</h2>
            <p>{purchaseLesson.creatorName || "Lumi Academy"}</p>
            <div className="purchase-price"><b>{purchaseLesson.price} Bs</b><small>{lang === "es" ? "Acceso para un estudiante" : "Access for one student"}</small></div>
            <label>
              {lang === "es" ? "¿Quién realizará el curso?" : "Who will take the course?"}
              <select value={purchaseChildId} onChange={(event) => setPurchaseChildId(event.target.value)}>
                {children.map((child) => <option value={child.id} key={child.id}>{child.avatar} {child.name}</option>)}
              </select>
            </label>
            <div className="payment-options">
              <button className={paymentMethod === "qr" ? "selected" : ""} onClick={() => setPaymentMethod("qr")}><span>▦</span><b>Pago QR</b><small>{lang === "es" ? "Confirmación manual" : "Manual confirmation"}</small></button>
              <button className={paymentMethod === "cash" ? "selected" : ""} onClick={() => setPaymentMethod("cash")}><span>💵</span><b>{lang === "es" ? "Efectivo" : "Cash"}</b><small>{lang === "es" ? "Registrar entrega" : "Register payment"}</small></button>
            </div>
            <aside className="commission-note"><span>Lumi Academy 10%: {(purchaseLesson.price * .1).toFixed(2)} Bs</span><span>Maestro 90%: {(purchaseLesson.price * .9).toFixed(2)} Bs</span></aside>
            {purchaseMessage && <p className="purchase-message">{purchaseMessage}</p>}
            <button className="button primary purchase-submit" disabled={purchaseBusy} onClick={() => void createCoursePurchase()}>{purchaseBusy ? "Registrando…" : lang === "es" ? "Registrar solicitud de compra" : "Register purchase request"}</button>
            <small className="purchase-help">{lang === "es" ? "El curso se habilitará después de confirmar el pago." : "The course will unlock after payment confirmation."}</small>
          </section>
        </div>
      )}

      {adminOpen && isCourseCreator && (
        <div
          className="modal-backdrop admin-backdrop"
          onMouseDown={() => setAdminOpen(false)}
        >
          <section
            className="admin-panel"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <span className="section-kicker">
                  LUMI ACADEMY · {isAdmin ? "ADMINISTRACIÓN" : "DOCENTES"}
                </span>
                <h2>{isAdmin
                  ? lang === "es" ? "Reportes de Lumi Academy" : "Lumi Academy reports"
                  : lang === "es" ? "Mis cursos y ganancias" : "My courses and earnings"}</h2>
                <p>
                  {account?.email} ·{" "}
                  {isAdmin
                    ? lang === "es"
                      ? "Administrador general"
                      : "General administrator"
                    : lang === "es"
                      ? "Docente creador"
                      : "Teacher creator"}
                </p>
              </div>
              <div className="admin-header-actions">
                <button
                  className="admin-signout"
                  onClick={() => void signOut(auth)}
                >
                  ↪ {lang === "es" ? "Cerrar sesión" : "Sign out"}
                </button>
                <button
                  className="admin-close"
                  aria-label={lang === "es" ? "Cerrar panel" : "Close panel"}
                  onClick={() => setAdminOpen(false)}
                >
                  ×
                </button>
              </div>
            </header>
            <div className={`admin-layout ${isAdmin ? "owner-only-reports" : "teacher-course-panel"}`}>
              <section className="sales-report-panel">
                <div className="report-card-grid">
                  <article><span>💳</span><small>VENTAS CONFIRMADAS</small><b>{reportTotals.sales.toFixed(2)} Bs</b></article>
                  <article><span>✦</span><small>COMISIÓN LUMI · 10%</small><b>{reportTotals.platform.toFixed(2)} Bs</b></article>
                  <article><span>🧑‍🏫</span><small>MAESTROS · 90%</small><b>{reportTotals.teachers.toFixed(2)} Bs</b></article>
                  <article><span>⏳</span><small>PAGOS PENDIENTES</small><b>{reportTotals.pending}</b></article>
                </div>
                <div className="sales-table-wrap">
                  <h3>{isAdmin ? "VENTAS Y SOLICITUDES" : "MIS VENTAS"}</h3>
                  {purchases.length === 0 ? <p className="admin-empty">Aún no existen ventas registradas.</p> : (
                    <div className="sales-table">
                      {purchases.map((purchase) => (
                        <article key={purchase.id}>
                          <div><b>{purchase.courseTitle}</b><small>{purchase.childName} · {purchase.buyerEmail}</small></div>
                          <span>{purchase.paymentMethod === "qr" ? "QR" : "EFECTIVO"}</span>
                          <strong>{purchase.price.toFixed(2)} Bs</strong>
                          <em className={`status-${purchase.status}`}>{purchase.status === "pending" ? "PENDIENTE" : purchase.status === "confirmed" ? "CONFIRMADO" : purchase.status.toUpperCase()}</em>
                          {isAdmin && purchase.status === "pending" && <div className="sale-actions"><button onClick={() => void updatePurchaseStatus(purchase, "confirmed")}>✓ Confirmar</button><button onClick={() => void updatePurchaseStatus(purchase, "rejected")}>Rechazar</button></div>}
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </section>
              <aside>
                <button className="button primary" onClick={newHistoryDraft}>
                  ＋ {lang === "es" ? "Nueva lección" : "New lesson"}
                </button>
                {isAdmin && (
                  <section className="teacher-manager">
                    <h3>DOCENTES CREADORES</h3>
                    <input placeholder="Nombre de la maestra" value={teacherName} onChange={(event) => setTeacherName(event.target.value)} />
                    <input type="email" placeholder="correo@ejemplo.com" value={teacherEmail} onChange={(event) => setTeacherEmail(event.target.value)} />
                    <button className="teacher-add" onClick={() => void saveCourseCreator()}>＋ Autorizar maestra</button>
                    {courseCreators.map((creator) => (
                      <button className="teacher-row" key={creator.email} onClick={() => void toggleCourseCreator(creator)}>
                        <span>{creator.active ? "🟢" : "⚪"}</span><div><b>{creator.name}</b><small>{creator.email}</small></div>
                      </button>
                    ))}
                  </section>
                )}
                <h3>
                  {lang === "es" ? "Lecciones guardadas" : "Saved lessons"}
                </h3>
                {editableHistoryLessons.length === 0 && (
                  <p className="admin-empty">
                    {lang === "es"
                      ? "Aún no hay lecciones guardadas. Crea la primera."
                      : "No saved lessons yet. Create the first one."}
                  </p>
                )}
                {editableHistoryLessons.map((lesson) => (
                  <button
                    className={adminEditingId === lesson.id ? "selected" : ""}
                    key={lesson.id}
                    onClick={() => editHistoryLesson(lesson)}
                  >
                    <span>{lesson.published ? "🟢" : "⚪"}</span>
                    <div>
                      <b>{lesson.titleEs}</b>
                      <small>
                        {lesson.country} · {lesson.questions.length} preguntas
                      </small>
                    </div>
                  </button>
                ))}
              </aside>
              <main className="admin-editor">
                <div className="admin-form-grid">
                  <label>
                    {lang === "es" ? "Orden" : "Order"}
                    <input
                      type="number"
                      min="1"
                      value={historyDraft.order}
                      onChange={(e) =>
                        setHistoryDraft({
                          ...historyDraft,
                          order: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label>
                    {lang === "es" ? "País o región" : "Country or region"}
                    <input
                      value={historyDraft.country}
                      onChange={(e) =>
                        setHistoryDraft({
                          ...historyDraft,
                          country: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    {lang === "es" ? "Precio por estudiante (Bs)" : "Price per student (Bs)"}
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={historyDraft.price}
                      onChange={(e) =>
                        setHistoryDraft({
                          ...historyDraft,
                          price: Math.max(0, Number(e.target.value)),
                        })
                      }
                    />
                    <small>90% maestro · 10% Lumi Academy</small>
                  </label>
                  <label>
                    {lang === "es" ? "Nivel" : "Level"}
                    <select
                      value={historyDraft.level}
                      onChange={(e) =>
                        setHistoryDraft({
                          ...historyDraft,
                          level: e.target.value as HistoryLesson["level"],
                        })
                      }
                    >
                      <option value="both">Primaria y secundaria</option>
                      <option value="primary">Primaria</option>
                      <option value="secondary">Secundaria</option>
                    </select>
                  </label>
                  <label className="publish-check">
                    <input
                      type="checkbox"
                      checked={historyDraft.published}
                      onChange={(e) =>
                        setHistoryDraft({
                          ...historyDraft,
                          published: e.target.checked,
                        })
                      }
                    />
                    {lang === "es"
                      ? "Publicar para estudiantes"
                      : "Publish for students"}
                  </label>
                </div>
                <label>
                  {lang === "es" ? "Título en español" : "Spanish title"}
                  <input
                    value={historyDraft.titleEs}
                    onChange={(e) =>
                      setHistoryDraft({
                        ...historyDraft,
                        titleEs: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  {lang === "es" ? "Título en inglés" : "English title"}
                  <input
                    value={historyDraft.titleEn}
                    onChange={(e) =>
                      setHistoryDraft({
                        ...historyDraft,
                        titleEn: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  {lang === "es"
                    ? "Enlace del video de YouTube"
                    : "YouTube video link"}
                  <input
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={historyDraft.youtubeUrl}
                    onChange={(e) =>
                      setHistoryDraft({
                        ...historyDraft,
                        youtubeUrl: e.target.value,
                      })
                    }
                  />
                </label>
                {historyDraft.youtubeUrl && (
                  <div className="history-video-preview">
                    {youtubeEmbed(historyDraft.youtubeUrl) ? (
                      <iframe src={youtubeEmbed(historyDraft.youtubeUrl)} title="Vista previa del video" allowFullScreen />
                    ) : (
                      <p className="form-error">No reconocemos este enlace. Copia el enlace desde “Compartir” en YouTube.</p>
                    )}
                  </div>
                )}
                <div className="admin-form-grid">
                  <label>
                    {lang === "es"
                      ? "Descripción en español"
                      : "Spanish description"}
                    <textarea
                      value={historyDraft.descriptionEs}
                      onChange={(e) =>
                        setHistoryDraft({
                          ...historyDraft,
                          descriptionEs: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    {lang === "es"
                      ? "Descripción en inglés"
                      : "English description"}
                    <textarea
                      value={historyDraft.descriptionEn}
                      onChange={(e) =>
                        setHistoryDraft({
                          ...historyDraft,
                          descriptionEn: e.target.value,
                        })
                      }
                    />
                  </label>
                </div>
                <div className="question-editor-head">
                  <h3>{lang === "es" ? "Cuestionario" : "Questionnaire"}</h3>
                  <button
                    onClick={() =>
                      setHistoryDraft({
                        ...historyDraft,
                        questions: [
                          ...historyDraft.questions,
                          {
                            question: "",
                            options: ["", "", ""],
                            answer: 0,
                            explanation: "",
                          },
                        ],
                      })
                    }
                  >
                    ＋ {lang === "es" ? "Agregar pregunta" : "Add question"}
                  </button>
                </div>
                {historyDraft.questions.map((question, qIndex) => (
                  <section className="admin-question" key={qIndex}>
                    <header>
                      <b>
                        {lang === "es"
                          ? `Pregunta ${qIndex + 1}`
                          : `Question ${qIndex + 1}`}
                      </b>
                      {historyDraft.questions.length > 1 && (
                        <button
                          onClick={() =>
                            setHistoryDraft({
                              ...historyDraft,
                              questions: historyDraft.questions.filter(
                                (_, index) => index !== qIndex,
                              ),
                            })
                          }
                        >
                          Eliminar
                        </button>
                      )}
                    </header>
                    <input
                      placeholder={
                        lang === "es"
                          ? "Escribe la pregunta"
                          : "Write the question"
                      }
                      value={question.question}
                      onChange={(e) => {
                        const questions = [...historyDraft.questions];
                        questions[qIndex] = {
                          ...question,
                          question: e.target.value,
                        };
                        setHistoryDraft({ ...historyDraft, questions });
                      }}
                    />
                    {question.options.map((option, oIndex) => (
                      <label className="answer-option" key={oIndex}>
                        <input
                          type="radio"
                          name={`answer-${qIndex}`}
                          checked={question.answer === oIndex}
                          onChange={() => {
                            const questions = [...historyDraft.questions];
                            questions[qIndex] = { ...question, answer: oIndex };
                            setHistoryDraft({ ...historyDraft, questions });
                          }}
                        />
                        <input
                          placeholder={`${lang === "es" ? "Opción" : "Option"} ${oIndex + 1}`}
                          value={option}
                          onChange={(e) => {
                            const questions = [...historyDraft.questions];
                            const options = [...question.options];
                            options[oIndex] = e.target.value;
                            questions[qIndex] = { ...question, options };
                            setHistoryDraft({ ...historyDraft, questions });
                          }}
                        />
                      </label>
                    ))}
                    <textarea
                      placeholder={
                        lang === "es"
                          ? "Explicación que verá el estudiante"
                          : "Explanation shown to the student"
                      }
                      value={question.explanation}
                      onChange={(e) => {
                        const questions = [...historyDraft.questions];
                        questions[qIndex] = {
                          ...question,
                          explanation: e.target.value,
                        };
                        setHistoryDraft({ ...historyDraft, questions });
                      }}
                    />
                  </section>
                ))}
                {adminMessage && (
                  <p className="admin-message">{adminMessage}</p>
                )}
                <div className="admin-save-row">
                  {adminEditingId && (
                    <button
                      className="admin-delete"
                      onClick={() => void removeHistoryLesson(adminEditingId)}
                    >
                      {lang === "es" ? "Eliminar lección" : "Delete lesson"}
                    </button>
                  )}
                  <button
                    className="button primary"
                    disabled={adminBusy}
                    onClick={() => void saveHistoryLesson()}
                  >
                    {adminBusy
                      ? lang === "es"
                        ? "Guardando…"
                        : "Saving…"
                      : lang === "es"
                        ? "Guardar lección"
                        : "Save lesson"}
                  </button>
                </div>
              </main>
            </div>
          </section>
        </div>
      )}

      {familyOpen && account && !isCourseCreator && (
        <div
          className="modal-backdrop family-backdrop"
          onMouseDown={() => setFamilyOpen(false)}
        >
          <aside
            className="family-panel"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="settings-head family-heading">
              <div>
                <span className="section-kicker">
                  {lang === "es" ? "MI CUENTA LUMI" : "MY LUMI ACCOUNT"}
                </span>
                <h2>
                  {lang === "es"
                    ? `Hola, ${account.displayName || "familia"}`
                    : `Hello, ${account.displayName || "family"}`}
                </h2>
                <p>
                  {account.email} ·{" "}
                  {lang === "es" ? "Cuenta familiar" : "Family account"}
                </p>
              </div>
              <button onClick={() => setFamilyOpen(false)}>×</button>
            </div>
            <div className="family-summary">
              <span>
                <b>{children.length}</b>
                <small>{lang === "es" ? "Estudiantes" : "Students"}</small>
              </span>
              <span>
                <b>
                  {children.reduce(
                    (total, child) =>
                      total + (child.completedLessons?.length || 0),
                    0,
                  )}
                </b>
                <small>
                  {lang === "es"
                    ? "Lecciones completadas"
                    : "Completed lessons"}
                </small>
              </span>
              <span>
                <b>
                  {children.reduce((total, child) => total + child.stars, 0)}
                </b>
                <small>{t.stars}</small>
              </span>
            </div>
            {purchases.length > 0 && (
              <section className="family-purchases">
                <h3>{lang === "es" ? "Mis compras y accesos" : "My purchases and access"}</h3>
                {purchases.map((purchase) => (
                  <article key={purchase.id}>
                    <div><b>{purchase.courseTitle}</b><small>{purchase.childName} · {purchase.paymentMethod === "qr" ? "QR" : lang === "es" ? "Efectivo" : "Cash"}</small></div>
                    <strong>{purchase.price.toFixed(2)} Bs</strong>
                    <span className={`status-${purchase.status}`}>{purchase.status === "pending" ? lang === "es" ? "Pendiente" : "Pending" : purchase.status === "confirmed" ? lang === "es" ? "Acceso habilitado" : "Access enabled" : purchase.status}</span>
                  </article>
                ))}
              </section>
            )}
            {children.length > 0 && (
              <>
                <div className="family-section-title">
                  <div>
                    <h3>
                      {lang === "es"
                        ? "Estudiantes inscritos"
                        : "Enrolled students"}
                    </h3>
                    <p>
                      {lang === "es"
                        ? "Elige un estudiante para ver sus materias, configurar su teclado y continuar aprendiendo."
                        : "Choose a student to see subjects, configure their keyboard and continue learning."}
                    </p>
                  </div>
                </div>
                <div className="children-grid">
                  {children.map((child) => {
                    const completed = child.completedLessons?.length || 0;
                    const progress = Math.round((completed / 18) * 100);
                    return (
                      <button
                        className="child-card progress-child-card"
                        onClick={() => enterChildSpace(child)}
                        key={child.id}
                      >
                        <span>{child.avatar}</span>
                        <div className="child-card-main">
                          <div>
                            <b>{child.name}</b>
                            <em>
                              {child.gradeBand === "secondary"
                                ? lang === "es"
                                  ? "Secundaria"
                                  : "Secondary"
                                : lang === "es"
                                  ? "Primaria"
                                  : "Primary"}
                            </em>
                          </div>
                          <small>
                            {child.age} {lang === "es" ? "años" : "years"} ·{" "}
                            {lang === "es"
                              ? `Lección ${Math.max(1, child.level)} de 18`
                              : `Lesson ${Math.max(1, child.level)} of 18`}
                          </small>
                          <div className="child-progress">
                            <i style={{ width: `${progress}%` }} />
                          </div>
                          <small className="child-progress-label">
                            <b>{progress}%</b>{" "}
                            {lang === "es" ? "de Dactilografía" : "of Typing"}
                          </small>
                          <div className="child-subject-pills">
                            <span>
                              ⌨ {lang === "es" ? "Dactilografía" : "Typing"}
                            </span>
                            <span className="future-subject">
                              + {lang === "es" ? "Materias" : "Subjects"}
                            </span>
                          </div>
                        </div>
                        <i>→</i>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            <form className="child-form" onSubmit={addChildProfile}>
              <h3>
                {children.length === 0
                  ? lang === "es"
                    ? "Crea el primer perfil infantil"
                    : "Create the first child profile"
                  : lang === "es"
                    ? "Agregar perfil infantil"
                    : "Add child profile"}
              </h3>
              <div className="child-form-row">
                <label>
                  {lang === "es" ? "Nombre" : "Name"}
                  <input
                    value={childName}
                    onChange={(event) => setChildName(event.target.value)}
                    required
                  />
                </label>
                <label>
                  {lang === "es" ? "Edad" : "Age"}
                  <input
                    type="number"
                    min="4"
                    max="18"
                    value={childAge}
                    onChange={(event) => setChildAge(event.target.value)}
                    required
                  />
                </label>
              </div>
              <label className="grade-label">
                {lang === "es" ? "Etapa educativa" : "Education stage"}
              </label>
              <div className="grade-choice">
                <button
                  type="button"
                  className={childGradeBand === "primary" ? "selected" : ""}
                  onClick={() => setChildGradeBand("primary")}
                >
                  <span>🎒</span>
                  <b>{lang === "es" ? "Primaria" : "Primary"}</b>
                  <small>
                    {lang === "es"
                      ? "Aprendizaje fundamental"
                      : "Foundational learning"}
                  </small>
                </button>
                <button
                  type="button"
                  className={childGradeBand === "secondary" ? "selected" : ""}
                  onClick={() => setChildGradeBand("secondary")}
                >
                  <span>🎓</span>
                  <b>{lang === "es" ? "Secundaria" : "Secondary"}</b>
                  <small>
                    {lang === "es"
                      ? "Retos y habilidades avanzadas"
                      : "Advanced skills"}
                  </small>
                </button>
              </div>
              <div className="avatar-choice">
                {["🌟", "🚀", "🦊", "🐼", "🌈"].map((avatar) => (
                  <button
                    type="button"
                    className={childAvatar === avatar ? "selected" : ""}
                    onClick={() => setChildAvatar(avatar)}
                    key={avatar}
                  >
                    {avatar}
                  </button>
                ))}
              </div>
              <button disabled={profileBusy} className="button primary">
                {profileBusy
                  ? lang === "es"
                    ? "Guardando…"
                    : "Saving…"
                  : lang === "es"
                    ? "Agregar estudiante"
                    : "Add student"}
              </button>
            </form>
            <button className="signout-button" onClick={() => signOut(auth)}>
              {lang === "es" ? "Cerrar sesión" : "Sign out"}
            </button>
          </aside>
        </div>
      )}
    </main>
  );
}
