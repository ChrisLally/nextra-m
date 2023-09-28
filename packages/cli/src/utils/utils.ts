import * as fs from 'fs';
import * as clack from '@clack/prompts';
import * as diff from 'diff';
import chalk from 'chalk';
import type { BuildTool } from '../types';

/**
 * Abort the process if the user cancels the input prompt.
 */
export async function abortIfCancelled<T>(
  input: T | Promise<T>,
): Promise<Exclude<T, symbol>> {
  if (clack.isCancel(await input)) {
    clack.cancel('Million setup cancelled.');
    process.exit(0);
  } else {
    return input as Exclude<T, symbol>;
  }
}

/**
 * Abort the process with a message. (mostly on error)
 */
export function abort(message?: string, status?: number): never {
  clack.outro(
    message ??
      `${chalk.red('Setup failed.')}\nReport a bug at ${chalk.cyan(
        'https://github.com/aidenybai/million/issues',
      )}`,
  );
  return process.exit(status ?? 1);
}

/**
 * Get the next router to use.
 */
export async function getNextRouter(): Promise<'app' | 'pages'> {
  if (fs.existsSync('src/app') || fs.existsSync('app')) {
    return 'app';
  } else if (fs.existsSync('src/pages') || fs.existsSync('pages')) {
    return 'pages';
  }
  const selectedRouter: 'app' | 'pages' = await abortIfCancelled(
    clack.select({
      message: 'Will you use app Router or pages Router?',
      options: [
        {
          label: 'App Router',
          value: 'app',
        },
        {
          label: 'Pages Router',
          value: 'pages',
        },
      ],
    }),
  );
  return selectedRouter;
}

export function highlightCodeDifferences(
  oldCode: string,
  newCode: string,
  detectedBuildTool: BuildTool,
  CONTEXT_SIZE = 1,
): void {
  const differences = diff.diffWords(oldCode, newCode);

  let highlightedCode = '';

  differences.forEach((part, index) => {
    const isContextEnd =
      index > 0 &&
      (differences[index - 1]?.added || differences[index - 1]?.removed);
    const isContextStart =
      index < differences.length - 1 &&
      (differences[index + 1]?.added || differences[index + 1]?.removed);

    let res = '';

    if (part.added) {
      res = chalk.bold.green(part.value);
    } else if (part.removed) {
      res = chalk.red(part.value);
    } else if (isContextEnd && isContextStart) {
      const split = part.value.split('\n');
      if (split.length - 1 > 2 * CONTEXT_SIZE) {
        res = [
          split.slice(0, CONTEXT_SIZE).join('\n'),
          '...',
          split.slice(-CONTEXT_SIZE - 1).join('\n'),
        ].join('\n');
      } else {
        res = chalk.dim(part.value);
      }
    } else if (isContextEnd) {
      res = part.value
        .split('\n')
        .slice(0, CONTEXT_SIZE + 1)
        .join('\n');
    } else if (isContextStart) {
      res = part.value
        .split('\n')
        .slice(-CONTEXT_SIZE - 1)
        .join('\n');
    }

    highlightedCode += res;
  });
  clack.note(
    `${highlightedCode}`,
    `Take a look at changes in ${chalk.cyan(detectedBuildTool.configFilePath)}`,
  );
}
