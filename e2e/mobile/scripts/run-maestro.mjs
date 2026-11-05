import { spawn, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync
} from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/*
 * Maestro reads its values from `-e` flags, not from the environment, and its
 * binary lives outside the package manager. This forwards the variables the
 * selected flows actually name, and finds the binary.
 */

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const defaultSuite = 'flows';
const localFile = path.join(repoRoot, 'apps/mobile/.env.e2e');
const variable = /\$\{([A-Z_][A-Z0-9_]*)\}/g;

/* pnpm forwards its own `--` separator into the script's arguments. */
const requested = process.argv.slice(2).filter(argument => argument !== '--');
const targets = requested.length > 0 ? requested : [defaultSuite];

/* The values belong to one instance and rarely change, so a gitignored file
 * carries them between runs. An exported one still wins for a single run. */
function localValues() {
  if (!existsSync(localFile)) {
    return {};
  }

  const values = Object.create(null);

  for (const line of readFileSync(localFile, 'utf8').split('\n')) {
    const match = /^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(
      line
    );

    if (match !== null) {
      values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }

  return values;
}

const local = localValues();

/* A value still written as `<...>` counts as unset rather than as a selector. */
const valueOf = name => {
  const value = (process.env[name] ?? local[name] ?? '').trim();

  return /^<.*>$/.test(value) ? '' : value;
};

function flowsUnder(target) {
  const absolute = path.resolve(packageRoot, target);
  const stats = statSync(absolute);

  if (stats.isFile()) {
    return [absolute];
  }

  /* The filesystem's order is not a contract: sort the names so a folder runs
   * the same way on every machine and on every copy. */
  return readdirSync(absolute, { withFileTypes: true })
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
    .flatMap(entry => {
      const child = path.join(absolute, entry.name);

      if (entry.isDirectory()) {
        return flowsUnder(path.relative(packageRoot, child));
      }

      return /[.]ya?ml$/.test(entry.name) ? [child] : [];
    });
}

function variablesByFlow(flows) {
  const required = new Map();

  for (const { flow, source } of flows) {
    for (const [, name] of source.matchAll(variable)) {
      const owners = required.get(name) ?? new Set();
      owners.add(path.relative(packageRoot, flow));
      required.set(name, owners);
    }
  }

  return required;
}

/* A flow's tags live in the YAML header, above the first `---`. */
function tagsOf(source) {
  const [header = ''] = source.split(/^---$/m);
  const block = /^tags:\s*\n((?:[ \t]+-[^\n]*\n?)*)/m.exec(header);

  if (block === null) {
    return new Set();
  }

  return new Set(
    block[1].split('\n').flatMap(line => {
      const tag = /^[ \t]+-[ \t]*(.+?)[ \t]*$/.exec(line);
      return tag === null ? [] : [tag[1]];
    })
  );
}

/* The flow's own header names the app and the flow; both are needed to find
 * its artifacts and the process a crash killed. */
function headerValue(source, key) {
  const [header = ''] = source.split(/^---$/m);
  const match = new RegExp(`^${key}:\\s*(.+?)\\s*$`, 'm').exec(header);

  if (match === null) {
    return null;
  }

  return match[1].replace(/^(['"])(.*)\1$/, '$2');
}

function resolveMaestro() {
  if (process.env.MAESTRO_BIN !== undefined) {
    return process.env.MAESTRO_BIN;
  }

  const found = spawnSync('which', ['maestro'], { encoding: 'utf8' });

  if (found.status === 0) {
    return found.stdout.trim();
  }

  return path.join(homedir(), '.maestro', 'bin', 'maestro');
}

function missingVariables(required) {
  return [...required].filter(([name]) => valueOf(name) === '');
}

function report(missing) {
  const lines = missing.map(
    ([name, flows]) => `  ${name} -> ${[...flows].join(', ')}`
  );

  console.error('These flows name variables that are not set:');
  console.error(lines.join('\n'));
  console.error(
    `Nothing ran. Export them for one run, or write ${path.relative(repoRoot, localFile)}:\n`
  );
  console.error(missing.map(([name]) => `  ${name}=<value>`).join('\n'));
}

const flows = targets.flatMap(target => {
  try {
    return flowsUnder(target);
  } catch {
    console.error(`No flow or folder at ${target}.`);
    process.exit(1);
  }
});
const excluded = (process.env.MAESTRO_EXCLUDE_TAGS ?? '')
  .split(',')
  .map(tag => tag.trim())
  .filter(tag => tag !== '');
const readable = flows.map(flow => ({
  flow,
  source: readFileSync(flow, 'utf8')
}));
const selected = readable
  .filter(
    ({ source }) => ![...tagsOf(source)].some(tag => excluded.includes(tag))
  )
  .map(entry => ({
    ...entry,
    name: headerValue(entry.source, 'name'),
    appId: headerValue(entry.source, 'appId')
  }));
const required = variablesByFlow(selected);
const missing = missingVariables(required);

if (missing.length > 0) {
  report(missing);
  process.exit(1);
}

const values = [...required.keys()].flatMap(name => [
  '-e',
  `${name}=${valueOf(name)}`
]);
const device =
  process.env.MAESTRO_UDID === undefined
    ? []
    : ['--udid', process.env.MAESTRO_UDID];
const excludedFlags =
  excluded.length === 0 ? [] : ['--exclude-tags', excluded.join(',')];
const maestro = resolveMaestro();

/* The harness owns a live run directory, so the flow artifacts land beside the
 * logs and are rotated with them. The live runner has none and keeps Maestro's
 * default location. */
const runDirectory =
  process.env.E2E_RUN_DIR === undefined
    ? null
    : path.join(process.env.E2E_RUN_DIR, 'maestro');
const artifactRoot = path.join(homedir(), '.maestro', 'tests');
const knownArtifacts = new Set(
  existsSync(artifactRoot) ? readdirSync(artifactRoot) : []
);

if (runDirectory !== null) {
  mkdirSync(runDirectory, { recursive: true });
}

const outputFlags =
  runDirectory === null ? [] : ['--test-output-dir', runDirectory];

/* Maestro may color its result lines; the escape is built from its code because
 * a literal control character is not allowed in the linted source. */
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');
const checked = new Set();

/* The stamp this run wrote, never an older one under the same root. */
function currentStamp() {
  const root = runDirectory ?? artifactRoot;

  if (!existsSync(root)) {
    return null;
  }

  const names = readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .filter(name => runDirectory !== null || !knownArtifacts.has(name))
    .sort();
  const newest = names.at(-1);

  return newest === undefined ? null : path.join(root, newest);
}

/* The flow's own capture: Maestro writes a crash report when it sees one, and
 * the device log either way. */
function crashEvidence(logs, appId) {
  const crashPath = path.join(logs, 'crash-report.txt');
  const logPath = path.join(logs, 'device-logcat.txt');
  const crash = existsSync(crashPath) ? readFileSync(crashPath, 'utf8') : null;
  const deviceLog =
    crash === null && existsSync(logPath)
      ? readFileSync(logPath, 'utf8')
      : null;
  const text = crash ?? deviceLog;

  if (text === null) {
    return null;
  }

  const lines = text.split('\n');
  const signalAt = lines.findIndex(line => /Fatal signal \d+ \(/.test(line));
  /* The crash report is this app's own. The device log is shared with every
   * process, so a signal there must be followed by the app's tombstone header;
   * logcat names the process, not the package, so the name alone proves nothing. */
  const scoped =
    signalAt !== -1 &&
    (crash !== null ||
      (appId !== null &&
        lines
          .slice(signalAt, signalAt + 60)
          .some(
            line =>
              line.includes(`>>> ${appId} <<<`) ||
              line.includes(`Cmdline: ${appId}`)
          )));

  const signal = scoped ? lines[signalAt] : null;
  const frame =
    signal === null
      ? null
      : (lines.slice(signalAt).find(line => line.includes('#00 ')) ?? null);

  return {
    signal,
    frame,
    anr: lines.find(line => line.includes(`ANR in ${appId}`)) ?? null,
    died:
      lines.find(
        line => line.includes(`Process ${appId} (`) && line.includes('has died')
      ) ?? null
  };
}

function messageOf(line) {
  const at = line.lastIndexOf('): ');

  return (at === -1 ? line : line.slice(at + 3)).trim();
}

/* One `pidof`: a missing process is the cheapest crash signal there is. An adb
 * failure is unknown, not a crash. */
function appIsGone(appId) {
  const result = spawnSync('adb', ['shell', 'pidof', appId], {
    encoding: 'utf8'
  });

  if (result.error !== undefined || result.status === null) {
    return null;
  }

  if ((result.stderr ?? '').trim() !== '') {
    return null;
  }

  if (result.status === 0) {
    return false;
  }

  return result.status === 1 ? true : null;
}

/* A clean assertion prints nothing: the report is only for a dead process or a
 * log that names this app. */
function reportCrash(entry) {
  const stamp = currentStamp();

  if (entry.name === null || stamp === null) {
    return;
  }

  const logs = path.join(stamp, entry.name, 'logs');
  const evidence = crashEvidence(logs, entry.appId);
  const gone = entry.appId === null ? null : appIsGone(entry.appId);
  const signal = evidence?.signal ?? null;
  const frame = evidence?.frame ?? null;
  const anr = evidence?.anr ?? null;
  const died = evidence?.died ?? null;

  if (signal === null && anr === null && gone !== true) {
    return;
  }

  const suffix = gone === true ? ' (the app process is gone)' : '';

  if (signal !== null) {
    console.error(`app crashed during "${entry.name}"${suffix}:`);
    console.error(`  ${messageOf(signal)}`);

    if (frame !== null) {
      console.error(`  ${messageOf(frame)}`);
    }

    return;
  }

  if (anr !== null) {
    console.error(`app was not responding during "${entry.name}"${suffix}:`);
    console.error(`  ${messageOf(anr)}`);
    return;
  }

  console.error(`app process was gone during "${entry.name}":`);
  console.error(`  pidof ${entry.appId} returned nothing`);

  if (died !== null) {
    console.error(`  ${messageOf(died)}`);
  }
}

/* Maestro prints one result line per flow when the batch holds more than one,
 * and the flow's log is complete by then. Tee the stream so the console keeps
 * its own output while each failure is read. */
function watch(stream, output) {
  let pending = '';

  const read = text => {
    const clean = text.replace(ANSI, '').replace(/\r$/, '');

    if (!clean.startsWith('[Failed] ')) {
      return;
    }

    const entry = selected.find(
      flow => flow.name !== null && clean.startsWith(`[Failed] ${flow.name} (`)
    );

    if (entry === undefined || checked.has(entry.flow)) {
      return;
    }

    checked.add(entry.flow);
    reportCrash(entry);
  };

  stream.setEncoding('utf8');
  stream.on('data', chunk => {
    pending += chunk;

    const lines = pending.split('\n');
    pending = lines.pop() ?? '';

    for (const line of lines) {
      output.write(`${line}\n`);
      read(line);
    }
  });
  stream.on('end', () => {
    if (pending !== '') {
      output.write(pending);
      read(pending);
    }
  });
}

const count = (amount, noun) => `${amount} ${noun}${amount === 1 ? '' : 's'}`;
const flowFiles = selected.map(entry => entry.flow);

console.log(
  `maestro test ${targets.join(' ')} (${count(selected.length, 'flow')}, ${count(required.size, 'value')})`
);

/* Reading the result lines costs Maestro its TTY, so the console gets its plain
 * renderer; the steps, results and summaries are the same. */
const child = spawn(
  maestro,
  [
    'test',
    ...device,
    ...excludedFlags,
    ...values,
    ...outputFlags,
    ...flowFiles
  ],
  {
    cwd: packageRoot,
    stdio: ['inherit', 'pipe', 'pipe']
  }
);

watch(child.stdout, process.stdout);
watch(child.stderr, process.stderr);

child.on('error', error => {
  console.error(`${maestro}: ${error.message}`);
  process.exitCode = 1;
});

child.on('close', code => {
  process.exitCode = code ?? 1;

  if ((code ?? 1) === 0) {
    return;
  }

  /* A single flow gets no batch result line, so its failure is read here. */
  if (selected.length === 1 && !checked.has(selected[0].flow)) {
    checked.add(selected[0].flow);
    reportCrash(selected[0]);
  }

  if (runDirectory !== null) {
    const made = existsSync(runDirectory) ? readdirSync(runDirectory) : [];

    if (made.length === 0) {
      console.error(`maestro artifacts: ${runDirectory}`);
    } else {
      for (const name of made) {
        console.error(`maestro artifacts: ${path.join(runDirectory, name)}`);
      }
    }

    return;
  }

  /* Without a run directory Maestro stamps its own, so the one this run made
   * is whatever appeared since the spawn. */
  const stamps = existsSync(artifactRoot) ? readdirSync(artifactRoot) : [];

  for (const name of stamps) {
    if (!knownArtifacts.has(name)) {
      console.error(`maestro artifacts: ${path.join(artifactRoot, name)}`);
    }
  }
});
