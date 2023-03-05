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
      console.log(JSON.stringify(data, null, 2));
      const logMessages: string[] = data.actor.account.nrql.results;
      setLogMessages(logMessages)
      console.log(data);
    })()
  }

}


function LogMessage(props: { message: LogMessage }) {
  return (
    <List.Item
      key={props.message.messageId}
      title={props.message.message}
      actions={<ActionPanel>
        <Action.Push title="Show Details" target={<LogMessageDetail message={props.message} />} />
      </ActionPanel>}
    />
  )
}



function LogMessageDetail(props: { message: LogMessage }) {
  const markdown = "```\n" + props.message.message + "\n```";

  const excludedKeys = ["messageId", "message", "timestamp"];
  const metatdata = [] as { key: string, value: string | number }[];
  for (const [key, value] of Object.entries(props.message)) {
    if (!excludedKeys.includes(key)) {
      metatdata.push({ key, value });
    }
  }

  return (
    <Detail markdown={markdown} metadata={
      <Detail.Metadata>
        {metatdata.map(({ key, value }) => (
          <Detail.Metadata.Label key={key} title={key} text={value.toString()} />
        ))}

      </Detail.Metadata>
    } />
  )
}