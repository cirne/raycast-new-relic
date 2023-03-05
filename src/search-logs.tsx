import { ActionPanel, Action, Detail, List } from "@raycast/api";
import { useState, useEffect } from "react";
import queryNerdGraph from "./nerd-graph";

type Account = {
  id: number;
  name: string;
}

type LogMessage = {
  messageId: string;
  message: string;
  timesntamp: number;
}

export default function SearchLogs() {
  const [searchText, setSearchText] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<number>(3774651);
  const [logMessages, setLogMessages] = useState<LogMessage[]>([]);

  useEffect(loadAccounts, [])
  useEffect(() => {
    if (accountId) {
      searchLogs();
    }
  }, [searchText, accountId]);


  return (
    <List isLoading={accounts.length === 0}
      searchBarPlaceholder="Search New Relic Logs..."
      throttle
      isShowingDetail
      onSearchTextChange={setSearchText}
      searchBarAccessory={getAccountsDropdown()}
    >
      {logMessages.map((message: any) => (
        <LogMessage key={message.messageId} message={message} />
      ))}
    </List>
  )

  function loadAccounts() {
    const nrql = `{ actor { accounts { id name } } }`;
    (async () => {
      const { data } = await queryNerdGraph(nrql);
      const accounts = data.actor.accounts;
      setAccounts(accounts);
      setAccountId(accounts[0].id);
    })()
  }

  function getAccountsDropdown() {
    return (
      <List.Dropdown
        tooltip="Select an account"
        storeValue={true}
        onChange={(idStr) => setAccountId(parseInt(idStr))}>

        {accounts.map((account) => (
          <List.Dropdown.Item
            key={account.id}
            title={account.name}
            value={account.id.toString()}
          />
        ))}
      </List.Dropdown>
    )
  }

  function getQuery() {
    return `SELECT * FROM Log WHERE message LIKE '%${searchText}%' LIMIT 100`;
  }

  function searchLogs() {
    (async () => {
      if (!searchText || searchText.length < 3 || !accountId) {
        setLogMessages([]);
        return
      }

      const nrql = getQuery();
      const graphql = `{ actor
        { account(id: ${accountId}) 
          { nrql(query: "${nrql}")
            { results } } } }`;

      const { data } = await queryNerdGraph(graphql);
      const logMessages: LogMessage[] = data.actor.account.nrql.results;
      setLogMessages(logMessages)
    })()
  }

}


function LogMessage(props: { message: LogMessage }) {
  const { message } = props;
  return (
    <List.Item
      key={message.messageId}
      title={message.message}
      // actions={<ActionPanel>
      // </ActionPanel>}
      detail={<LogMessageDetail message={message} />}
    />
  )
}



function LogMessageDetail(props: { message: LogMessage }) {
  const excludedKeys = ["messageId", "message", "timestamp", "entity.guid.INFRA", "entity.guids"];
  const message = props.message;

  let markdown = "```\n" + message.message + "\n```\n\n";
  const metatdata = [] as { key: string, value: string | number }[];
  for (const [key, value] of Object.entries(message)) {
    if (!excludedKeys.includes(key)) {
      // metatdata.push({ key, value });
      // messageDump[key] = value;
      markdown += `*  *${key}:* ${value} \n`;
    }
  }
  // markdown += "\n\n```\n" + JSON.stringify(messageDump, null, 2) + "\n```";

  return (
    <List.Item.Detail markdown={markdown} metadatax={
      <List.Item.Detail.Metadata>
        {metatdata.map(({ key, value }) => (
          <List.Item.Detail.Metadata.Label key={key} title={key} text={value.toString()} />
        ))}

      </List.Item.Detail.Metadata>}
    />)
}