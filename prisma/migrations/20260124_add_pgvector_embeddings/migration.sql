-- Enable pgvector extension for semantic embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding columns to NewsArticle
ALTER TABLE "news_articles"
ADD COLUMN "embedding" vector(1536),
ADD COLUMN "embedding_model" TEXT,
ADD COLUMN "embedding_at" TIMESTAMPTZ,
ADD COLUMN "topic_cluster_id" TEXT;

-- Add embedding columns to AlertEvent
ALTER TABLE "alert_events"
ADD COLUMN "embedding" vector(1536),
ADD COLUMN "embedding_model" TEXT,
ADD COLUMN "embedding_at" TIMESTAMPTZ,
ADD COLUMN "topic_cluster_id" TEXT;

-- Create HNSW indexes for efficient similarity search
-- m = 16: connections per layer (balance speed/recall)
-- ef_construction = 64: build-time accuracy (higher = better recall, slower build)
CREATE INDEX "news_embedding_idx" ON "news_articles"
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX "alert_embedding_idx" ON "alert_events"
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Index on topic_cluster_id for cluster queries
CREATE INDEX "news_topic_cluster_idx" ON "news_articles" (topic_cluster_id);
CREATE INDEX "alert_topic_cluster_idx" ON "alert_events" (topic_cluster_id);
