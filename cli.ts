#!/usr/bin/env node
import { defineCommand, runMain } from "citty";
import { run } from "./lib";
import { string, parse } from "valibot";

const main = defineCommand({
  meta: {
    name: "Cleann CF Pages",
    version: "1.0.0",
    description: "Delete all Cloudflare Pages deployments except the live one",
  },
  args: {
    apiToken: {
      required: true,
      description: "Cloudflare API Token",
    },
    accountId: {
      required: true,
      description: "Cloudflare Account ID",
    },
    projectName: {
      required: true,
      description: "Cloudflare Pages project name",
    },
    deleteAliasedDeployments: {
      type: "boolean",
      description:
        "delete all deployments except for the live production deployment (including aliased deployments, for example, staging.example.pages.dev",
    },
  },
  run({ args }) {
    run(
      parse(string(), args.apiToken),
      parse(string(), args.accountId),
      parse(string(), args.projectName),
      args.deleteAliasedDeployments
    );
  },
});

runMain(main);
