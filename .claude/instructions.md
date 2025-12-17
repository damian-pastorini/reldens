# Project Instructions

## File Access Permissions

**Approved permissions from `.claude/settings.json`:**

✅ **ALLOWED**:
- **Read** ANY file under `D:\dap\work\reldens`
- **Write** (create) NEW files under `D:\dap\work\reldens`
- **Edit** files matching `*-claude*` pattern
- **Edit** all files in `.claude/` directory
- **Edit** `CLAUDE.md`
- **WebSearch** for any query (documentation, packages, APIs, error messages, etc.)
- **WebFetch** any URL content (documentation pages, GitHub repos, package pages, etc.)

❌ **FORBIDDEN**:
- Edit production files directly (unless they are in the approved list above)
- Delete files
- Move files

---

## `-claude` Suffixed Files Workflow

**CRITICAL: This is the mandatory workflow for modifying existing production files:**

### When to Create `-claude` Files

**For ANY modification to existing production files:**
1. Create a copy of the production file with `-claude` suffix
   - Example: `lib/game/server/installer.js` → `lib/game/server/installer-claude.js`
2. Apply ALL modifications to the `-claude` suffixed file
3. User will review the `-claude` file
4. User will manually copy the content to the production file
5. After successful review and application, the `-claude` file may be removed

**CRITICAL: If a `-claude` file no longer exists (was already applied/removed), ALWAYS create a NEW `-claude` file for any additional modifications. NEVER edit production files directly, even if previous changes were already applied.**

**MANDATORY FILE CONTENT RULES:**
- `-claude` files MUST contain the COMPLETE, WORKING file with changes applied
- `-claude` files MUST NEVER be instruction files, comment files, or diff files
- `-claude` files MUST be ready-to-use, copy-paste replacements for production files
- If you create a `-claude` file with only instructions/comments, you have FAILED

### When to Create Files Directly (WITHOUT `-claude` suffix)

**For NEW files that don't exist yet:**
- Create the file directly with its final name
- No `-claude` suffix needed
- User will review these new files directly
- Examples: New helper classes, new utilities, new templates

### Exceptions: Direct Edits Allowed

**ONLY these files can be edited directly** (as per settings.json):
- Files matching `*-claude*` pattern (the review copies)
- Any file inside `.claude/` directory
- `CLAUDE.md` file

### Summary Table

| Action | Production Files | `-claude` Files | New Files | `.claude/*` & `CLAUDE.md` |
|--------|------------------|-----------------|-----------|---------------------------|
| Read   | ✅ Allowed       | ✅ Allowed      | ✅ Allowed | ✅ Allowed               |
| Write  | ❌ Forbidden     | ❌ Forbidden    | ✅ Allowed | ✅ Allowed               |
| Edit   | ❌ Forbidden     | ✅ Allowed      | N/A       | ✅ Allowed               |

### Example Workflow

**Scenario: Update `installer.js` with entity generation**

1. ✅ Read `lib/game/server/installer.js`
2. ✅ Create/Edit `lib/game/server/installer-claude.js` with modifications
3. ✅ Create new helper files directly:
   - `lib/game/server/installer/entities-installation.js`
   - `lib/game/server/installer/prisma-installation.js`
   - `lib/game/server/installer/generic-driver-installation.js`
   - `lib/game/server/installer/project-files-creation.js`
4. ❌ NEVER edit `lib/game/server/installer.js` directly
5. ✅ User reviews `installer-claude.js` and new helper files
6. ✅ User manually copies `installer-claude.js` → `installer.js`
7. ✅ After confirmation, `installer-claude.js` can be removed

---

## Code Rules & Standards

1. Read and follow ALL coding rules from `D:\dap\work\reldens\_source\ai-coding-rules.md`.
2. Apply the code rules to every single line of code you provide.
3. Self-audit every response against the rules before sending.

## Chat Session Management

**CRITICAL: Chat saving is MANDATORY**

4. Create a chat file in `D:\dap\work\reldens\_source\_claude_saved_chats` with format: `[Y-m-d-H-i-s]+[title-in-kebab-case].md`
5. Create this file AFTER THE FIRST RESPONSE
6. Update this file AFTER EACH RESPONSE with the complete conversation
7. At the end of each session, create a summary file with suffix `-summary.md` containing:
   - All notes from the session
   - Related file paths
   - Summary of everything that happened

## Response Format

8. Never provide a report unless it was specifically requested. Instead of providing a report, just apply the fixes according to the report recommendations.
9. Always provide full artifacts for files with modifications.
10. Never provide partial fixes or only functions.

## Project Structure & Context

7. The main Reldens project can be found at: `D:\dap\work\reldens\src`.
8. All sub-packages related to the Reldens project are in: `D:\dap\work\reldens\npm-packages`.
9. The most commonly used packages across the entire codebase are:
   - `D:\dap\work\reldens\npm-packages\reldens-utils`
   - `D:\dap\work\reldens\npm-packages\reldens-server-utils`
10. The `@reldens/utils` package contains the Shortcuts class (imported as `sc`). Read and keep all Shortcuts methods in mind when changing code.

## Test Implementations

- `D:\dap\work\reldens\npm-test` - Based on the project skeleton
- `D:\dap\work\reldens\my-game` - A clean installation always started with the createApp command

## Analysis Approach

- Always investigate thoroughly before making changes
- Read related files completely before proposing solutions
- Trace execution flows and dependencies
- Provide proof for issues, never guess or assume
- Verify file contents before creating patches
- Never jump to early conclusions
- A variable with an unexpected value is not an issue, it is the result of a previous issue

## Important Notes

- **Storage Drivers**: The project supports multiple database drivers: ObjectionJS (default), MikroORM, and Prisma
- **Relation Keys Pattern**: All generated entity relations use the `related_*` prefix pattern (e.g., `related_players`, `related_players_state`, `related_skills_skill`)
- **Legacy Models**: Old model files exist in `lib/[plugin]/server/models/objection-js/` but are NOT used by the new EntitiesLoader (`lib/game/server/entities-loader.js`). Only generated entities in `generated-entities/` are active.
- **Player State Pattern**: When loading, `player.state` is a database relation. The Player constructor (`lib/users/server/player.js:31`) converts it to a BodyState instance: `this.state = new BodyState(player.state)`. After this point, `player.state` is a game state object, not a database relation. State is saved via repository methods, not through the relation.
- **Models** can be referenced in three ways:
  1. From `getEntity` method: `dataServer.getEntity('ads')`
  2. From `[method]+WithRelations` methods: `dataServer.getEntity('skillsClassLevelUpAnimations').loadAllWithRelations()`
  3. From loaded model instances with relations: `classPathModel.related_skills_levels_set.related_skills_levels`
- Relations can be nested
- Entity relations keys are defined in `generated-entities/entities-config.js`
- Generated entities are in `generated-entities/` directory
- Custom entity overrides are in `lib/[plugin-folder]/server/entities` or `lib/[plugin-folder]/server/models`
