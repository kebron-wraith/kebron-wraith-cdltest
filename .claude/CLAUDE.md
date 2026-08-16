# cdl-final Project - External Memory Configuration

This project uses the Kebron OS Template LLM Wiki as its external memory/brain system.

## External Memory System

**Location**: `C:\Users\Kebro\Documents\Kebron OS Template`

**Access Methods**:
1. **MCP Server**: http://127.0.0.1:19828 (running from the Kebron OS Template llm_wiki_app)
2. **Direct File Access**: Browse the wiki/ directory in the Kebron OS Template
3. **Documentation**: See `README_LLM_WIKI.md` in this project for detailed usage instructions

## Usage Guidelines

When working on this project:
- Treat the Kebron OS Template LLM Wiki as your persistent knowledge base
- Query it for relevant information before starting new tasks
- The LLM owns the wiki layer entirely - it creates/update pages, maintains cross-references
- Human role: curate sources, direct analysis, ask good questions
- LLM role: summarize, extract, integrate, maintain cross-references, perform bookkeeping

## Plugin Skills & Best Practices

To ensure high-quality development, leverage the following installed skills and plugins:

### Available Skill Sets
- **engineering-skills@claude-code-skills** - 32 engineering skills (build, review, test for all major languages + domains)
- **engineering-advanced-skills@claude-code-skills** - 40 advanced engineering skills (agents, security, infra, migration, observability, etc.)
- **llm-wiki@claude-code-skills** - LLM Wiki vault system (active)
- **karpathy-coder@claude-code-skills** - Karpathy 4-principle code reviews
- **self-improving-agent@claude-code-skills** - 6 self-improvement agents
- **claude-mem@thedotmack** - Claude Mem memory plugin

### Recommended Skill Usage
- Use **planner** agent for complex feature implementation and architectural decisions
- Use **code-reviewer** agent immediately after writing/modifying code
- Use **tdd-guide** agent for test-driven development workflow
- Use **security-reviewer** agent for security analysis before commits
- Use **build-error-resolver** agent when build fails
- Use **e2e-runner** agent for end-to-end testing of critical user flows
- Use **llm-wiki:wiki-ingestor** to ingest new sources into memory
- Use **llm-wiki:wiki-librarian** to query the knowledge base
- Use **llm-wiki:wiki-linter** for periodic health checks

### Code Quality Standards
Follow these principles for all development:
- **Immutability**: Prefer immutable data patterns
- **KISS**: Keep solutions simple and avoid premature optimization
- **DRY**: Extract repeated logic into shared functions
- **YAGNI**: Don't build features before they're needed
- **Error Handling**: Handle errors explicitly at every level
- **Input Validation**: Validate all input at system boundaries
- **Naming Conventions**: Use camelCase for variables/functions, PascalCase for types/components

## Current Knowledge Available

From the ingested sources, the LLM Wiki currently contains knowledge about:
- [[AI 2027]] - Research-backed AI scenario forecast
- [[Superhuman AI researcher]] - AI system surpassing human researchers in AI research tasks
- Related entities and concepts from the AI 2027 scenario

To use this memory:
1. Formulate your question about the current task
2. Query the LLM Wiki via MCP server or direct access
3. Synthesize the answer using information retrieved
4. Optionally file valuable insights back to the wiki

This configuration gives this project access to a growing, persistent knowledge base that accumulates over time, combined with best-in-class development skills for finishing coding tasks to the highest standard.