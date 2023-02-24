const parseDiscordRegexName = (emoteName: string) => {
  const name = emoteName.slice(0, 28);

  const regex = new RegExp(/^[a-zA-Z0-9_]$/g);
  const isValid = regex.test(name);

  if (isValid) return name;

  const validTrimmedName = name.replace(/[^a-zA-Z0-9_]/g, "");

  if (validTrimmedName.length > 0) return validTrimmedName;

  return "emotename";
};

export default parseDiscordRegexName;
