import { RequestInit } from "node-fetch";

export default (
  query: string,
  ignoreTags: boolean = false
): RequestInit => {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      //filter: {case_sensitive: false, exact_match: ${exact_match}, ignore_tags: true}
      query: `{
    emotes(query: "${query}", limit: 100, filter: {ignore_tags: ${ignoreTags}}) {
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
  }`,
    }),
  };
};
