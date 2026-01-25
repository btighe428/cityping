// src/lib/agents/clustering-agent.ts
/**
 * CLUSTERING AGENT (LLM-based story grouping)
 *
 * Groups related news articles into thematic clusters using GPT-4o.
 * This enables "Deep Dive" sections that synthesize multiple stories
 * into coherent narratives.
 *
 * Features:
 * - Takes 15-30 articles and groups into 3-5 thematic clusters
 * - Generates headlines and summaries for each cluster
 * - Identifies the most representative article per cluster
 * - Scores cluster significance for prioritization
 *
 * Cost: ~$0.01/day (2000 tokens at gpt-4o rates)
 */

import { getOpenAIClient } from "../embeddings/openai-client";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Input article for clustering.
 */
export interface ClusterableArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: Date;
  score: number; // Quality score from scoring.ts
  url?: string;
}

/**
 * A cluster of related articles with LLM-generated metadata.
 */
export interface StoryCluster {
  id: string;
  theme: string; // Short theme name (e.g., "Transit Disruptions")
  headline: string; // LLM-generated summary headline
  summary: string; // 2-3 sentence synthesis
  articles: ClusterableArticle[];
  representativeId: string; // Best article to feature
  significance: number; // 1-10 importance score
}

/**
 * Result of the clustering operation.
 */
export interface ClusteringResult {
  clusters: StoryCluster[];
  unclustered: ClusterableArticle[];
  tokensUsed: number;
  errors: string[];
}

export interface ClusteringOptions {
  targetClusters?: number; // Default 4
  minClusterSize?: number; // Default 2
  maxArticles?: number; // Limit input size, default 30
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Cluster articles into thematic groups using GPT-4o.
 *
 * @param articles - Articles to cluster
 * @param options - Clustering configuration
 * @returns ClusteringResult with clusters sorted by significance
 */
export async function clusterArticles(
  articles: ClusterableArticle[],
  options?: ClusteringOptions
): Promise<ClusteringResult> {
  const targetClusters = options?.targetClusters || 4;
  const minClusterSize = options?.minClusterSize || 2;
  const maxArticles = options?.maxArticles || 120;
  const errors: string[] = [];

  // Validate input
  if (articles.length < minClusterSize) {
    return {
      clusters: [],
      unclustered: articles,
      tokensUsed: 0,
      errors: ["Not enough articles to form clusters"],
    };
  }

  // Limit articles to avoid token overflow
  const limitedArticles = articles
    .sort((a, b) => b.score - a.score) // Prioritize high-quality articles
    .slice(0, maxArticles);

  // Call LLM for clustering
  let parsed: LLMClusterResponse;
  let tokensUsed = 0;

  try {
    const llmResult = await clusterWithLLM(limitedArticles, targetClusters);
    parsed = llmResult.response;
    tokensUsed = llmResult.tokensUsed;
  } catch (error) {
    errors.push(
      `LLM clustering failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    return {
      clusters: [],
      unclustered: articles,
      tokensUsed: 0,
      errors,
    };
  }

  // Build clusters with article objects
  const articleMap = new Map(limitedArticles.map((a) => [a.id, a]));
  const clusteredIds = new Set<string>();

  const clusters: StoryCluster[] = (parsed.clusters || [])
    .filter((c) => c.article_ids?.length >= minClusterSize)
    .map((c, i) => {
      const clusterArticles = c.article_ids
        .map((id) => articleMap.get(id))
        .filter((a): a is ClusterableArticle => !!a);

      clusterArticles.forEach((a) => clusteredIds.add(a.id));

      // Validate representative ID
      const representativeId = clusterArticles.some(
        (a) => a.id === c.representative_id
      )
        ? c.representative_id
        : clusterArticles[0]?.id || "";

      return {
        id: `cluster-${i}`,
        theme: c.theme || "Related Stories",
        headline: c.headline || clusterArticles[0]?.title || "News Update",
        summary: c.summary || "",
        articles: clusterArticles,
        representativeId,
        significance: Math.min(10, Math.max(1, c.significance || 5)),
      };
    })
    .sort((a, b) => b.significance - a.significance);

  // Identify unclustered articles
  const unclustered = limitedArticles.filter((a) => !clusteredIds.has(a.id));

  return {
    clusters,
    unclustered,
    tokensUsed,
    errors,
  };
}

// =============================================================================
// LLM CLUSTERING
// =============================================================================

interface LLMClusterResponse {
  clusters: Array<{
    theme: string;
    headline: string;
    summary: string;
    article_ids: string[];
    representative_id: string;
    significance: number;
  }>;
}

interface LLMResult {
  response: LLMClusterResponse;
  tokensUsed: number;
}

// LLM call timeout and retry configuration
const LLM_TIMEOUT_MS = 30000; // 30 second timeout (clustering is more complex)
const LLM_MAX_RETRIES = 2;

/**
 * Call GPT-4o to cluster articles.
 * Includes timeout and retry logic for production robustness.
 */
async function clusterWithLLM(
  articles: ClusterableArticle[],
  targetClusters: number
): Promise<LLMResult> {
  const openai = getOpenAIClient();
  const prompt = buildClusteringPrompt(articles, targetClusters);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= LLM_MAX_RETRIES; attempt++) {
    try {
      const response = await openai.chat.completions.create(
        {
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are an expert NYC news editor. Your job is to identify thematic clusters among news articles and create compelling summaries that help readers understand what's happening in the city.

Output valid JSON only. No markdown code blocks, no explanation.`,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 8000,
          response_format: { type: "json_object" },
        },
        { timeout: LLM_TIMEOUT_MS }
      );

      const content = response.choices[0]?.message?.content || "{}";

      let parsed: LLMClusterResponse;
      try {
        parsed = JSON.parse(content);
        // Ensure clusters array exists
        if (!parsed.clusters) {
          parsed = { clusters: [] };
        }
      } catch {
        throw new Error("Failed to parse LLM response as JSON");
      }

      return {
        response: parsed,
        tokensUsed: response.usage?.total_tokens || 0,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `[ClusteringAgent] LLM attempt ${attempt}/${LLM_MAX_RETRIES} failed: ${lastError.message}`
      );

      // Don't retry on non-transient errors
      if (
        lastError.message.includes("API key") ||
        lastError.message.includes("401") ||
        lastError.message.includes("403") ||
        lastError.message.includes("parse")
      ) {
        break;
      }

      // Wait before retry (exponential backoff)
      if (attempt < LLM_MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }

  throw lastError || new Error("LLM clustering failed after retries");
}

/**
 * Build the prompt for LLM clustering.
 */
function buildClusteringPrompt(
  articles: ClusterableArticle[],
  targetClusters: number
): string {
  const articleList = articles
    .map((a) => {
      const summaryTruncated =
        a.summary.length > 150 ? a.summary.slice(0, 150) + "..." : a.summary;
      return `[${a.id}] "${a.title}" (${a.source}) - ${summaryTruncated}`;
    })
    .join("\n");

  return `Analyze these ${articles.length} NYC news articles and group them into ${targetClusters}-${targetClusters + 1} thematic clusters.

ARTICLES:
${articleList}

For each cluster, provide:
- theme: Short theme name (e.g., "Transit Disruptions", "Housing Crisis", "City Budget")
- headline: Compelling headline summarizing the cluster (max 12 words)
- summary: 2-3 sentence synthesis explaining what's happening and why it matters to NYC residents
- article_ids: Array of article IDs that belong to this cluster
- representative_id: The single best article to feature (most comprehensive or well-written)
- significance: 1-10 score of importance to NYC residents (10 = affects everyone immediately)

STRICT RULES:
- Each article can only belong to one cluster
- Clusters must have at least 2 articles
- Leave truly unrelated articles unclustered (don't force weak connections)
- Prioritize clusters that affect many NYC residents
- The summary should synthesize information across articles, not just repeat headlines

CATEGORY SEPARATION (CRITICAL - DO NOT MIX):
- SPORTS (teams, games, players, coaches) must NEVER be grouped with non-sports news
- HEALTH/SAFETY (medical, emergencies, public health) must stay separate from entertainment
- POLITICS/CIVIC must stay separate from celebrity/entertainment news
- CRIME/SAFETY must stay separate from sports and entertainment
- WEATHER must stay separate from unrelated topics
- If an article doesn't clearly fit a cluster's theme, leave it unclustered

Ask yourself: "Would a reader be confused why this article is in this cluster?" If yes, don't include it.

Respond with JSON: { "clusters": [...] }`;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the top N clusters by significance.
 */
export function getTopClusters(
  clusters: StoryCluster[],
  n: number
): StoryCluster[] {
  return clusters.slice(0, n);
}

/**
 * Get the featured (most significant) cluster.
 */
export function getFeaturedCluster(
  clusters: StoryCluster[]
): StoryCluster | null {
  return clusters[0] || null;
}

/**
 * Get the representative article for a cluster.
 */
export function getRepresentativeArticle(
  cluster: StoryCluster
): ClusterableArticle | null {
  return (
    cluster.articles.find((a) => a.id === cluster.representativeId) ||
    cluster.articles[0] ||
    null
  );
}

/**
 * Calculate total article count across clusters.
 */
export function getTotalClusteredCount(clusters: StoryCluster[]): number {
  return clusters.reduce((sum, c) => sum + c.articles.length, 0);
}

/**
 * Get a summary of clustering results for logging/debugging.
 */
export function summarizeClusteringResult(result: ClusteringResult): string {
  const { clusters, unclustered, tokensUsed, errors } = result;

  if (clusters.length === 0) {
    return `No clusters formed. ${unclustered.length} articles unclustered.`;
  }

  const lines = [
    `Clusters: ${clusters.length}`,
    ...clusters.map(
      (c, i) =>
        `  ${i + 1}. "${c.theme}" (${c.articles.length} articles, significance: ${c.significance})`
    ),
    `Unclustered: ${unclustered.length}`,
    `Tokens used: ${tokensUsed}`,
  ];

  if (errors.length > 0) {
    lines.push(`Errors: ${errors.join(", ")}`);
  }

  return lines.join("\n");
}

/**
 * Prepare articles for email display.
 * Returns a simplified structure for the email template.
 */
export interface ClusterForEmail {
  theme: string;
  headline: string;
  summary: string;
  articleCount: number;
  representativeArticle: {
    title: string;
    source: string;
    url?: string;
  };
  relatedTitles: string[]; // Other article titles for "See also"
}

export function prepareClusterForEmail(
  cluster: StoryCluster
): ClusterForEmail {
  const representative = getRepresentativeArticle(cluster);
  const relatedTitles = cluster.articles
    .filter((a) => a.id !== cluster.representativeId)
    .map((a) => a.title)
    .slice(0, 3); // Show up to 3 related

  return {
    theme: cluster.theme,
    headline: cluster.headline,
    summary: cluster.summary,
    articleCount: cluster.articles.length,
    representativeArticle: {
      title: representative?.title || cluster.headline,
      source: representative?.source || "CityPing",
      url: representative?.url,
    },
    relatedTitles,
  };
}
