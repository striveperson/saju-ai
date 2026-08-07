// SPA 빌드 결과를 Capacitor 가 webDir 로 쓸 수 있는 형태로 옮긴다 (ADR 0003).
//
// TanStack Start 의 SPA 프리렌더는 셸을 .output/public/_shell.html 로 낸다.
// Capacitor 는 webDir 루트의 index.html 을 찾으므로 이름을 바꿔 복사한다.
//
// 이 스크립트는 vite build 가 끝난 뒤에 돈다. package.json 의 build:spa 참고.

import { cp, readdir, rename, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE = '.output/public';
const TARGET = 'dist-spa';
const SHELL = '_shell.html';

if (!existsSync(SOURCE)) {
  console.error(`[build-spa] ${SOURCE} 가 없다. vite build 가 먼저 돌아야 한다.`);
  process.exit(1);
}

if (!existsSync(join(SOURCE, SHELL))) {
  console.error(
    `[build-spa] ${join(SOURCE, SHELL)} 가 없다.\n` +
      'SAJU_BUILD_TARGET=spa 없이 빌드하면 SSR 산출물만 나온다.',
  );
  process.exit(1);
}

await rm(TARGET, { recursive: true, force: true });
await cp(SOURCE, TARGET, { recursive: true });
await rename(join(TARGET, SHELL), join(TARGET, 'index.html'));

const files = await readdir(TARGET, { recursive: true });
let bytes = 0;
for (const f of files) {
  const s = await stat(join(TARGET, f));
  if (s.isFile()) bytes += s.size;
}

console.log(`[build-spa] ${TARGET}/ 생성 완료`);
console.log(`  파일 ${files.length}개, ${(bytes / 1024).toFixed(0)}KB`);
console.log(`  ${SHELL} -> index.html`);
