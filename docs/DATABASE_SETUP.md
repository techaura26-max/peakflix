# PeakFlix database setup

This guide connects the live website to a real PostgreSQL database so visitors can create accounts and keep their own favorites, watch history, searches, and lists.

## The three parts

PeakFlix has three separate parts:

1. **GitHub Pages** shows the React website.
2. **Render** runs the private Express API.
3. **Supabase** stores the PostgreSQL data.

The browser must never connect with the PostgreSQL password. It talks to the API, and only the API knows `DATABASE_URL`.

## Part 1: Create the Supabase database

1. Sign in at [Supabase](https://supabase.com/dashboard).
2. Create a project and save its database password somewhere safe.
3. Open the project and click **Connect**.
4. Copy the **Session pooler** connection string. Session mode uses port `5432` and works well for a persistent Express server on an IPv4 host.
5. Replace the password placeholder in that string with your real database password.

The value looks similar to this:

```text
postgresql://postgres.PROJECT_ID:YOUR_PASSWORD@aws-REGION.pooler.supabase.com:5432/postgres
```

If the password contains characters such as `@`, `:`, `/`, `#`, or `%`, URL-encode the password first.

Official reference: [Supabase database connections](https://supabase.com/docs/guides/database/connecting-to-postgres).

## Part 2: Deploy the API on Render

The repository contains `render.yaml`, so Render can configure most settings automatically.

1. Sign in at [Render](https://dashboard.render.com/).
2. Choose **New**, then **Blueprint**.
3. Connect the `techaura26-max/peakflix` repository.
4. Render finds `render.yaml` and creates `peakflix-api`.
5. Enter these two requested values:

| Name | Value |
| --- | --- |
| `DATABASE_URL` | The Supabase Session pooler string |
| `FRONTEND_URL` | `https://techaura26-max.github.io/peakflix` |

6. Deploy the service. The start command applies migrations and then starts the API.
7. Copy the Render URL, for example `https://peakflix-api.onrender.com`.
8. Open `https://YOUR-RENDER-URL/api/health` and confirm you see database status `ok`.

Render generates `JWT_SECRET` and `PASSWORD_RESET_SECRET` automatically. Do not copy them into frontend settings.

Official references: [Deploy Express on Render](https://render.com/docs/deploy-node-express-app) and [Render environment variables](https://render.com/docs/configure-environment-variables).

## Part 3: Point GitHub Pages to the API

1. Open the GitHub repository.
2. Go to **Settings → Secrets and variables → Actions**.
3. Create a repository secret named `VITE_API_BASE_URL`.
4. Set its value to your Render API URL plus `/api`:

```text
https://peakflix-api.onrender.com/api
```

5. Keep the existing `TMDB_READ_TOKEN` secret.
6. Open **Actions**, choose the PeakFlix deployment workflow, and run it again.

GitHub Pages will rebuild the frontend with the correct API address. GitHub encrypts Actions secrets; see [GitHub Actions secrets](https://docs.github.com/en/actions/reference/security/secrets).

## Test a real account

1. Open the live PeakFlix signup page in a private browser window.
2. Confirm the security-question menu contains ten questions.
3. Create a new test account.
4. Sign out and sign in again.
5. Save a favorite, then open the profile and synchronize the library.
6. In Supabase, open **Table Editor** and check `users`, `favorites`, and `watch_history`.

Passwords and security answers appear only as hashes. This is correct. Never try to turn the hashes back into the original text.

## How migrations work

Database files are in `database/migrations` and run in number order. `peakflix_schema_migrations` records which files were applied.

After a migration has reached production, do not edit it. Create the next file instead:

```text
database/migrations/004_my_change.sql
```

Example:

```sql
begin;

alter table users add column if not exists display_name text;

commit;
```

Run `npm run migrate` locally to test it. After you push the new migration, Render applies it during the next start. An advisory lock prevents two server instances from migrating at the same time.

## Add or change a security question

Create a new migration. Do not edit an old applied migration.

```sql
begin;

insert into security_questions (id, question, is_active)
values (11, 'What is a memorable place you visited?', true)
on conflict (id) do update
set question = excluded.question, is_active = excluded.is_active;

commit;
```

To hide a question for future signups without breaking existing accounts:

```sql
update security_questions set is_active = false where id = 11;
```

## Safe maintenance rules

- Make a Supabase backup before a large migration.
- Test migrations on a separate Supabase project first.
- Never store plain passwords or security answers.
- Never put `DATABASE_URL` in a variable whose name begins with `VITE_`.
- Keep database tables blocked from Supabase browser roles; the Express API is the only data gateway.
- Rotate database and JWT secrets if they are ever exposed.
- Watch the API logs and Supabase database-connection charts after deployment.

For a future professional upgrade, replace security-question recovery with verified email reset links. The current flow is hardened against token reuse, but email recovery is safer and more familiar to users.
