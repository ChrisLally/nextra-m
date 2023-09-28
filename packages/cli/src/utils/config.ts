import * as fs from 'fs';
import * as path from 'path';
import * as clack from '@clack/prompts';
import chalk from 'chalk';
import { withTelemetry } from '../../telemetry';
import { buildTools } from './constants';
import { modifyConfigFile } from './modify-config';
import { abortIfCancelled, getNextRouter } from './utils';
import type { BuildTool } from '../types';

export function detectBuildTool(): BuildTool | null {
  /**
   * Detect build tool by checking names of config files if they exist
   */
  for (const buildTool of buildTools) {
    for (const fileName of buildTool.possibleFileNames) {
      /**
       * Check for all extensions
       */
      if (fs.existsSync(path.join(process.cwd(), fileName))) {
        const currentbuildTool = { ...buildTool, configFilePath: fileName };
        clack.log.success(
          `Detected ${chalk.bold(currentbuildTool.name)} project.`,
        );
        return currentbuildTool;
      }
    }
  }
  // No build tool detected using config files
  return null;
}

export async function getBuildTool(): Promise<BuildTool> {
  /**
   * Ask user to select a build tool
   */
  const selectedBuildTool: BuildTool | symbol = await abortIfCancelled(
    clack.select({
      message: 'Please select your build tool.',
      options: buildTools.map((buildTool) => ({
        value: buildTool,
        label: buildTool.label,
      })),
    }),
  );

  return selectedBuildTool;
}

export async function handleConfigFile({
  telemetry,
}: {
  telemetry: boolean;
}): Promise<void> {
  // Create or Modify config file
  const detectedBuildTool = detectBuildTool();

  if (detectedBuildTool) {
    // Modify existing config file
    clack.note(
      `found existing ${detectedBuildTool.configFilePath} file.`,
      `Transforming ${chalk.cyan(detectedBuildTool.configFilePath)}`,
    );
    await withTelemetry(
      {
        enabled: telemetry,
        integration: detectBuildTool.name,
        name: 'cli',
      },
      async () => {
        await modifyConfigFile(detectedBuildTool);
      },
    );
    return;
  }

  /**
   * Create a new config file
   */
  const buildTool: BuildTool = await getBuildTool();

  const targetFilePath = path.join(process.cwd(), buildTool.configFilePath);

  if (buildTool.name === 'next') {
    /**
     * Create config file for 'next' project
     * Check next router for rsc configuration (App router uses React Server Components)
     */
    const nextRouter: 'app' | 'pages' = await getNextRouter();

    clack.note(
      `at ${chalk.green(targetFilePath)}`,
      `Created ${chalk.green(buildTool.configFilePath)} file`,
    );

    nextRouter === 'app'
      ? await fs.promises.writeFile(
          targetFilePath,
          buildTool.configFileContentRSC!,
        )
      : await fs.promises.writeFile(
          targetFilePath,
          buildTool.configFileContent,
        );
  } else {
    /**
     * Create config file for build tools other than 'next'
     */
    clack.note(
      `at ${chalk.green(targetFilePath)}`,
      `Created ${chalk.green(buildTool.configFilePath)} file`,
    );
    await fs.promises.writeFile(targetFilePath, buildTool.configFileContent);
  }
}
