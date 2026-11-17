-- Hand-edited to be idempotent: production may already have these tables from drizzle-kit push.
CREATE TABLE IF NOT EXISTS "stv_sync_configs" (
	"guild_id" varchar(255) PRIMARY KEY NOT NULL,
	"twitch_id" varchar(32) NOT NULL,
	"twitch_login" varchar(64) NOT NULL,
	"twitch_display_name" varchar(64) NOT NULL,
	"stv_user_id" varchar(32) NOT NULL,
	"emote_set_id" varchar(32),
	"enabled" boolean DEFAULT true NOT NULL,
	"settings" jsonb NOT NULL,
	"linked_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stv_sync_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" varchar(255) NOT NULL,
	"stv_emote_id" varchar(32) NOT NULL,
	"discord_emoji_id" varchar(32) NOT NULL,
	"name" varchar(64) NOT NULL,
	"animated" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stv_sync_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" varchar(255) NOT NULL,
	"action" varchar(32) NOT NULL,
	"stv_emote_id" varchar(32),
	"name" varchar(128),
	"animated" boolean,
	"discord_emoji_id" varchar(32),
	"reason" varchar(32),
	"detail" varchar(128),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stv_sync_review" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" varchar(255) NOT NULL,
	"stv_emote_id" varchar(32) NOT NULL,
	"name" varchar(128) NOT NULL,
	"animated" boolean NOT NULL,
	"file_url" text NOT NULL,
	"preview_url" text NOT NULL,
	"width" integer,
	"height" integer,
	"author" varchar(64),
	"reason" varchar(32) NOT NULL,
	"detail" varchar(64),
	"flagged_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "stv_sync_links_guild_emote_idx" ON "stv_sync_links" USING btree ("guild_id","stv_emote_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stv_sync_links_emoji_idx" ON "stv_sync_links" USING btree ("discord_emoji_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stv_sync_log_guild_id_idx" ON "stv_sync_log" USING btree ("guild_id","id" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "stv_sync_review_guild_emote_idx" ON "stv_sync_review" USING btree ("guild_id","stv_emote_id");