import { run } from "node:test";
import { spec } from "node:test/reporters";
import { globSync } from "node:fs";
import os from "node:os";
import process from "node:process";

const testPatterns = [
  "tests/client/**/*.test.mjs",
  "tests/server/**/*.test.mjs",
];

// Synchronous file discovery and zero tests handling
const files = testPatterns.flatMap((pattern) => globSync(pattern));
if (files.length === 0) {
  console.error(
    `\x1b[31m[Test Runner] No test files matched "${testPatterns.join(", ")}".\x1b[0m`,
  );
  process.exit(1);
}

// Dynamic concurrency determination based on available CPU cores
const concurrency = Math.max(
  1,
  Math.min(files.length, os.availableParallelism()),
);

console.log(`[Test Runner] Total files: ${files.length}`);
console.log(`[Test Runner] Active concurrency count: ${concurrency}\n`);

// Test stream setup and core helper functions
const testStream = run({ files, concurrency });
const reporter = testStream.compose(new spec());

let exitCode = 0;
let settled = false;

const setFailure = (error, label = "Test runner error") => {
  exitCode = 1;
  console.error(
    `\n[Test Runner] ${label}:\n`,
    error instanceof Error ? error.stack || error.message : String(error),
  );
};

const finish = () => {
  if (settled) return;
  settled = true;
  process.exitCode = exitCode;
};

// Signal interruption and fatal error handling
const handleSignal = (signal) => {
  exitCode = signal === "SIGINT" ? 130 : 143;
  console.error(`\x1b[31m\n[Test Runner] Interrupted by ${signal}.\x1b[0m`);
  testStream.destroy();
};

const handleFatal = (error, label) => {
  setFailure(error, label);
  testStream.destroy();
};

// Global process listeners, event bindings and output piping
process.once("SIGINT", handleSignal);
process.once("SIGTERM", handleSignal);
process.once("uncaughtException", (err) =>
  handleFatal(err, "Uncaught exception"),
);
process.once("unhandledRejection", (err) =>
  handleFatal(err, "Unhandled rejection"),
);

testStream.on("test:fail", () => {
  exitCode = 1;
});
testStream.on("error", (error) => setFailure(error));
reporter.on("error", (error) => {
  setFailure(error, "Reporter error");
  testStream.destroy();
});

reporter.pipe(process.stdout);

// Stream completion, listener cleanup and final process exit
await new Promise((resolve) => {
  testStream.once("close", resolve);
});

process.removeAllListeners("SIGINT");
process.removeAllListeners("SIGTERM");
process.removeAllListeners("uncaughtException");
process.removeAllListeners("unhandledRejection");

finish();
