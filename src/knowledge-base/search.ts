import { IndexedDocument, SearchResult } from '../schemas/knowledge-base.js';

/**
 * Simple keyword-based search engine
 * MVP implementation - can be upgraded to vector search (txtai/FAISS) later
 */
export class SearchEngine {
  private documents: Map<string, IndexedDocument> = new Map();

  /**
   * Add documents to the index
   */
  addDocuments(documents: IndexedDocument[]): void {
    for (const doc of documents) {
      this.documents.set(doc.id, doc);
    }
    console.error(`Indexed ${documents.length} documents. Total: ${this.documents.size}`);
  }

  /**
   * Search documents by keyword
   */
  search(query: string, maxResults: number = 10): SearchResult[] {
    const queryLower = query.toLowerCase();
    const results: SearchResult[] = [];

    for (const doc of this.documents.values()) {
      const contentLower = doc.content.toLowerCase();

      // Simple keyword match
      if (contentLower.includes(queryLower)) {
        // Calculate simple relevance score based on term frequency
        const matches = contentLower.split(queryLower).length - 1;
        const score = Math.min(matches / 10, 1.0); // Normalize to 0-1

        // Extract snippet around first match
        const firstMatchIndex = contentLower.indexOf(queryLower);
        const snippetStart = Math.max(0, firstMatchIndex - 100);
        const snippetEnd = Math.min(doc.content.length, firstMatchIndex + 200);
        const snippet = doc.content.slice(snippetStart, snippetEnd);

        results.push({
          document: doc,
          score,
          snippet: `...${snippet}...`,
        });
      }
    }

    // Sort by score (descending) and limit results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  /**
   * Get statistics about the index
   */
  getStats(): {
    totalDocuments: number;
    repositories: Set<string>;
    fileTypes: Map<string, number>;
  } {
    const repositories = new Set<string>();
    const fileTypes = new Map<string, number>();

    for (const doc of this.documents.values()) {
      repositories.add(`${doc.repoOwner}/${doc.repoName}`);

      const currentCount = fileTypes.get(doc.metadata.fileType) || 0;
      fileTypes.set(doc.metadata.fileType, currentCount + 1);
    }

    return {
      totalDocuments: this.documents.size,
      repositories,
      fileTypes,
    };
  }

  /**
   * List all indexed repositories
   */
  listRepositories(): Array<{ owner: string; repo: string; fileCount: number }> {
    const repoMap = new Map<string, number>();

    for (const doc of this.documents.values()) {
      const key = `${doc.repoOwner}/${doc.repoName}`;
      repoMap.set(key, (repoMap.get(key) || 0) + 1);
    }

    return Array.from(repoMap.entries()).map(([repo, count]) => {
      const [owner, name] = repo.split('/');
      return { owner, repo: name, fileCount: count };
    });
  }

  /**
   * Get a specific document by ID
   */
  getDocument(id: string): IndexedDocument | undefined {
    return this.documents.get(id);
  }

  /**
   * Clear all indexed documents
   */
  clear(): void {
    this.documents.clear();
  }
}
