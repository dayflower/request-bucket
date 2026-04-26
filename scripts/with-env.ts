#!/usr/bin/env bun
// Inject BUN_PUBLIC_APP_VERSION and BUN_PUBLIC_GIT_COMMIT before delegating
// to the wrapped command. Used by dev/build scripts so the frontend can
// reference these values via process.env at bundle time.

import pkg from '../package.json' with { type: 'json' };

const resolveGitCommit = async (): Promise<string> => {
  try {
    const proc = Bun.spawn(['git', 'rev-parse', 'HEAD'], {
      stdout: 'pipe',
      stderr: 'ignore',
    });
    const text = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;
    if (exitCode !== 0) return 'unknown';
    return text.trim() || 'unknown';
  } catch {
    return 'unknown';
  }
};

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('with-env: no command provided');
  process.exit(2);
}

const gitCommit = await resolveGitCommit();

const proc = Bun.spawn(args, {
  env: {
    ...process.env,
    BUN_PUBLIC_APP_VERSION: pkg.version,
    BUN_PUBLIC_GIT_COMMIT: gitCommit,
  },
  stdin: 'inherit',
  stdout: 'inherit',
  stderr: 'inherit',
});

process.exit(await proc.exited);
