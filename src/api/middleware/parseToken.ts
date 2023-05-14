import { AES, enc } from "crypto-js";
import { secretPhrase } from "../../constants";
import { Credentials } from "./validateCredentials";

const parseToken = (token: string) => {
  if (!secretPhrase) throw new Error("No secret phrase");
  try {
    const decryptedCredentials = AES.decrypt(token, secretPhrase).toString(
      enc.Utf8
    );
    const credentials: Credentials = JSON.parse(decryptedCredentials);
    return credentials;
  } catch (error) {
    throw new Error("Invalid token");
  }
};

export default parseToken;
