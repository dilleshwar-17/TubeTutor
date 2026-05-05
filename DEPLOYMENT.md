# Free Deployment

This app supports two storage modes:

- Local development: JSON file at `data/db.json`.
- Deployment: PostgreSQL when `DATABASE_URL` is set.

Use PostgreSQL for Render or Vercel. Free web-service files are temporary and should not be used as the deployed database.

## Required Environment Variables

```text
GOOGLE_CLIENT_ID=your-google-oauth-web-client-id.apps.googleusercontent.com
SESSION_SECRET=replace-with-a-long-random-secret
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
NODE_ENV=production
```

## Google OAuth Setup

1. Open Google Cloud Console.
2. Create an OAuth Client ID with application type `Web application`.
3. Add authorized JavaScript origins:
   - `http://localhost:3000`
   - your Render URL
   - your Vercel URL
4. Copy the client ID into `GOOGLE_CLIENT_ID`.

This app uses Google Identity Services. The frontend receives the Google ID token, sends it to `/api/auth/google`, and the backend verifies it before creating the login session.

## Database

For a free persistent database, create a free Neon Postgres project and copy its connection string into `DATABASE_URL`.

## Render

1. Push this project to GitHub.
2. In Render, create a new Web Service from the repo.
3. Use:
   - Build command: `npm install`
   - Start command: `npm start`
   - Instance type: Free
4. Add the required environment variables.

Render can also read `render.yaml`, but you still need to add private values for `GOOGLE_CLIENT_ID` and `DATABASE_URL`.

## Vercel

1. Push this project to GitHub.
2. Import the repo in Vercel.
3. Keep the default install/build settings.
4. Add the required environment variables.

`public/index.html` is served as the frontend. `api/index.js` exposes the Express backend as a Vercel function.
