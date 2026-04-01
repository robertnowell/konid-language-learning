#!/usr/bin/env node

const isRemote =
  process.argv.includes("--remote") ||
  process.env.KONID_REMOTE === "1";

if (isRemote) {
  await import("./remote.js");
} else {
  await import("./local.js");
}
