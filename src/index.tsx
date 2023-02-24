import { ActionPanel, Action, List, Icon, Color, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";


/**
 * Disclaimer
 * 
 * My first ever tyescript code. If not for Copilot and ChatGPT, I would have been lost.
 * And my first ever raycast extension
 * 
 * So I'm sure it is full of bad practices.
 * 
 * But, I find it useful and I hope you do too.
 */

type EntityTypeKey = 'APM_APPLICATION_ENTITY' |
  'BROWSER_APPLICATION_ENTITY' |
  'SYNTHETIC_MONITOR_ENTITY' |
  'MOBILE_APPLICATION_ENTITY' |
  'INFRASTRUCTURE_HOST_ENTITY' |
  'DASHBOARD_ENTITY' |
  'WORKLOAD_ENTITY';

const EntityTypes: Record<EntityTypeKey, { icon: Icon; description: string }> = {
  "APM_APPLICATION_ENTITY": { icon: Icon.AppWindowList, description: 'APM Application' },
  "BROWSER_APPLICATION_ENTITY": { icon: Icon.Monitor, description: 'Browser Application' },
  "SYNTHETIC_MONITOR_ENTITY": { icon: Icon.Eye, description: 'Synthetic Monitor' },
  "MOBILE_APPLICATION_ENTITY": { icon: Icon.Mobile, description: 'Mobile Application' },
  "INFRASTRUCTURE_HOST_ENTITY": { icon: Icon.Desktop, description: 'Host' },
  "DASHBOARD_ENTITY": { icon: Icon.LineChart, description: 'Dashboard' },
  "WORKLOAD_ENTITY": { icon: Icon.Layers, description: 'Workload' },
}

type SeverityKey = 'NOT_ALERTING' | 'WARNING' | 'CRITICAL' | 'NOT_CONFIGURED';
const Severities: Record<SeverityKey, { color: Color, level: number }> = {
  "NOT_ALERTING": { color: Color.PrimaryText, level: 1 },
  "WARNING": { color: Color.Yellow, level: 2 },
  "CRITICAL": { color: Color.Red, level: 3 },
  "NOT_CONFIGURED": { color: Color.SecondaryText, level: 0 },
}

interface Entity {
  name: string;
  alertSeverity?: SeverityKey;
  guid: string;
  entityType: EntityTypeKey;
  reporting?: boolean;
  permalink: string;
}

interface Preferences {
  apiKey?: string;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { data, isLoading } = QueryForEntities(searchText);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search New Relic..."
      throttle
    >
      <List.Section title="New Relic Entities" subtitle={data?.length + " items"}>
        {data?.map((searchResult: Entity) => (
          <SearchListItem key={searchResult.guid} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}


function QueryForEntities(searchText: string) {
  const { apiKey } = getPreferenceValues<Preferences>();
  const endpoint = 'https://api.newrelic.com/graphql';

  // raycast won't call this until apiKey is defined, but lint is complaining
  if (!apiKey) return { data: [], isLoading: false };

  const query = `{
    actor {
      entitySearch(query: "name LIKE '${searchText}'") {
        results {
          entities {
            name
            alertSeverity
            guid
            entityType
            reporting
            permalink
          }
        }
      }
    }
  }`;

  return useFetch(endpoint, {
    execute: searchText.length > 2,
    method: "POST",
    headers: {
      'Content-Type': 'application/json',
      'API-Key': apiKey,
    },
    body: JSON.stringify({ query }),
    parseResponse: parseFetchResponse,
  });
}
function SearchListItem({ searchResult }: { searchResult: Entity }) {

  const { icon, description } = getEntityInfo(searchResult);

  return (
    <List.Item
      key={searchResult.guid}
      title={searchResult.name}
      icon={icon}
      subtitle={description}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in New Relic" url={searchResult.permalink} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy URL"
              content={`${searchResult.permalink}`}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function getEntityInfo(entity: Entity) {
  const { icon, description } = EntityTypes[entity.entityType] || { icon: Icon.QuestionMark, description: 'Unknown' };
  const severity = Severities[entity.alertSeverity || 'NOT_CONFIGURED'];

  return {
    icon: { source: icon, tintColor: severity.color },
    description
  }
}


/** Parse the response from the fetch query into something we can display */
async function parseFetchResponse(response: Response) {

  const json = await response.json();
  const { entities } = json.data.actor.entitySearch.results;
  return entities.filter((entity: Entity) => {
    return EntityTypes[entity.entityType];
  }).sort((e1: Entity, e2: Entity) => {
    // sort dashboards first, then whether reporting, then by severity, then by name
    if (e1.entityType !== e2.entityType) {
      if (e1.entityType === 'DASHBOARD_ENTITY') return -1;
      if (e2.entityType === 'DASHBOARD_ENTITY') return 1;
    }
    if (e1.reporting !== e2.reporting) {
      return e1.reporting ? -1 : 1;
    }
    if (e1.alertSeverity !== e2.alertSeverity && e1.alertSeverity && e2.alertSeverity) {
      return Severities[e2.alertSeverity].level - Severities[e1.alertSeverity].level;
    }

    return e1.name.localeCompare(e2.name);
  }).map((entity: Entity) => {
    return entity;
  })
}
