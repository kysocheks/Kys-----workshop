/**
 * Съёмка кадров с боевых адресов работ.
 *
 * Ходит по опубликованным работам из lib/works.ts, открывает каждую в
 * безголовом браузере и сохраняет кадр в public/shots/<slug>/desktop.png.
 *
 * Запуск:  node scripts/shoot.mts
 *          node scripts/shoot.mts noir-motors abyss-11000   — только эти
 *
 * Кадры не проверяются на «красоту» — тяжёлые сцены на WebGL могут не успеть
 * прогреться. Поэтому каждой работе даётся время на прогрев, а размер файла
 * печатается: подозрительно маленький кадр почти всегда значит пустой экран.
 */

import { execFile } from 'node:child_process';
import { mkdir, stat, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { PROJECTS } from '../lib/works.ts';

const run = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const BROWSERS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
];

const WIDTH = 1440;
const HEIGHT = 1080;
/** Сколько ждём после загрузки, чтобы сцена успела встать. */
const WARMUP_MS = 6000;

async function findBrowser(): Promise<string> {
  for (const path of BROWSERS) {
    try {
      await stat(path);
      return path;
    } catch {
      // пробуем следующий
    }
  }
  throw new Error('Не нашёл ни Edge, ни Chrome. Впишите путь в BROWSERS.');
}

async function shoot(browser: string, url: string, out: string): Promise<number> {
  const profile = join(root, '.shoot-profile');
  await run(
    browser,
    [
      '--headless=new',
      '--disable-gpu-sandbox',
      '--hide-scrollbars',
      `--user-data-dir=${profile}`,
      `--window-size=${WIDTH},${HEIGHT}`,
      `--virtual-time-budget=${WARMUP_MS}`,
      `--screenshot=${out}`,
      url,
    ],
    { timeout: 90_000 },
  ).catch(() => undefined);

  try {
    const info = await stat(out);
    return info.size;
  } catch {
    return 0;
  }
}

const only = process.argv.slice(2);
// Снимаем только то, что живёт по адресу. Игры сюда не попадают: их кадры —
// настоящие захваты из самих игр, а не съёмка страницы.
const targets = PROJECTS.filter(
  (p) => p.href !== null && (only.length === 0 || only.includes(p.slug)),
);

if (targets.length === 0) {
  process.stdout.write('Нечего снимать: подходящих работ с адресом не нашлось.\n');
  process.exit(0);
}

const browser = await findBrowser();
process.stdout.write(`Браузер: ${browser}\n\n`);

let weak = 0;

for (const work of targets) {
  const dir = join(root, 'public', 'shots', work.slug);
  await mkdir(dir, { recursive: true });
  const out = join(dir, 'desktop.png');

  process.stdout.write(`${work.title.padEnd(18)} `);
  const size = await shoot(browser, work.href as string, out);

  if (size === 0) {
    weak += 1;
    process.stdout.write('— кадр не получен\n');
  } else {
    const kb = Math.round(size / 1024);
    // Пустой тёмный экран жмётся в считаные килобайты. Настоящая сцена — нет.
    const suspicious = kb < 25;
    if (suspicious) weak += 1;
    process.stdout.write(`${String(kb).padStart(5)} КБ${suspicious ? '  ← подозрительно пусто' : ''}\n`);
  }
}

await rm(join(root, '.shoot-profile'), { recursive: true, force: true });

process.stdout.write(`\nСнято: ${targets.length}. Требуют внимания: ${weak}.\n`);
