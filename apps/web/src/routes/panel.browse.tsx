import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { EmoteGrid } from "@/components/emote/emote-grid";
import { EmoteMenu } from "@/components/emote/emote-menu";
import { PanelError, PanelLoading } from "@/components/panel/query-state";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Notice } from "@/components/ui/notice";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ui/segmented-control";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";
import {
  lookupErrorMessage,
  SEARCH_PROVIDERS,
  type SearchProvider,
  searchEmotesQueryOptions,
} from "@/lib/catalog";
import { fromCatalogEmote, type PanelEmote } from "@/lib/emote";
import { guildsQueryOptions } from "@/lib/guilds";

type BrowseSearch = {
  provider?: Exclude<SearchProvider, "7tv">;
  q?: string;
  /** Server the emotes are meant for: preselected when adding. */
  guild?: string;
};

const TYPING_DELAY = 300;

const PROVIDER_NAMES: Record<SearchProvider, string> = {
  "7tv": "7TV",
  ffz: "FFZ",
  bttv: "BTTV",
};

const POPULAR_TITLES: Record<SearchProvider, string> = {
  "7tv": "Top on 7TV",
  ffz: "Most used on FFZ",
  bttv: "BTTV globals",
};

export const Route = createFileRoute("/panel/browse")({
  head: () => ({ meta: [{ title: "Browse · Panel · Tetra" }] }),
  // 7TV is the default, so it stays out of the URL
  validateSearch: (search: Record<string, unknown>): BrowseSearch => ({
    provider:
      search.provider === "ffz" || search.provider === "bttv"
        ? search.provider
        : undefined,
    q: typeof search.q === "string" && search.q.trim() ? search.q.trim() : undefined,
    guild: typeof search.guild === "string" ? search.guild : undefined,
  }),
  component: PanelBrowse,
});

function PanelBrowse() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const provider: SearchProvider = search.provider ?? "7tv";
  const query = search.q ?? "";
  const guilds = useQuery(guildsQueryOptions);
  const guild = guilds.data?.guildsWithUserPermissions.find(
    ({ id }) => id === search.guild
  );

  const [draft, setDraft] = useState(query);
  const written = useRef(query);

  // Typing writes ?q= after a pause; back/forward changes it from outside
  useEffect(() => {
    if (query === written.current) return;
    written.current = query;
    setDraft(query);
  }, [query]);

  useEffect(() => {
    const next = draft.trim();
    if (next === written.current) return;
    const timer = setTimeout(() => {
      written.current = next;
      void navigate({
        search: (previous) => ({ ...previous, q: next || undefined }),
        replace: true,
      });
    }, TYPING_DELAY);
    return () => clearTimeout(timer);
  }, [draft, navigate]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Heading level={1} size="lg">
          Browse emotes
        </Heading>
        <Text size="sm" tone="muted">
          Right-click or long-press an emote to add it
          {guild ? (
            <>
              {" "}
              to <span className="text-foreground">{guild.name}</span>
            </>
          ) : (
            " to a server"
          )}
          .
        </Text>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          aria-label="Emote site"
          value={provider}
          onValueChange={(next) =>
            next &&
            void navigate({
              search: (previous) => ({
                ...previous,
                provider: next === "7tv" ? undefined : (next as BrowseSearch["provider"]),
              }),
              replace: true,
            })
          }
        >
          {SEARCH_PROVIDERS.map((value) => (
            <SegmentedControlItem key={value} value={value}>
              {PROVIDER_NAMES[value]}
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
        <TextField
          label={`Search ${PROVIDER_NAMES[provider]}`}
          hideLabel
          type="search"
          value={draft}
          onValueChange={setDraft}
          placeholder={`Search ${PROVIDER_NAMES[provider]}`}
          className="min-w-40 flex-1 sm:max-w-72"
        />
      </div>

      {provider === "bttv" && query ? (
        <Notice
          title="BTTV search needs an account"
          action={
            <Button size="sm" onClick={() => setDraft("")}>
              Show globals
            </Button>
          }
        >
          Paste a BTTV link into Quick add instead.
        </Notice>
      ) : (
        <Results
          key={`${provider}:${query}`}
          provider={provider}
          query={query}
          guild={guild && { id: guild.id, name: guild.name }}
        />
      )}
    </div>
  );
}

type ResultsProps = {
  provider: SearchProvider;
  query: string;
  guild?: { id: string; name: string };
};

function Results({ provider, query, guild }: ResultsProps) {
  const results = useInfiniteQuery(searchEmotesQueryOptions(provider, query));
  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } =
    results;

  // Pages can overlap when the source's order shifts between requests
  const emotes = useMemo(() => {
    const seen = new Set<string>();
    const list: PanelEmote[] = [];
    if (!results.data) return list;
    for (const page of results.data.pages) {
      for (const item of page.items) {
        const emote = fromCatalogEmote(item);
        if (seen.has(emote.key)) continue;
        seen.add(emote.key);
        list.push(emote);
      }
    }
    return list;
  }, [results.data]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  const headingId = useId();
  const name = PROVIDER_NAMES[provider];
  const title = query ? `“${query}” on ${name}` : POPULAR_TITLES[provider];

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <Heading level={2} size="sm" id={headingId}>
        {title}
      </Heading>

      {results.status === "pending" && (
        <PanelLoading>
          {query
            ? `searching ${name}…`
            : `loading ${POPULAR_TITLES[provider].toLowerCase()}…`}
        </PanelLoading>
      )}

      {results.isError && !results.data && (
        <PanelError retrying={results.isFetching} onRetry={() => void results.refetch()}>
          {lookupErrorMessage(results.error)}
        </PanelError>
      )}

      {results.status === "success" && emotes.length === 0 && (
        <Text size="sm" tone="muted">
          Nothing on {name} matches “{query}”.
        </Text>
      )}

      {emotes.length > 0 && (
        <EmoteMenu kind="catalog" guild={guild} selectable={false}>
          <EmoteGrid emotes={emotes} label={title} onEndReached={loadMore} />
        </EmoteMenu>
      )}

      {isFetchingNextPage && <PanelLoading>loading more…</PanelLoading>}

      {isFetchNextPageError && (
        <PanelError retrying={isFetchingNextPage} onRetry={() => void fetchNextPage()}>
          {lookupErrorMessage(results.error)}
        </PanelError>
      )}

      {results.status === "success" && emotes.length > 0 && !hasNextPage && (
        <p className="font-mono text-muted text-xs">
          end of the list · {emotes.length} emotes
        </p>
      )}
    </section>
  );
}
