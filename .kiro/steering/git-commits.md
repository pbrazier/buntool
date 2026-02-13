# Git Commits

Keep commits small and focused. Don't let work pile up uncommitted.

## Before committing

- Always run `git log --oneline -10` first to check what the user has already committed. Don't suggest committing work that's already been committed.
- Run `git status` to see what's actually pending.

## When to commit

After completing any of the following, ask the user if they'd like to commit:

- A TODO task or feature is complete and tested
- A bug fix has been applied and confirmed working
- A steering file or config change that stands on its own
- A version bump
- Any batch of related changes that forms a logical unit

## Rules

- Never commit without asking the user first.
- Suggest a commit message when asking. Use conventional commit format: `feat:`, `fix:`, `chore:`, `docs:`.
- If multiple logical changes have been made since the last commit, suggest breaking them into separate commits if practical.
- Stage all related files together. Don't leave half a feature uncommitted.
- Don't commit generated files, temp files, or `.DS_Store`.
- Don't commit `TODO.md` — that's user-managed and changes frequently. Leave it unstaged.
