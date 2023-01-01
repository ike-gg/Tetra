import fetch from "node-fetch";
import { endpoints, authHeaders } from "./base";
import type { ErrorResponse } from "./base";

interface UserResponse {
  data: {
    id: string;
    login: string;
    display_name: string;
  }[];
}

const checkChannel = async (channelName: string) => {
  const request = await fetch(endpoints.checkChannel(channelName), {
    headers: authHeaders,
  });
  const response = (await request.json()) as UserResponse | ErrorResponse;

  if ("error" in response) return response;
  if (response.data.length === 0) return false;

  return response.data.shift();
};

export default checkChannel;
