"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
};

type CourseLesson = {
  title: string;
  skill: string;
  target: string;
};

const courseLessons: Record<"es" | "en", CourseLesson[]> = {
  es: [
    { title: "Dedos en casa", skill: "A S D F · J K L Ñ", target: "asdf jklñ asdf jklñ" },
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
    { title: "Home fingers", skill: "A S D F · J K L ;", target: "asdf jkl; asdf jkl;" },
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

const copy = {
  es: {
    nav: ["Cursos", "Cómo funciona", "Planes", "Familias"],
    login: "Ingresar",
    start: "Comenzar ahora",
    eyebrow: "La escuela digital que crece contigo",
    titleA: "Aprender hoy.",
    titleB: "Crecer para siempre.",
    intro:
      "Una experiencia educativa divertida y segura para que cada niño aprenda a su ritmo, acompañado por Lumi.",
    trial: "Probar una lección",
    plans: "Ver planes familiares",
    trusted: "Primer curso disponible",
    course: "Mecanografía divertida",
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
    why: "Mucho más que escribir rápido",
    whySub: "Lumiya convierte cada práctica en un pequeño logro.",
    benefits: [
      ["Aprende jugando", "Misiones cortas, premios y escenarios que mantienen la motivación."],
      ["Avanza a su ritmo", "Ejercicios que se adaptan a las teclas que cada niño necesita reforzar."],
      ["Acompañamiento familiar", "Los padres ven avances, tiempo de práctica y habilidades dominadas."],
    ],
    familyTitle: "Un plan para cada familia",
    familySub: "Perfiles separados, progreso individual y acceso desde cualquier computadora.",
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
    eyebrow: "The digital school that grows with you",
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
    why: "Much more than typing fast",
    whySub: "Lumiya turns every practice into a small achievement.",
    benefits: [
      ["Learn through play", "Short missions, rewards and worlds that keep children motivated."],
      ["Grow at their pace", "Exercises adapt to the keys each child needs to reinforce."],
      ["Family guidance", "Parents see progress, practice time and mastered skills."],
    ],
    familyTitle: "A plan for every family",
    familySub: "Separate profiles, individual progress and access from any computer.",
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
  const [courseMistakes, setCourseMistakes] = useState(0);
  const [courseBusy, setCourseBusy] = useState(false);
  const [courseResult, setCourseResult] = useState<{ passed: boolean; accuracy: number; stars: number } | null>(null);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("8");
  const [childAvatar, setChildAvatar] = useState("🌟");
  const [profileBusy, setProfileBusy] = useState(false);
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

  async function loadChildren(uid: string) {
    const snapshot = await getDocs(query(collection(db, "parents", uid, "children"), orderBy("createdAt", "asc")));
    setChildren(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as ChildProfile[]);
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
      setTyped((value) => value + 1);
      if (sound && typeof window !== "undefined") {
        // The visible response is primary; audio is intentionally gentle and optional.
      }
    } else if (event.key.length === 1) {
      setMistakes((value) => value + 1);
    }
  }

  function resetPractice() {
    setTyped(0);
    setMistakes(0);
  }

  function enterChildSpace(child: ChildProfile) {
    setActiveChild(child);
    setFamilyOpen(false);
  }

  function startChildLesson() {
    if (activeChild) startCourseLesson(activeChild.level || 1);
  }

  function startCourseLesson(lessonNumber: number) {
    setCourseLesson(Math.min(18, Math.max(1, lessonNumber)));
    setCourseTyped(0);
    setCourseMistakes(0);
    setCourseResult(null);
  }

  async function finishCourseLesson(lessonNumber: number, finalMistakes: number) {
    if (!account || !activeChild || courseBusy) return;
    const lesson = courseLessons[lang][lessonNumber - 1];
    const finalAccuracy = Math.round((lesson.target.length / (lesson.target.length + finalMistakes)) * 100);
    const passed = finalAccuracy >= 80;
    const earnedStars = finalAccuracy >= 95 ? 3 : finalAccuracy >= 88 ? 2 : passed ? 1 : 0;
    setCourseResult({ passed, accuracy: finalAccuracy, stars: earnedStars });
    if (!passed) return;

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
    const lesson = courseLessons[lang][courseLesson - 1];
    const expected = lesson.target[courseTyped] || "";
    const pressed = event.key.length === 1 ? event.key : "";
    if (pressed === expected) {
      const nextTyped = courseTyped + 1;
      setCourseTyped(nextTyped);
      if (nextTyped === lesson.target.length) void finishCourseLesson(courseLesson, courseMistakes);
    } else if (pressed) {
      setCourseMistakes((value) => value + 1);
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
          ) : <button className="login" onClick={() => openAccount("login")}>{t.login}</button>}
          <button className="button primary small" onClick={() => account ? setFamilyOpen(true) : openAccount("register")}>{t.start}</button>
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

      <section className={`practice-section ${worlds[world]}`} id="practice">
        <div className="section-heading"><span className="section-kicker">LUMITYPE</span><h2>{t.practice}</h2><p>{t.practiceHint}</p></div>
        <div className="practice-shell">
          <div className="practice-top">
            <span className="lesson-pill">{t.lesson}</span>
            <div className="practice-actions"><button onClick={() => setSettingsOpen(true)}>⚙ {t.settings}</button><button onClick={resetPractice}>↻ {t.reset}</button></div>
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
        <div className="plan-grid">{[35, 59, 79].map((price, index) => <article key={price} className={index === 1 ? "featured" : ""}>{index === 1 && <span className="popular">{t.popular}</span>}<h3>{t.planNames[index]}</h3><p>{t.planKids[index]}</p><div className="price"><b>{price} Bs</b><span>{t.month}</span></div><ul><li>✓ {lang === "es" ? "Acceso a todos los cursos activos" : "Access to all active courses"}</li><li>✓ {lang === "es" ? "Progreso y certificados" : "Progress and certificates"}</li><li>✓ {lang === "es" ? "Panel para padres" : "Parent dashboard"}</li></ul><button onClick={() => account ? setFamilyOpen(true) : openAccount("register")} className={`button ${index === 1 ? "primary" : "secondary"}`}>{t.choose}</button></article>)}</div>
      </section>

      <section className="family-banner" id="families"><div><span>✦</span><h2>{lang === "es" ? "Cada niño tiene su propia forma de brillar." : "Every child has their own way to shine."}</h2><p>{lang === "es" ? "Lumiya se adapta a su ritmo, sus intereses y sus necesidades." : "Lumiya adapts to their pace, interests and needs."}</p></div><a className="button light" href="#plans">{t.start} →</a></section>

      <footer><a className="brand footer-brand" href="#top"><span className="brand-mark"><i>L</i><b>✦</b></span><span><strong>Lumiya</strong><small>ACADEMY</small></span></a><p>© 2026 Lumiya Academy · {t.footer}</p><div><a href="#">Privacidad</a><a href="#">Ayuda</a></div></footer>

      {settingsOpen && <div className="modal-backdrop" onMouseDown={() => setSettingsOpen(false)}><aside className="settings-panel" onMouseDown={(e) => e.stopPropagation()}><div className="settings-head"><div><span className="section-kicker">LUMIYA</span><h2>{t.panelTitle}</h2><p>{t.panelSub}</p></div><button onClick={() => setSettingsOpen(false)}>×</button></div><label>{t.theme}</label><div className="choice-row">{t.themes.map((theme, index) => <button className={world === index ? "selected" : ""} key={theme} onClick={() => setWorld(index)}><i className={`theme-dot dot-${index}`}/>{theme}</button>)}</div><div className="toggle-row"><span>{t.hands}</span><button className={hands ? "toggle on" : "toggle"} onClick={() => setHands(!hands)}><i/></button></div><div className="toggle-row"><span>{t.sound}</span><button className={sound ? "toggle on" : "toggle"} onClick={() => setSound(!sound)}><i/></button></div><div className="toggle-row"><span>{t.big}</span><button className={bigText ? "toggle on" : "toggle"} onClick={() => setBigText(!bigText)}><i/></button></div><button className="button primary panel-save" onClick={() => setSettingsOpen(false)}>{t.close}</button></aside></div>}

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
            <button className="student-close" onClick={() => setActiveChild(null)} aria-label={lang === "es" ? "Cerrar" : "Close"}>×</button>
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

      {courseLesson && activeChild && (() => {
        const lesson = courseLessons[lang][courseLesson - 1];
        const courseCurrent = lesson.target[courseTyped] || "";
        const liveAccuracy = courseTyped + courseMistakes === 0 ? 100 : Math.round((courseTyped / (courseTyped + courseMistakes)) * 100);
        return <div className="course-backdrop" onMouseDown={() => setCourseLesson(null)}>
          <section className="course-player" onMouseDown={(event) => event.stopPropagation()}>
            <header className="course-player-head">
              <button onClick={() => setCourseLesson(null)}>← {lang === "es" ? "Mapa" : "Map"}</button>
              <div><span>LUMITYPE</span><b>{lang === "es" ? `Lección ${courseLesson} de 18` : `Lesson ${courseLesson} of 18`}</b></div>
              <button className="student-close" onClick={() => setCourseLesson(null)}>×</button>
            </header>
            <div className="course-progress-line"><i style={{ width: `${(courseTyped / lesson.target.length) * 100}%` }}/></div>

            <div className="course-player-body">
              <div className="course-title"><span>{activeChild.avatar}</span><div><small>{lesson.skill}</small><h2>{lesson.title}</h2><p>{lang === "es" ? "Escribe el ejercicio con calma. Necesitas 80% de precisión para avanzar." : "Type calmly. You need 80% accuracy to move forward."}</p></div></div>

              {!courseResult ? <>
                <div className="course-target" aria-live="polite">
                  {lesson.target.split("").map((letter, index) => <span key={index} className={index < courseTyped ? "done" : index === courseTyped ? "now" : ""}>{letter === " " ? "·" : letter}</span>)}
                </div>
                <input autoFocus className="course-capture" value="" onChange={() => {}} onKeyDown={handleCourseKey} autoComplete="off" autoCapitalize="off" aria-label={lang === "es" ? "Escribe el ejercicio" : "Type the exercise"} placeholder={lang === "es" ? "Haz clic aquí y comienza…" : "Click here and start…"}/>
                <div className="course-keyboard">
                  {rows.map((row, rowIndex) => <div key={rowIndex}>{row.map((rawKey) => {
                    const key = lang === "en" && rawKey === "Ñ" ? ";" : rawKey;
                    return <span className={courseCurrent.toUpperCase() === key ? "active" : ""} key={key}>{key}</span>;
                  })}</div>)}
                  <div><span className={`course-space ${courseCurrent === " " ? "active" : ""}`}>SPACE</span></div>
                </div>
                <div className="course-live-stats"><span><b>{liveAccuracy}%</b><small>{t.accuracy}</small></span><span><b>{courseMistakes}</b><small>{lang === "es" ? "Errores" : "Mistakes"}</small></span><span><b>{courseTyped}/{lesson.target.length}</b><small>{lang === "es" ? "Caracteres" : "Characters"}</small></span></div>
              </> : <div className={`course-result ${courseResult.passed ? "passed" : "retry"}`}>
                <div className="result-lumi">{courseResult.passed ? "🌟" : "💪"}</div>
                <span>{courseResult.passed ? (lang === "es" ? "¡LECCIÓN COMPLETADA!" : "LESSON COMPLETE!") : (lang === "es" ? "¡CASI LO LOGRAS!" : "ALMOST THERE!")}</span>
                <h2>{courseResult.passed ? (lang === "es" ? `¡Excelente, ${activeChild.name}!` : `Great job, ${activeChild.name}!`) : (lang === "es" ? "Vamos a intentarlo otra vez" : "Let's try one more time")}</h2>
                <p>{courseResult.passed ? (lang === "es" ? "Tu avance quedó guardado y abriste una nueva lección." : "Your progress is saved and a new lesson is unlocked.") : (lang === "es" ? "Practica más despacio para alcanzar 80% de precisión." : "Slow down to reach 80% accuracy.")}</p>
                <div className="result-score"><span><b>{courseResult.accuracy}%</b><small>{t.accuracy}</small></span><span><b>{courseResult.stars ? "★".repeat(courseResult.stars) : "—"}</b><small>{t.stars}</small></span></div>
                <button disabled={courseBusy} className="button primary" onClick={() => courseResult.passed && courseLesson < 18 ? startCourseLesson(courseLesson + 1) : startCourseLesson(courseLesson)}>{courseBusy ? (lang === "es" ? "Guardando…" : "Saving…") : courseResult.passed && courseLesson < 18 ? (lang === "es" ? "Siguiente lección" : "Next lesson") : courseResult.passed ? (lang === "es" ? "Repetir reto" : "Repeat challenge") : (lang === "es" ? "Intentar otra vez" : "Try again")}</button>
              </div>}
            </div>
          </section>
        </div>;
      })()}

      {familyOpen && account && <div className="modal-backdrop" onMouseDown={() => setFamilyOpen(false)}>
        <aside className="family-panel" onMouseDown={(event) => event.stopPropagation()}>
          <div className="settings-head"><div><span className="section-kicker">{lang === "es" ? "PANEL FAMILIAR" : "FAMILY DASHBOARD"}</span><h2>{lang === "es" ? `Hola, ${account.displayName || "familia"}` : `Hello, ${account.displayName || "family"}`}</h2><p>{account.email}</p></div><button onClick={() => setFamilyOpen(false)}>×</button></div>
          <div className="family-summary"><span><b>{children.length}</b><small>{lang === "es" ? "Perfiles infantiles" : "Child profiles"}</small></span><span><b>{children.reduce((total, child) => total + child.stars, 0)}</b><small>{t.stars}</small></span></div>
          <h3>{lang === "es" ? "¿Quién va a aprender?" : "Who is learning?"}</h3>
          <div className="children-grid">
            {children.map((child) => <button className="child-card" onClick={() => enterChildSpace(child)} key={child.id}><span>{child.avatar}</span><b>{child.name}</b><small>{lang === "es" ? `Nivel ${child.level} · ${child.age} años` : `Level ${child.level} · age ${child.age}`}</small><i>→</i></button>)}
            {children.length === 0 && <p className="empty-profiles">{lang === "es" ? "Crea el primer perfil infantil para comenzar." : "Create the first child profile to begin."}</p>}
          </div>
          <form className="child-form" onSubmit={addChildProfile}>
            <h3>{lang === "es" ? "Agregar perfil infantil" : "Add child profile"}</h3>
            <div className="child-form-row"><label>{lang === "es" ? "Nombre" : "Name"}<input value={childName} onChange={(event) => setChildName(event.target.value)} required /></label><label>{lang === "es" ? "Edad" : "Age"}<input type="number" min="4" max="18" value={childAge} onChange={(event) => setChildAge(event.target.value)} required /></label></div>
            <div className="avatar-choice">{["🌟", "🚀", "🦊", "🐼", "🌈"].map((avatar) => <button type="button" className={childAvatar === avatar ? "selected" : ""} onClick={() => setChildAvatar(avatar)} key={avatar}>{avatar}</button>)}</div>
            <button disabled={profileBusy} className="button primary">{profileBusy ? (lang === "es" ? "Guardando…" : "Saving…") : (lang === "es" ? "Agregar estudiante" : "Add student")}</button>
          </form>
          <button className="signout-button" onClick={() => signOut(auth)}>{lang === "es" ? "Cerrar sesión" : "Sign out"}</button>
        </aside>
      </div>}
    </main>
  );
}
