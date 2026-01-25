/**
 * SEMANTIC CLUSTERING
 *
 * Greedy nearest-neighbor algorithm for clustering semantically similar content.
 * Groups related articles (e.g., 12 "Queens Subway Delays" articles) into topics.
 *
 * Algorithm:
 * 1. Sort items by score (best first)
 * 2. First item becomes cluster centroid
 * 3. Each subsequent item joins nearest cluster if similarity >= threshold
 * 4. Otherwise, item starts new cluster
 * 5. Moving average updates centroid as items join
 *
 * Why greedy? K-means requires known K; HDBSCAN adds complexity.
 * Greedy with high threshold (0.85) produces tight, meaningful clusters.
 */

import { cosineSimilarity } from "./embedding-service";

// Default similarity threshold for clustering
export const DEFAULT_CLUSTER_THRESHOLD = 0.85;

export interface ClusterableItem {
  id: string;
  embedding: number[];
  score: number;
  title: string;
}

export interface TopicCluster {
  /** Unique cluster identifier */
  id: string;
  /** ID of the representative (centroid) item */
  centroidId: string;
  /** Centroid embedding (average of all members) */
  centroid: number[];
  /** IDs of all items in this cluster */
  memberIds: string[];
  /** Average quality score of cluster members */
  avgScore: number;
  /** Title of the highest-scored item (representative) */
  topTitle: string;
  /** Number of items in cluster */
  size: number;
  /** Computed cluster rank score */
  rankScore: number;
}

/**
 * Cluster items using greedy nearest-neighbor algorithm.
 *
 * @param items - Items to cluster (must have embeddings)
 * @param threshold - Minimum similarity to join a cluster (0-1)
 * @returns Array of topic clusters
 */
export function clusterItems(
  items: ClusterableItem[],
  threshold: number = DEFAULT_CLUSTER_THRESHOLD
): TopicCluster[] {
  if (items.length === 0) return [];

  // Sort by score descending (best items become centroids)
  const sorted = [...items].sort((a, b) => b.score - a.score);

  const clusters: TopicCluster[] = [];
  const itemToCluster = new Map<string, number>(); // item.id -> cluster index

  for (const item of sorted) {
    // Find nearest existing cluster
    let bestClusterIdx = -1;
    let bestSimilarity = -1;

    for (let i = 0; i < clusters.length; i++) {
      const similarity = cosineSimilarity(item.embedding, clusters[i].centroid);
      if (similarity >= threshold && similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestClusterIdx = i;
      }
    }

    if (bestClusterIdx >= 0) {
      // Join existing cluster
      const cluster = clusters[bestClusterIdx];
      cluster.memberIds.push(item.id);
      cluster.size++;

      // Update centroid with moving average
      cluster.centroid = updateCentroid(
        cluster.centroid,
        item.embedding,
        cluster.size
      );

      // Update average score
      cluster.avgScore =
        (cluster.avgScore * (cluster.size - 1) + item.score) / cluster.size;

      itemToCluster.set(item.id, bestClusterIdx);
    } else {
      // Start new cluster
      const newCluster: TopicCluster = {
        id: `cluster_${clusters.length}`,
        centroidId: item.id,
        centroid: [...item.embedding],
        memberIds: [item.id],
        avgScore: item.score,
        topTitle: item.title,
        size: 1,
        rankScore: 0, // Will be calculated later
      };

      itemToCluster.set(item.id, clusters.length);
      clusters.push(newCluster);
    }
  }

  // Calculate rank scores for each cluster
  for (const cluster of clusters) {
    cluster.rankScore = calculateClusterRank(cluster);
  }

  // Sort clusters by rank score descending
  clusters.sort((a, b) => b.rankScore - a.rankScore);

  return clusters;
}

/**
 * Update centroid with moving average as new item joins.
 */
function updateCentroid(
  currentCentroid: number[],
  newEmbedding: number[],
  newSize: number
): number[] {
  // Moving average formula: new_avg = old_avg + (new_value - old_avg) / n
  return currentCentroid.map(
    (val, i) => val + (newEmbedding[i] - val) / newSize
  );
}

/**
 * Calculate cluster ranking score.
 *
 * Formula: score = avgQuality * log(size + 1)
 *
 * Log dampens size advantage so quality still matters.
 * A 3-article cluster with score 80 beats a 10-article cluster with score 40.
 */
function calculateClusterRank(cluster: TopicCluster): number {
  // log(size + 1) gives: 1 item = 0.69, 3 items = 1.39, 10 items = 2.4
  const sizeBonus = Math.log(cluster.size + 1);
  return cluster.avgScore * sizeBonus;
}

/**
 * Select top N clusters and return representative items.
 *
 * @param clusters - Ranked clusters
 * @param topN - Number of clusters to select
 * @returns Array of centroid item IDs
 */
export function selectTopClusters(
  clusters: TopicCluster[],
  topN: number
): string[] {
  return clusters.slice(0, topN).map((c) => c.centroidId);
}

/**
 * Get cluster summary statistics.
 */
export interface ClusterStats {
  totalClusters: number;
  avgClusterSize: number;
  maxClusterSize: number;
  singletonClusters: number;
  totalItems: number;
}

export function getClusterStats(clusters: TopicCluster[]): ClusterStats {
  if (clusters.length === 0) {
    return {
      totalClusters: 0,
      avgClusterSize: 0,
      maxClusterSize: 0,
      singletonClusters: 0,
      totalItems: 0,
    };
  }

  const sizes = clusters.map((c) => c.size);
  const totalItems = sizes.reduce((a, b) => a + b, 0);

  return {
    totalClusters: clusters.length,
    avgClusterSize: totalItems / clusters.length,
    maxClusterSize: Math.max(...sizes),
    singletonClusters: sizes.filter((s) => s === 1).length,
    totalItems,
  };
}

/**
 * Merge two clusters into one.
 * Useful for manual cluster adjustment or hierarchical clustering.
 */
export function mergeClusters(
  cluster1: TopicCluster,
  cluster2: TopicCluster
): TopicCluster {
  const totalSize = cluster1.size + cluster2.size;

  // Weighted average of centroids
  const mergedCentroid = cluster1.centroid.map(
    (val, i) =>
      (val * cluster1.size + cluster2.centroid[i] * cluster2.size) / totalSize
  );

  // Keep the higher-scored item as representative
  const isCluster1Better = cluster1.avgScore >= cluster2.avgScore;

  return {
    id: cluster1.id,
    centroidId: isCluster1Better ? cluster1.centroidId : cluster2.centroidId,
    centroid: mergedCentroid,
    memberIds: [...cluster1.memberIds, ...cluster2.memberIds],
    avgScore:
      (cluster1.avgScore * cluster1.size + cluster2.avgScore * cluster2.size) /
      totalSize,
    topTitle: isCluster1Better ? cluster1.topTitle : cluster2.topTitle,
    size: totalSize,
    rankScore: 0, // Recalculate after merge
  };
}
