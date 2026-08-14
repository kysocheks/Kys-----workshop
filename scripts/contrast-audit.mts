/**
 * Контроль контраста подкрашенных комнат.
 *
 * Комната меняет цвет под каждую работу — значит, каждый её вариант надо
 * проверять отдельно. Глазом такие вещи не ловятся: провал до 3:1 выглядит
 * «просто чуть бледнее», а читать это уже нельзя.
 *
 * Запуск:  node scripts/contrast-audit.mts
 * Падает с кодом 1, если хоть одна пара не берёт свой порог.
 */

import { PROJECTS, SHELL, contrast, tinted } from '../lib/works.ts';

type Check = {
  room: string;
  pair: string;
  ratio: number;
  target: number;
};

const checks: Check[] = [];

function inspect(room: string, palette: ReturnType<typeof tinted>): void {
  checks.push(
    { room, pair: 'чернила на фоне', ratio: contrast(palette.ink, palette.base), target: 7 },
    {
      room,
      pair: 'второстепенный текст на фоне',
      ratio: contrast(palette.inkDim, palette.base),
      target: 4.5,
    },
    { room, pair: 'акцент на фоне', ratio: contrast(palette.accent, palette.base), target: 4.5 },
    {
      room,
      pair: 'второстепенный текст на поверхности',
      ratio: contrast(palette.inkDim, palette.surface),
      target: 4.5,
    },
  );
}

inspect('Workshop', SHELL);
for (const project of PROJECTS) inspect(project.title, tinted(project));

let failed = 0;
let currentRoom = '';

for (const check of checks) {
  if (check.room !== currentRoom) {
    currentRoom = check.room;
    process.stdout.write(`\n${currentRoom}\n`);
  }
  const ok = check.ratio >= check.target;
  if (!ok) failed += 1;
  const mark = ok ? '  ok  ' : ' ПЛОХО';
  process.stdout.write(
    `${mark} ${check.ratio.toFixed(2).padStart(6)} : 1   (нужно ${check.target})  ${check.pair}\n`,
  );
}

process.stdout.write(
  `\nПроверено пар: ${checks.length}. Провалов: ${failed}.\n`,
);

if (failed > 0) process.exit(1);
