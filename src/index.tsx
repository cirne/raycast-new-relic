import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { useFetch, Response } from "@raycast/utils";
import { useState } from "react";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const { data, isLoading } = FindEntities(searchText);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search New Relic..."
      throttle
    >
      <List.Section title="Results" subtitle={data?.length + ""}>
        {data?.map((searchResult) => (
          <SearchListItem key={searchResult.key} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function FindEntities(searchText: string) {
  const endpoint = 'https://api.newrelic.com/graphql';
  const apiKey = 'NRAK-BURQGTB6VD2IHPN13N3S37S2S66';

  const query = `{
    actor {
      entitySearch(query: "name LIKE '${searchText}'") {
        results {
          entities {
            name
            alertSeverity
            guid
            entityType
            domain
            reporting
            permalink
          }
        }
      }
    }
  }`;

  console.log(`FindEntities: ${searchText} (${searchText.length})`);
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



function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  const EntityIcons = {
    APM_APPLICATION_ENTITY: { icon: Icon.AppWindowList, description: 'APM Application' },
    BROWSER_APPLICATION_ENTITY: { icon: Icon.Monitor, description: 'Browser Application' },
    SYNTHETIC_MONITOR_ENTITY: { icon: Icon.Eye, description: 'Synthetic Monitor' },
    MOBILE_APPLICATION_ENTITY: { icon: Icon.Mobile, description: 'Mobile Application' },
    INFRASTRUCTURE_HOST_ENTITY: { icon: Icon.Desktop, description: 'Infrastructure Host' },
    DASHBOARD_ENTITY: { icon: Icon.LineChart, description: 'Dashboard' },
  }

  const iconColors = {
    NOT_ALERTING: Color.Green,
    CRITICAL: Color.Red,
    WARNING: Color.Yellow,
    NOT_CONFIGURED: Color.PrimaryText,
  }

  console.log(`entityType: ${searchResult.entityType} (${searchResult.name})`)
  const { icon, description } = EntityIcons[searchResult.entityType] || { icon: Icon.QuestionMark, description: 'Unknown' };
  const tintColor = iconColors[searchResult.alertSeverity] || Color.PrimaryText;

  return (
    <List.Item
      key={searchResult.key}
      title={searchResult.name}
      icon={{ source: icon, tintColor }}
      subtitle={description}
      accessoryTitle={searchResult.username}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="View in New Relic" url={searchResult.url} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Install Command"
              content={`npm install ${searchResult.name}`}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

interface SearchResult {
  entityType: any;
  key: string;
  name: string;
  description?: string;
  username?: string;
  url: string;
}

interface Entity {
  name: string;
  alertSeverity: string;
  guid: string;
  entityType: string;
  domain: string;
  reporting: boolean;
}

/** Parse the response from the fetch query into something we can display */
async function parseFetchResponse(response: Response) {

  const json = await response.json();
  const { entities } = json.data.actor.entitySearch.results;
  return entities.filter((entity: Entity) => {
    return ["APM_APPLICATION_ENTITY",
      "BROWSER_APPLICATION_ENTITY",
      "SYNTHETIC_MONITOR_ENTITY",
      "MOBILE_APPLICATION_ENTITY",
      "INFRASTRUCTURE_HOST_ENTITY",
      "DASHBOARD_ENTITY"].includes(entity.entityType);
  }).map((entity: Entity) => {
    const url = `https://one.newrelic.com/redirect/entity/${entity.guid}`;
    return {
      key: entity.guid,
      name: entity.name,
      entityType: entity.entityType,
      url: url,
      description: entity.entityType,
      alertSeverity: entity.alertSeverity,
      reporting: entity.reporting
    };
  });
}

