const parseDiscordRegexName = (emoteName: string) => {
  const name = emoteName.slice(0, 28);

  const regex = new RegExp(/^[a-zA-Z0-9_]{2,32}$/);
  const isValid = regex.test(name);

  if (isValid && name.length >= 2) return name;

  const validTrimmedName = name.replace(/[^a-zA-Z0-9_]/g, "");

  if (validTrimmedName.length >= 2) return validTrimmedName;

  return "emotename";
};

export default parseDiscordRegexName;
