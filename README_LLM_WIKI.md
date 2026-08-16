# Using Kebron OS Template LLM Wiki as External Memory

This directory can use the Kebron OS Template LLM Wiki as an external brain/memory system for reference when needed.

## Overview

The Kebron OS Template implements an LLM Wiki - a persistent, interlinked collection of markdown files that incrementally integrates knowledge from raw sources. The LLM owns the wiki layer entirely, creating and updating pages, maintaining cross-references, and keeping everything consistent.

**Human role**: Curate sources, direct analysis, ask good questions  
**LLM role**: Summarize, extract, integrate, maintain cross-references, perform bookkeeping

## Access Methods

### 1. Direct MCP Server Access (Recommended)

The LLM Wiki desktop app includes an MCP server running at:
```
http://127.0.0.1:19828
```

#### Health Check
```bash
curl http://127.0.0.1:19828/api/v1/health
```

#### Search the Wiki
```bash
curl -X POST http://127.0.0.1:19828/api/v1/projects/current/search \
  -H "Content-Type: application/json" \
  -d '{"query":"your search term","topK":5}'
```

#### Read a Specific Page
```bash
curl http://127.0.0.1:19828/api/v1/projects/current/files/content?path=wiki/sources/AI%202027.md
```

### 2. Using the llm-wiki Skill

If you have the llm-wiki skill installed in your Claude Code environment, you can invoke it directly:

```
Skill: llm-wiki:wiki-librarian
```
Then ask your question about the wiki contents.

### 3. Manual File Access

The wiki files are stored in:
```
C:\Users\Kebro\Documents\Kebron OS Template\wiki\
```

You can directly read these files when needed, though using the MCP server or skill is preferred for proper cross-referencing.

## Current Knowledge Base Contents

From the AI 2027 ingest, the following knowledge is now available:

### Source Documents
- [[AI 2027]] - Research-backed AI scenario forecast predicting superhuman AI by 2027

### Key Concepts
- [[Superhuman AI researcher]] - AI system surpassing human researchers in AI research tasks (achieved Aug 2027 per scenario)

### Key Entities
- [[OpenBrain]] - Leading US AI company developing Agent series
- [[DeepCent]] - Chinese AI company with 10% world compute
- [[Agent-4]] - Superhuman AI researcher AI system
- [[Daniel Kokotajlo]] - Primary author of AI 2027 scenario
- And many others...

### Related Concepts in Wiki
- [[AI arms race]]
- [[AI misalignment]]
- [[Compute strategy]]
- [[Three-layer architecture]]
- [[Ingest workflow]]
- [[Query workflow]]
- [[Lint workflow]]

## Query Workflow

When you need to use the LLM Wiki as memory:

1. **Formulate your question** - What specific information do you need?
2. **Search the wiki** - Use the MCP server or skill to find relevant pages
3. **Read relevant pages** - Extract information from the returned results
4. **Synthesize answer** - Combine information, citing sources with [[wikilink]] references
5. **Optional: File back** - If your answer is valuable, consider adding it as a new wiki page

## Example Usage

If working on AI strategy in the cdl-final project and want to recall the AI 2027 timeline:

```
Question: What are the key milestones in the AI 2027 scenario?

Search results would return:
- [[AI 2027]] source document
- [[Superhuman AI researcher]] concept
- Possibly [[Superhuman coder]], [[Superintelligent AI researcher]], [[Artificial superintelligence]]

Answer would synthesize: The AI 2027 scenario predicts Superhuman coder by Mar 2027, Superhuman AI researcher by Aug 2027, Superintelligent AI researcher by Nov 2027, and Artificial superintelligence by Dec 2027.
```

## Maintenance

The LLM Wiki is maintained automatically through:
- **Ingest**: When new sources are added to `raw/` in the Kebron OS Template
- **Query**: When you ask questions and the LLM synthesizes answers
- **Lint**: Periodic health checks to maintain quality and consistency

To contribute to the wiki from this project:
1. Place any source documents you want to ingest in `C:\Users\Kebro\Documents\Kebron OS Template\raw\`
2. The LLM will process them through its ingest workflow
3. Your knowledge becomes part of the persistent memory system

## Benefits

- **Persistent knowledge**: Information accumulates over time instead of being rediscovered
- **Cross-referenced**: Related concepts are automatically linked
- **Consistent**: The LLM maintains coherence across all pages
- **Efficient**: Minimal maintenance overhead - the LLM handles bookkeeping
- **Contextual**: Knowledge is organized by entities, concepts, and sources

This setup gives you a true second brain that grows smarter with every interaction.