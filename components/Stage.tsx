'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PROJECTS,
  SECTIONS,
  SHELL,
  paletteVars,
  projectsOf,
  tinted,
  type Category,
  type Project,
  type Section,
} from '@/lib/works';

const num = (i: number) => String(i + 1).padStart(2, '0');

/**
 * Порядок полос. Первыми идут действующие сервисы.
 *
 * Выдуманные бренды сделаны сильно, но витрина не должна начинаться с них:
 * снаружи это читается как хвастовство несуществующим, пока настоящее лежит
 * в общем ряду.
 */
const LEAD_SECTION: Category = 'services';

const BAND_ORDER: readonly Section[] = [
  ...SECTIONS.filter((s) => s.id === LEAD_SECTION),
  ...SECTIONS.filter((s) => s.id !== LEAD_SECTION),
];

function plural(n: number, one: string, few: string, many: string): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  const mod10 = n % 10;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

/* ======================================================================== */

export default function Stage() {
  const [category, setCategory] = useState<Category | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);

  // Свет держится, пока выбран раздел. Привязывать его к прокрутке нельзя:
  // в момент нажатия сцена ещё за нижним краем экрана, и свет успевал моргнуть.
  const lit = category !== null;

  const stageRef = useRef<HTMLElement | null>(null);

  const list = useMemo(() => (category ? projectsOf(category) : []), [category]);
  const active: Project | null = useMemo(
    () => list.find((p) => p.slug === slug) ?? list[0] ?? null,
    [list, slug],
  );

  // Зал не ждёт, пока на него нажмут: пока раздел не выбран, он сам перебирает
  // работы. Наведение на строку указателя перехватывает показ.
  // Работы без кадра из перебора исключены: пустая рама вместо картинки
  // выглядит как поломка, а не как пауза.
  const shown3 = useMemo(() => PROJECTS.filter((p) => p.shot), []);

  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    if (category || hoveredSlug) return;
    const id = window.setInterval(() => {
      setCycle((n) => (n + 1) % shown3.length);
    }, 5200);
    return () => window.clearInterval(id);
  }, [category, hoveredSlug, shown3.length]);

  /**
   * Первые секунды зал пуст и представляется сам.
   *
   * Раньше посетитель попадал сразу на конкретную работу — и было непонятно,
   * почему именно на неё. Пустой зал снимает вопрос: сначала видно, чья это
   * мастерская и что в ней есть, и только потом начинается показ.
   */
  const [intro, setIntro] = useState(true);
  useEffect(() => {
    const id = window.setTimeout(() => setIntro(false), 3400);
    return () => window.clearTimeout(id);
  }, []);

  /**
   * Подпись в шапке появляется, только когда герой ушёл вверх.
   *
   * Крупная подпись стоит в самом герое, и мелкая копия прямо под ней читалась
   * как ошибка вёрстки. Наверху нужна одна, ниже по странице — тоже одна.
   *
   * Начальное значение true: на первом экране герой виден всегда, и шапка
   * обязана молчать даже если наблюдатель за прокруткой не успел сработать.
   */
  const [heroInView, setHeroInView] = useState(true);
  useEffect(() => {
    // Считаем положение напрямую, а не наблюдателем за пересечением: тот молчит,
    // пока вкладка не отрисовывается, и подпись зависала бы в одном состоянии.
    const check = () => {
      const hero = document.querySelector('.hero');
      const height = hero?.getBoundingClientRect().height ?? window.innerHeight;
      setHeroInView(window.scrollY < height - 72);
    };
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
    };
  }, []);

  const hoverWork = useCallback((next: string | null) => {
    if (next) setIntro(false);
    setHoveredSlug(next);
  }, []);

  const shown: Project | null = useMemo(() => {
    if (hoveredSlug) return PROJECTS.find((p) => p.slug === hoveredSlug) ?? null;
    if (intro) return null;
    return shown3[cycle] ?? null;
  }, [hoveredSlug, cycle, intro, shown3]);

  const palette = useMemo(
    () => (lit && active ? tinted(active) : shown ? tinted(shown) : SHELL),
    [lit, active, shown],
  );

  useEffect(() => {
    const root = document.documentElement;
    for (const [name, value] of Object.entries(paletteVars(palette))) {
      root.style.setProperty(name, value);
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palette.base);
  }, [palette]);

  const open = useCallback((project: Project) => {
    setCategory(project.category);
    setSlug(project.slug);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }, []);

  const step = useCallback(
    (delta: number) => {
      if (!active || list.length < 2) return;
      const i = list.findIndex((p) => p.slug === active.slug);
      const next = list[(i + delta + list.length) % list.length];
      if (next) setSlug(next.slug);
    },
    [active, list],
  );

  useEffect(() => {
    if (!lit) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lit, step]);

  return (
    <div className="shell">
      <div className="grain" aria-hidden="true" />
      <Header muted={heroInView} />

      <main id="main">
        <Hero shown={shown} onHover={hoverWork} onOpen={open} />

        {category && active ? (
          <section
            className="stage"
            ref={stageRef}
            aria-label={SECTIONS.find((s) => s.id === category)?.title}
          >
            <Canvas project={active} />
            <div className="stage__copy rail">
              <Rail
                list={list}
                activeSlug={active.slug}
                onPick={setSlug}
                onBack={() => {
                  setCategory(null);
                  setSlug(null);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
              <Details project={active} list={list} onStep={step} />
            </div>
          </section>
        ) : null}

        {active?.gallery ? <Showcase project={active} /> : null}
      </main>

      <Footer />
    </div>
  );
}

/* -------------------------------------------------------------- шапка --- */

function Header({ muted }: { muted: boolean }) {
  return (
    <header className="site-header rail" data-muted={muted ? 'true' : undefined}>
      <a href="#main" className="wordmark" tabIndex={muted ? -1 : undefined}>
        KySочек <span>Workshop</span>
      </a>
      <span className="label site-header__hint">Мастерская</span>
    </header>
  );
}

/* ---------------------------------------------------------------- герой --- */

/**
 * Герой — не три кнопки в пустоте, а указатель всех работ.
 *
 * Так устроены сильные витрины: список названий крупным кеглем, а изображение
 * проявляется при наведении. Посетителю сразу видно, сколько всего сделано и
 * что именно, — и он попадает в нужную работу одним нажатием, а не двумя.
 */
function Hero({
  shown,
  onHover,
  onOpen,
}: {
  shown: Project | null;
  onHover: (slug: string | null) => void;
  onOpen: (project: Project) => void;
}) {
  const heroRef = useRef<HTMLElement | null>(null);

  /**
   * Кадр слегка ведёт за указателем.
   *
   * Смещение крошечное — не больше полутора процентов, — но именно оно
   * отличает живой кадр от обоев: у сцены появляется глубина. Позиция едет
   * через переменные стилей, поэтому двигается только слой с картинкой и
   * браузер не пересчитывает раскладку.
   */
  useEffect(() => {
    const node = heroRef.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    let frame = 0;
    const onMove = (e: MouseEvent) => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const r = node.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        node.style.setProperty('--px', `${(x * -2.4).toFixed(2)}%`);
        node.style.setProperty('--py', `${(y * -1.6).toFixed(2)}%`);
      });
    };
    const onLeave = () => {
      node.style.setProperty('--px', '0%');
      node.style.setProperty('--py', '0%');
    };

    node.addEventListener('mousemove', onMove);
    node.addEventListener('mouseleave', onLeave);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      node.removeEventListener('mousemove', onMove);
      node.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <section className="hero" ref={heroRef}>
      <div className="hero__mast rail">
        <p className="hero__studio">
          KySочек <span>Workshop</span>
        </p>
        {/*
          Регистр взят у самих работ: «Silence, shaped for distance», «What
          remains still shines», «An index of objects that should not exist».
          Короткая отстранённая строка без «я» и без объяснений. Бытовое
          предложение от первого лица рядом с ними звучало чужеродно.
        */}
        <h1 className="hero__claim">
          Ничто не осталось <em>эскизом</em>
        </h1>
      </div>

      {/*
        Полосы по разделам.
        Одна общая сетка не отвечала на вопрос «что здесь вообще есть»: тринадцать
        плиток подряд читались как свалка. Теперь каждый раздел — своя полоса с
        подписью слева и рядом работ справа. Ряд листается вбок, поэтому все
        четыре раздела помещаются на один экран независимо от их длины.
      */}
      <div className="bands" onMouseLeave={() => onHover(null)}>
        {BAND_ORDER.map((section) => {
          const items = projectsOf(section.id);
          if (items.length === 0) return null;
          return (
            <section
              className="band"
              key={section.id}
              data-lead={section.id === 'services' ? 'true' : undefined}
            >
              <div className="band__label rail">
                <h2 className="band__name">{section.title}</h2>
                <span className="label band__count">
                  {items.length} {plural(items.length, 'работа', 'работы', 'работ')}
                </span>
                <span className="caption band__lure">{section.lure}</span>
              </div>

              <ul className="band__row">
                {items.map((project) => (
                  <li key={project.slug}>
                    <button
                      type="button"
                      className="tile"
                      data-lit={shown?.slug === project.slug ? 'true' : undefined}
                      onMouseEnter={() => onHover(project.slug)}
                      onFocus={() => onHover(project.slug)}
                      onClick={() => onOpen(project)}
                      style={{ ['--plate' as string]: project.palette.base }}
                    >
                      <span className="tile__media">
                        {project.shot ? (
                          <Image
                            src={project.shot.src}
                            alt=""
                            width={project.shot.width}
                            height={project.shot.height}
                            sizes="(min-width: 1100px) 26vw, 60vw"
                            quality={68}
                          />
                        ) : (
                          <span
                            className="tile__blank"
                            style={{ ['--dot' as string]: project.palette.accent }}
                          />
                        )}
                        {project.badge ? (
                          <span className="label tile__badge">{project.badge}</span>
                        ) : null}
                      </span>

                      <span className="tile__foot">
                        <span className="tile__name">{project.title}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- сцена --- */

/**
 * Кадр во весь экран, у которого левый край выгнут дугой, а вдоль дуги
 * изображение растворяется в цвете зала.
 */
function Canvas({ project }: { project: Project }) {
  const shot = project.shot;

  return (
    <div className="canvas" key={project.slug} aria-hidden="true">
      <div className="canvas__arc" style={{ backgroundColor: project.palette.base }}>
        {shot ? (
          <Image
            src={shot.src}
            alt=""
            width={shot.width}
            height={shot.height}
            sizes="(min-width: 900px) 68vw, 100vw"
            quality={84}
            priority
          />
        ) : null}
        <div className="canvas__veil" />
      </div>
      <div className="canvas__rim" />
    </div>
  );
}

function Rail({
  list,
  activeSlug,
  onPick,
  onBack,
}: {
  list: readonly Project[];
  activeSlug: string;
  onPick: (slug: string) => void;
  onBack: () => void;
}) {
  return (
    <nav className="rail-nav" aria-label="Работы раздела">
      <button type="button" className="label rail-nav__back" onClick={onBack}>
        ← К указателю
      </button>
      {list.length > 1 ? (
        <ol>
          {list.map((p, i) => (
            <li key={p.slug}>
              <button
                type="button"
                onClick={() => onPick(p.slug)}
                aria-current={p.slug === activeSlug ? 'true' : undefined}
              >
                <span className="label">{num(i)}</span>
                <span className="rail-nav__name">{p.title}</span>
              </button>
            </li>
          ))}
        </ol>
      ) : null}
    </nav>
  );
}

function Details({
  project,
  list,
  onStep,
}: {
  project: Project;
  list: readonly Project[];
  onStep: (delta: number) => void;
}) {
  const index = list.findIndex((p) => p.slug === project.slug);

  return (
    <div className="details" key={project.slug}>
      <p className="label details__meta">
        {num(index)} <span aria-hidden="true">/</span> {num(list.length - 1)}
        <span aria-hidden="true"> — </span>
        {project.year}
      </p>

      <h2 className="details__title">
        {project.title}
        {project.badge ? <span className="label details__badge">{project.badge}</span> : null}
      </h2>

      <p className="details__tagline">{project.tagline}</p>

      {project.status ? (
        <p className="details__status" role="note">
          {project.status}
        </p>
      ) : null}

      <p className="details__premise">{project.premise}</p>

      <ul className="details__notes">
        {project.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>

      <div className="details__actions">
        {/* Когда открывать нечего, ничего и не пишем: статус уже стоит ярлыком
            у названия, а вторая подпись рядом только дублировала бы его. */}
        {project.href ? (
          <a
            className="details__open"
            href={project.href}
            target="_blank"
            rel="noreferrer noopener"
          >
            <span>Открыть</span>
            <span aria-hidden="true">↗</span>
          </a>
        ) : null}

        {list.length > 1 ? (
          <div className="details__nav">
            <button
              type="button"
              className="label"
              onClick={() => onStep(-1)}
              aria-label="Предыдущая работа"
            >
              ←
            </button>
            <button
              type="button"
              className="label"
              onClick={() => onStep(1)}
              aria-label="Следующая работа"
            >
              →
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Показ. Работа, у которой есть полотна, получает не карточку, а разворот:
 * каждый кадр во весь экран, подпись рядом.
 */
function Showcase({ project }: { project: Project }) {
  const gallery = project.gallery ?? [];

  return (
    <section className="showcase" aria-label={`${project.title}: показ`}>
      <div className="showcase__head rail">
        <span className="label showcase__kicker">Показ</span>
        <h3 className="showcase__title">{project.title}</h3>
      </div>

      {gallery.map((frame, i) => (
        <figure className="board" key={frame.src}>
          <div className="board__media">
            <Image
              src={frame.src}
              alt={frame.alt}
              width={frame.width}
              height={frame.height}
              sizes="100vw"
              quality={86}
              loading="lazy"
            />
          </div>
          <figcaption className="board__copy rail">
            <span className="label board__num">{num(i)}</span>
            <p className="board__text">{frame.caption}</p>
          </figcaption>
        </figure>
      ))}
    </section>
  );
}

function Footer() {
  return (
    <footer className="site-footer rail">
      <span className="label">KySочек Workshop</span>
      {/* Оговорка касается только выдуманных миров. «Наша глава» и PulseFrame —
          действующие сервисы, и записывать их в вымысел нельзя. */}
      <p className="caption site-footer__note">
        NOIR Motors, ABYSS / 11 000, Obsidian Archive, Night Train 404, CHROMA / 26 и
        «Седьмое утро» — вымышленные компании и события, сделанные как студийные работы.
        «Наша глава» и PulseFrame — действующие сервисы.
      </p>
    </footer>
  );
}
