#!/usr/bin/env node
import { defineCommand, runMain } from "citty";
import { run } from "./lib";
import { string, parse } from "valibot";

// Environment variables
const ENV_API_TOKEN = process.env.CF_API_TOKEN;
const ENV_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const ENV_PROJECT_NAME = process.env.CF_PROJECT_NAME;

const main = defineCommand({
  meta: {
    name: "Cleann CF Pages",
    version: "1.0.0",
    description: "Delete all Cloudflare Pages deployments except the live one",
  },
  args: {
    apiToken: {
      required: false,
      description: "Cloudflare API Token",
    },
    accountId: {
      required: false,
      description: "Cloudflare Account ID",
    },
    projectName: {
      required: false,
      description: "Cloudflare Pages project name",
    },
    deleteAliasedDeployments: {
      type: "boolean",
      description:
        "delete all deployments except for the live production deployment (including aliased deployments, for example, staging.example.pages.dev",
    },
  },
  run({ args }) {
    const apiToken = args.apiToken || ENV_API_TOKEN;
    const accountId = args.accountId || ENV_ACCOUNT_ID;
    const projectName = args.projectName || ENV_PROJECT_NAME;
    if (!apiToken) {
      throw new Error("API token is required");
    }
    if (!accountId) {
      throw new Error("Account ID is required");
    }
    if (!projectName) {
      throw new Error("Project name is required");
    }
    run(
      parse(string(), apiToken),
      parse(string(), accountId),
      parse(string(), projectName),
      args.deleteAliasedDeployments
    );
  },
});

runMain(main);
