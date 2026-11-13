import type { RequestInit } from "node-fetch";

// The search text is sent as a variable: interpolating it into the document breaks the
// query on `"` and `\`.
const SEARCH_QUERY = `
  query ($query: String!, $ignoreTags: Boolean) {
    emotes(query: $query, limit: 100, filter: { ignore_tags: $ignoreTags }) {
      count
      items {
        id
        name
        animated
        owner {
          display_name
        }
        host {
          url
        }
      }
    }
  }
`;

export default (query: string, ignoreTags: boolean = false): RequestInit => {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: SEARCH_QUERY,
      variables: { query, ignoreTags },
    }),
  };
};
