import { backOff } from "exponential-backoff";

const MAX_ATTEMPTS = 5;

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export function run(
  apiToken: string,
  accountId: string,
  projectName: string,
  deleteAliasedDeployments: boolean
) {
  const headers = {
    Authorization: `Bearer ${apiToken}`,
  };

  /** Get the cononical deployment (the live deployment) */
  async function getProductionDeploymentId() {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}`,
      {
        method: "GET",
        headers,
      }
    );
    const body = await response.json();
    if (!body.success) {
      throw new Error(body.errors[0].message);
    }
    const prodDeploymentId = body.result.canonical_deployment.id;
    if (!prodDeploymentId) {
      throw new Error("Unable to fetch production deployment ID");
    }
    return prodDeploymentId;
  }

  async function deleteDeployment(id: string) {
    let params = "";
    if (deleteAliasedDeployments) {
      params = "?force=true"; // Forces deletion of aliased deployments
    }
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}/deployments/${id}${params}`,
      {
        method: "DELETE",
        headers,
      }
    );
    const body = await response.json();
    if (!body.success) {
      throw new Error(body.errors[0].message);
    }
    console.log(`Deleted deployment ${id} for project ${projectName}`);
  }

  async function listDeploymentsPerPage(page: number) {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}/deployments?per_page=10&page=${page}`,
      {
        method: "GET",
        headers,
      }
    );
    const body = await response.json();
    if (!body.success) {
      throw new Error(`Could not fetch deployments for ${projectName}`);
    }
    return body.result;
  }

  async function listAllDeployments() {
    let page = 1;
    const deploymentIds = [];

    while (true) {
      let result;
      try {
        result = await backOff(() => listDeploymentsPerPage(page), {
          numOfAttempts: 5,
          startingDelay: 1000, // 1s, 2s, 4s, 8s, 16s
          retry: (_: any, attempt: any) => {
            console.warn(
              `Failed to list deployments on page ${page}... retrying (${attempt}/${MAX_ATTEMPTS})`
            );
            return true;
          },
        });
      } catch (err) {
        console.warn(`Failed to list deployments on page ${page}.`);
        console.warn(err);

        process.exit(1);
      }

      for (const deployment of result) {
        deploymentIds.push(deployment.id);
      }

      if (result.length) {
        page = page + 1;
        await sleep(500);
      } else {
        return deploymentIds;
      }
    }
  }

  async function main() {
    if (!apiToken) {
      throw new Error(
        "Please set apiToken as an env variable to your API Token"
      );
    }

    if (!accountId) {
      throw new Error(
        "Please set accountId as an env variable to your Account ID"
      );
    }

    if (!projectName) {
      throw new Error(
        "Please set projectName as an env variable to your Pages project name"
      );
    }

    const productionDeploymentId = await getProductionDeploymentId();
    console.log(
      `Found live production deployment to exclude from deletion: ${productionDeploymentId}`
    );

    console.log("Listing all deployments, this may take a while...");
    const deploymentIds = await listAllDeployments();

    for (const id of deploymentIds) {
      if (id === productionDeploymentId) {
        console.log(`Skipping production deployment: ${id}`);
      } else {
        try {
          await deleteDeployment(id);
          await sleep(500);
        } catch (error) {
          console.log(error);
        }
      }
    }
  }

  main();
}
