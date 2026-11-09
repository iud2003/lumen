CREATE TABLE shows (id TEXT PRIMARY KEY, owner TEXT NOT NULL, name TEXT NOT NULL, state TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, updated INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE players (id TEXT PRIMARY KEY, owner TEXT NOT NULL, show_id TEXT, code TEXT UNIQUE, expires INTEGER NOT NULL, heartbeat INTEGER NOT NULL DEFAULT 0, report TEXT NOT NULL DEFAULT '{}');
--> statement-breakpoint
CREATE INDEX players_show ON players(show_id);
--> statement-breakpoint
CREATE TABLE media (id TEXT PRIMARY KEY, owner TEXT NOT NULL, show_id TEXT NOT NULL, name TEXT NOT NULL, kind TEXT NOT NULL, size INTEGER NOT NULL, mime TEXT NOT NULL);
