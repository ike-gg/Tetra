-- Hand-edited to be idempotent: production had these tables (from drizzle-kit push)
-- before migrations existed, so every statement must be a no-op when the object exists.
DO $$ BEGIN
	CREATE TYPE "public"."origin" AS ENUM('DISCORD', 'SEVENTV', 'BTTV', 'FFZ', 'TWITCH', 'CUSTOM');
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "continuity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(256) NOT NULL,
	"data" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "editor_tasks" (
	"id" varchar PRIMARY KEY NOT NULL,
	"guild_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"emote_id" bigint NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"channel_id" varchar(255),
	"message_id" varchar(255)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "emotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_id" varchar(255) NOT NULL,
	"is_animated" boolean NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"preview_url" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"origin" "origin" NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "removed_emotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" varchar(255) NOT NULL,
	"emote_id" bigint NOT NULL,
	"deleted_with_panel" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "interactions" (
	"id" bigint PRIMARY KEY NOT NULL,
	"command" varchar(256) NOT NULL,
	"input" jsonb,
	"created_at" timestamp DEFAULT now(),
	"user_id" varchar(256) NOT NULL,
	"guild_id" varchar(256)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"session_token" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"last_used_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"discord_id" varchar(255) NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"token_expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_discord_id_unique" UNIQUE("discord_id")
);
--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE contype = 'f'
			AND conrelid = 'public.editor_tasks'::regclass
			AND confrelid = 'public.emotes'::regclass
	) THEN
		ALTER TABLE "editor_tasks" ADD CONSTRAINT "editor_tasks_emote_id_emotes_id_fk" FOREIGN KEY ("emote_id") REFERENCES "public"."emotes"("id") ON DELETE no action ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE contype = 'f'
			AND conrelid = 'public.removed_emotes'::regclass
			AND confrelid = 'public.emotes'::regclass
	) THEN
		ALTER TABLE "removed_emotes" ADD CONSTRAINT "removed_emotes_emote_id_emotes_id_fk" FOREIGN KEY ("emote_id") REFERENCES "public"."emotes"("id") ON DELETE no action ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE contype = 'f'
			AND conrelid = 'public.sessions'::regclass
			AND confrelid = 'public.users'::regclass
	) THEN
		ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
	END IF;
END $$;