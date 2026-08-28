# Axia 11 — Second Exam

An Express.js REST API with JWT authentication, where a post can only be
created by an authenticated user and is always attributed to the account on
`req.user`.

## Flow

```
Register  ->  Login  ->  Receive token  ->  Send token  ->  Create post
```

## Requirements

- Node.js 18+
- MongoDB running locally, or a MongoDB Atlas connection string

## Getting started

```bash
npm install
cp .env.example .env     # then fill in the values
npm start                # or: npm run dev
```

### Environment variables

| Variable         | Description                                | Example                                       |
| ---------------- | ------------------------------------------ | --------------------------------------------- |
| `PORT`           | Port the server listens on                 | `4000`                                        |
| `DBURL`          | MongoDB connection string                  | `mongodb://127.0.0.1:27017/axia-11-second-exam` |
| `JWT_SECRET`     | Secret used to sign and verify tokens      | a long random string                          |
| `JWT_EXPIRES_IN` | How long an issued token stays valid       | `1d`                                          |

The server refuses to start if `DBURL` or `JWT_SECRET` is missing.

## Scripts

| Command            | What it does                                  |
| ------------------ | --------------------------------------------- |
| `npm start`        | Start the server                              |
| `npm run dev`      | Start the server and reload on file changes   |
| `npm test`         | Run the Jest test suite                       |
| `npm run lint`     | Lint every source and test file               |
| `npm run lint:fix` | Lint and auto-fix what can be fixed           |

## Project structure

```
config/       mongoose connection
controllers/  request handlers
middlewares/  authentication, not found, error handling
models/       User and Post schemas
routes/       route definitions
utils/        AppError and the createError helper
validators/   request payload rules
tests/        Jest + Supertest suites
app.js        builds and exports the Express app
index.js      loads env, connects to MongoDB, starts the server
```

`app.js` is kept separate from `index.js` so the tests can mount the app
without opening a port or connecting to the real database.

## Models

### User

| Field      | Type   | Notes                                          |
| ---------- | ------ | ---------------------------------------------- |
| `name`     | String | required                                       |
| `email`    | String | required, unique, lowercased, format checked   |
| `password` | String | required, stored as a bcrypt hash, never returned by a query unless explicitly selected |

Timestamps are enabled.

### Post

| Field        | Type     | Notes                                     |
| ------------ | -------- | ----------------------------------------- |
| `title`      | String   | required                                  |
| `description`| String   | required                                  |
| `creatorId`  | ObjectId | required, references the `user` collection |

Timestamps are enabled.

## API

Base URL: `http://localhost:4000`

### `POST /auth/register`

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "password": "Password1!"
}
```

`201 Created`

```json
{
  "message": "registration successful",
  "user": { "id": "6a91...", "name": "Ada Lovelace", "email": "ada@example.com" }
}
```

Passwords must be at least 8 characters and contain an uppercase letter, a
number and a special character. These rules live in `validators/`, not in the
schema, because the database column only ever holds the bcrypt hash.

### `POST /auth/login`

```json
{ "email": "ada@example.com", "password": "Password1!" }
```

`200 OK`

```json
{
  "message": "login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "6a91...", "name": "Ada Lovelace", "email": "ada@example.com" }
}
```

An unknown email and a wrong password return the same message, so the API
never reveals which addresses are registered.

### `GET /auth/me` — protected

Returns whatever the authentication middleware put on `req.user`.

```
Authorization: Bearer <token>
```

### `POST /posts` — protected

```
Authorization: Bearer <token>
```

```json
{ "title": "My first post", "description": "Hello world" }
```

`201 Created`

```json
{
  "message": "post created successfully",
  "post": {
    "title": "My first post",
    "description": "Hello world",
    "creatorId": "6a91...",
    "_id": "6a91...",
    "createdAt": "2026-08-28T19:08:23.165Z",
    "updatedAt": "2026-08-28T19:08:23.165Z"
  }
}
```

The owner is read from `req.user.id`. A `creatorId` sent in the request body is
ignored, so a caller cannot attribute a post to somebody else.

## Authentication

`middlewares/authentication.middleware.js` reads the `Authorization` header,
accepts it with or without the `Bearer ` prefix, verifies the JWT, loads the
account from the database and attaches it to the request:

```js
req.user = { id: user.id, name: user.name, email: user.email };
```

The account is read fresh on every request rather than trusted from the token,
so a token belonging to a deleted user is rejected.

## Error handling

Controllers never build error responses themselves. They throw an `AppError`
carrying a status and hand it to `next(error)`, and one error-handling
middleware mounted last turns it into a response. A request that matches no
route falls through to the not-found middleware and becomes a `404`.

| Situation                       | Status | Message                                  |
| ------------------------------- | ------ | ---------------------------------------- |
| Failed validation               | 400    | every problem found, joined together     |
| Unparsable JSON body            | 400    | `request body must be valid JSON`        |
| Bad ObjectId                    | 400    | `<field> must be a valid ObjectId`       |
| Missing or invalid token        | 401    | `authentication token is invalid`        |
| Expired token                   | 401    | `authentication token has expired`       |
| Wrong credentials               | 401    | `invalid email or password`              |
| Unknown route                   | 404    | `route <METHOD> <path> not found`        |
| Duplicate email                 | 409    | `an account with this email already exists` |
| Anything unexpected             | 500    | `Server error`                           |

Unexpected errors are logged in full on the server and reported to the client
as a plain `Server error`, so internal details are never leaked.

## Tests

```bash
npm test
```

The suite runs against a real MongoDB started in memory for the run, so the
tests exercise genuine database writes rather than mocks. It covers both
schemas, the validators, registration, login, password hashing, every
rejection path of the authentication middleware, the protected post endpoint
(including a spoofed `creatorId` being ignored) and the error handler.
