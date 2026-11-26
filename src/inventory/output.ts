import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { collectInventory } from './discord-inventory.js';

export const inventoryDirectory = '.discord-inventory';

export async function saveInventory(
  inventory: Awaited<ReturnType<typeof collectInventory>>,
  directory = inventoryDirectory,
): Promise<string> {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const runDirectory = await mkdtemp(join(directory, 'run-'));
  const filename = join(runDirectory, 'guild.json');
  await writeFile(filename, JSON.stringify(inventory, null, 2) + '\n', {
    mode: 0o600,
    flag: 'wx',
  });
  return filename;
}
