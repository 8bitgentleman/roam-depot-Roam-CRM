# Workflow Preferences
## Task Execution
- Focus only on code relevant to the task; never touch unrelated code.
- Break complex tasks into logical stages; pause and ask for confirmation before next step.
- For simple, low-risk tasks, implement fully; for complex tasks, use review checkpoints.

## Planning and Progress
- Before major features, generate `plan.md` with steps and wait for my approval.
- After each component, summarize what’s done in `progress.md` and update `TODO.txt` with next steps.
- If context exceeds 150k tokens, summarize prior work into `context-summary.md` and restart chat.

## Testing and Feedback
- Write thorough tests for all major functionality; suggest edge case tests.
- Be responsive to my feedback—adjust granularity (more/less checkpoints) as I prefer.

> **Purpose:** Governs how AI executes tasks, ensuring focus, transparency, and testability. Checkpoints and logs (e.g., `progress.md`) make it iterative and maintainable, especially for large projects.
