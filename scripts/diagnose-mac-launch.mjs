#!/usr/bin/env node

import { readdir, readFile, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const diagnosticDir = path.join(os.homedir(), 'Library', 'Logs', 'DiagnosticReports');
const sinceMinutes = Number(getArg('--since-minutes') || 60);
const requireClean = process.argv.includes('--require-clean');
const maxReports = Number(getArg('--max') || 8);

const reports = await loadReports();
const matchingReports = reports.filter((report) => isRelevantReport(report.name)).slice(0, maxReports);
const findings = [];

for (const report of matchingReports) {
  const text = await readFile(report.path, 'utf8');
  findings.push(classifyReport(report, text));
}

printReport(findings);

if (requireClean && findings.some((finding) => finding.registerApplicationCrash || finding.chromiumMachPortDenied)) {
  process.exitCode = 1;
}

function getArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1 || index === process.argv.length - 1) return null;
  return process.argv[index + 1];
}

async function loadReports() {
  const cutoff = Date.now() - sinceMinutes * 60 * 1000;
  let names = [];
  try {
    names = await readdir(diagnosticDir);
  } catch (error) {
    console.error(`Could not read macOS DiagnosticReports at ${diagnosticDir}: ${error.message}`);
    process.exitCode = 1;
    return [];
  }

  const reports = [];
  for (const name of names) {
    if (!name.endsWith('.ips')) continue;
    const reportPath = path.join(diagnosticDir, name);
    try {
      const details = await stat(reportPath);
      if (details.mtimeMs >= cutoff) {
        reports.push({ name, path: reportPath, mtimeMs: details.mtimeMs });
      }
    } catch (_error) {
      // Ignore reports that rotated away while the script was scanning.
    }
  }

  return reports.sort((a, b) => b.mtimeMs - a.mtimeMs);
}

function isRelevantReport(name) {
  return /(?:Shibanshu Markdown Viewer|Markdown Viewer Mac|Electron|Chromium|chrome-headless-shell)/i.test(name);
}

function classifyReport(report, text) {
  const summary = parseHeader(text);
  const registerApplicationCrash =
    text.includes('___RegisterApplication_block_invoke') ||
    text.includes('_RegisterApplication') ||
    text.includes('RegisterApplication');
  const chromiumMachPortDenied =
    text.includes('MachPortRendezvous') ||
    text.includes('bootstrap_check_in') ||
    text.includes('Permission denied (1100)');
  const terminalCoalition =
    text.includes('"coalitionName" : "com.apple.Terminal"') ||
    text.includes('"responsibleProc" : "Terminal"') ||
    text.includes('"parentProc" : "codex"') ||
    text.includes('"parentProc" : "Exited process"');
  const abortTrap = text.includes('"signal":"SIGABRT"') || text.includes('Abort trap: 6') || text.includes('abort() called');

  let diagnosis = 'No known Shibanshu launch pattern detected.';
  if (registerApplicationCrash && abortTrap) {
    diagnosis =
      'macOS aborted while registering the app with LaunchServices/AppKit before the renderer loaded.';
  } else if (chromiumMachPortDenied) {
    diagnosis =
      'macOS denied Chromium/Electron Mach service registration in this terminal context.';
  }

  return {
    name: report.name,
    path: report.path,
    modifiedAt: new Date(report.mtimeMs).toISOString(),
    appName: summary.app_name || 'unknown',
    timestamp: summary.timestamp || 'unknown',
    registerApplicationCrash,
    chromiumMachPortDenied,
    terminalCoalition,
    abortTrap,
    diagnosis
  };
}

function parseHeader(text) {
  const firstLine = text.split('\n').find((line) => line.trim().startsWith('{')) || '{}';
  try {
    return JSON.parse(firstLine);
  } catch (_error) {
    return {};
  }
}

function printReport(items) {
  console.log(`macOS launch diagnostics (${sinceMinutes} minute window)`);
  console.log(`Directory: ${diagnosticDir}`);

  if (!items.length) {
    console.log('No recent Electron/Shibanshu crash reports found.');
    return;
  }

  for (const item of items) {
    console.log('');
    console.log(`Report: ${item.name}`);
    console.log(`App: ${item.appName}`);
    console.log(`Crash time: ${item.timestamp}`);
    console.log(`Modified: ${item.modifiedAt}`);
    console.log(`RegisterApplication crash: ${item.registerApplicationCrash ? 'yes' : 'no'}`);
    console.log(`Mach service denied: ${item.chromiumMachPortDenied ? 'yes' : 'no'}`);
    console.log(`Terminal/Codex launch context: ${item.terminalCoalition ? 'yes' : 'no'}`);
    console.log(`Diagnosis: ${item.diagnosis}`);
  }

  const newestKnownBlocker = items.find((item) => item.registerApplicationCrash || item.chromiumMachPortDenied);
  if (newestKnownBlocker) {
    console.log('');
    console.log('Interpretation: this launch died before app JavaScript/renderer startup.');
    console.log('Next manual check: open the packaged .app from Finder or a normal macOS desktop session.');
  }
}
