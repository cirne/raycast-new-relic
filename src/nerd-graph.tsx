import { getPreferenceValues } from "@raycast/api";
import { fetch } from 'node-fetch';
interface Preferences {
  apiKey?: string;
  region: "US" | "EU" | "STAGING";
}

export const Regions = {
  US: {
    ui: "https://one.newrelic.com",
    api: "https://api.newrelic.com/graphql",
  },
  EU: {
    ui: "https://one.eu.newrelic.com",
    api: "https://api.eu.newrelic.com/graphql",
  },
  STAGING: {
    ui: "https://one-staging.newrelic.com",
    api: "https://staging-api.newrelic.com/graphql",
  },
};

export default async function queryNerdGraph(graphql: string): any {
  const { apiKey } = getPreferenceValues<Preferences>();
  const region = getPreferenceValues<Preferences>().region;
  const endpoint = Regions[region].api;

  // raycast won't call this until apiKey is defined, but lint is complaining
  if (!apiKey) return { data: [], isLoading: false };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "API-Key": apiKey,
    },
    body: JSON.stringify({ query: graphql }),

  });
  const data = await response.json();
  return JSON.parse(data);
}
