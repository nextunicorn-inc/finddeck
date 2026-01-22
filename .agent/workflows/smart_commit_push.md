---
description: Analyze changes, create atomic commits, review, and push. (ONLY execute when explicitly requested via /smart_commit_push)
---

1. **Analyze Workspace**:
   - Run `git status` to see modified files.
   - Run `git diff` to understand the context of changes.

2. **Atomic Commits**:
   - Based on the diff, identify logical groups of changes (e.g., separate UI tweaks from backend logic).
   - For each logical group:
     - Use `git add <files>` to stage relevant files.
     - Use `git commit -m "type: description"` following Conventional Commits.
     - **Important**: Write commit messages in Korean (한글). Translate the description to Korean.
   - Strict Rule: Do not use `git add .` unless all changes are strictly related to a single atomic commit.

3. **Push (Automatic)**:
   - // turbo
   - Automatically run `git push` without asking for confirmation.