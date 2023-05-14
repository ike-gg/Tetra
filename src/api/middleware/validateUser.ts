import { secretPhrase } from "../../constants";
import validateCredentials, { Credentials } from "./validateCredentials";
import parseToken from "./parseToken";

const validateUser = async (token: string) => {
  if (!secretPhrase) return false;
  try {
    const credentials = parseToken(token) as Credentials;

    const isValid = validateCredentials(credentials);

    if (!isValid) return false;

    const response = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `${credentials.token_type} ${credentials.access_token}`,
      },
    });

    if (!response.ok) return false;

    const { id }: { id: string } = await response.json();

    return id;
  } catch (error) {
    return false;
  }
};

export default validateUser;
