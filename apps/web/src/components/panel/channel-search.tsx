import { useQuery } from "@tanstack/react-query";
import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteLabel,
  AutocompleteList,
  AutocompleteStatus,
} from "@ui-sdk/react/autocomplete";
import { useEffect, useState } from "react";

import { ChannelAvatar } from "@/components/panel/channel-avatar";
import { Spinner } from "@/components/ui/spinner";
import { channelSearchQueryOptions, parseTwitchLogin } from "@/lib/channels";
import { cn } from "@/lib/cn";

// The API allows about 120 requests a minute per IP
const TYPING_DELAY = 300;

const toQuery = (text: string) => (parseTwitchLogin(text) ?? text.trim()).slice(0, 100);

type ChannelSearchProps = {
  /** The channel on screen, so the field starts with its login. */
  defaultValue: string;
  /** A suggestion was chosen, or Enter was pressed on a login or a twitch.tv link. */
  onChoose: (login: string) => void;
};

export function ChannelSearch({ defaultValue, onChoose }: ChannelSearchProps) {
  const [draft, setDraft] = useState(defaultValue);
  const [query, setQuery] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);

  // Back/forward to another channel writes its login into the field
  useEffect(() => {
    setDraft(defaultValue);
    setQuery("");
  }, [defaultValue]);

  const typed = draft !== defaultValue;
  useEffect(() => {
    if (!typed) return;
    const timer = setTimeout(() => setQuery(toQuery(draft)), TYPING_DELAY);
    return () => clearTimeout(timer);
  }, [draft, typed]);

  const results = useQuery(channelSearchQueryOptions(query));
  const channels = query && results.data ? results.data.channels : [];
  const waiting = typed && (toQuery(draft) !== query || results.isFetching);
  const status = waiting && draft.trim() ? "loading" : results.isError ? "error" : "idle";

  const submit = (text: string) => {
    const login = parseTwitchLogin(text);
    setInvalid(!login && text.trim() !== "");
    if (login) onChoose(login);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Autocomplete
        value={draft}
        onValueChange={(next) => {
          setDraft(next);
          setInvalid(false);
        }}
        onSubmit={(text) => submit(text)}
        submitOnSelect
        filter={false}
        status={status}
      >
        <AutocompleteLabel className="sr-only">Twitch channel</AutocompleteLabel>
        <div
          ref={setAnchor}
          className={cn(
            "flex h-9 min-w-0 items-center gap-1 border border-neutral-700 bg-neutral-900 px-2.5",
            "hover:border-neutral-600 has-focus-visible:border-primary",
            invalid && "border-danger hover:border-danger"
          )}
        >
          <span
            aria-hidden="true"
            className="shrink-0 select-none font-mono text-muted text-sm"
          >
            twitch.tv/
          </span>
          <AutocompleteInput
            type="search"
            placeholder="channel name"
            spellCheck={false}
            aria-invalid={invalid || undefined}
            className="m-0 h-full min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 text-foreground text-sm shadow-none outline-none placeholder:text-neutral-500"
          />
          {status === "loading" && <Spinner />}
        </div>
        <AutocompleteContent
          anchor={anchor}
          sideOffset={4}
          collisionPadding={8}
          className="m-0 w-(--anchor-width) min-w-64 max-w-[calc(100vw-1rem)] max-h-[min(22rem,var(--available-height))] overflow-y-auto overscroll-contain border border-border bg-background p-1 text-foreground text-sm shadow-none outline-none"
        >
          <AutocompleteStatus className="sr-only">
            {(state) =>
              state.loading
                ? "searching Twitch"
                : state.count
                  ? `${state.count} ${state.count === 1 ? "channel" : "channels"}`
                  : ""
            }
          </AutocompleteStatus>
          <AutocompleteEmpty className="px-2 py-1.5 text-muted text-sm">
            {(state) =>
              !state.query.trim() || state.loading
                ? null
                : results.isError
                  ? "i couldn't search Twitch. keep typing to try again"
                  : `no Twitch channel matches “${state.query.trim()}”`
            }
          </AutocompleteEmpty>
          <AutocompleteList className="m-0 flex flex-col p-0">
            {channels.map((channel) => (
              <AutocompleteItem
                key={channel.id}
                value={channel.login}
                label={channel.login}
                className="flex h-10 min-h-0 cursor-default select-none items-center gap-2.5 px-2 py-0 outline-none before:hidden after:hidden data-highlighted:bg-surface"
              >
                <ChannelAvatar channel={channel} />
                <span className="truncate text-foreground">{channel.displayName}</span>
                {channel.displayName.toLowerCase() !== channel.login && (
                  <span className="truncate font-mono text-muted text-xs">
                    {channel.login}
                  </span>
                )}
                {channel.live && (
                  <span className="ml-auto flex shrink-0 items-center gap-1.5 font-mono text-foreground text-xs">
                    <span aria-hidden="true" className="size-1.5 bg-primary" />
                    live
                  </span>
                )}
              </AutocompleteItem>
            ))}
          </AutocompleteList>
        </AutocompleteContent>
      </Autocomplete>
      {invalid && (
        <p role="alert" className="text-danger text-xs">
          Twitch names use only letters, numbers and underscores
        </p>
      )}
    </div>
  );
}
