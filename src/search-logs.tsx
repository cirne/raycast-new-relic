import { useState, useEffect } from "react";
import { useFetch } from "@raycast/utils";

type Account = {
  id: number;
  name: string;
}

export default function SearchLogs() {
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    const nrql = getQuery(searchText);
  }, [searchText]);
}


function getQuery(searchText: string) {
  return `SELECT * FROM Log WHERE message LIKE '%${searchText}%'`;
}

async function getAccounts(): Promise<Account[]> {
  const nrql = `{
    actor { accounts { id name } } 
  }`

}