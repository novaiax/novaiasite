PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS journal_posts (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'note' CHECK (kind IN ('note','article','photo')),
  project TEXT NOT NULL DEFAULT '',
  cover_url TEXT NOT NULL DEFAULT '',
  cover_alt TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  published_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS journal_posts_public ON journal_posts(status, published_at DESC);

CREATE TABLE IF NOT EXISTS journal_slug_aliases (
  slug TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES journal_posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS journal_likes (
  post_id TEXT NOT NULL REFERENCES journal_posts(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (post_id, visitor_id)
);

-- No IP address, user-agent, name, or email is stored for readers.
CREATE TABLE IF NOT EXISTS journal_rate_limits (
  key TEXT NOT NULL,
  window INTEGER NOT NULL,
  hits INTEGER NOT NULL DEFAULT 1,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (key, window)
);
CREATE INDEX IF NOT EXISTS journal_rate_expiry ON journal_rate_limits(expires_at);
