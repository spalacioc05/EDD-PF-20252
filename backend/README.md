# backend

## Description



## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
npm run start:prod
```

## Profile photos storage

- Bucket: `fotos_perfil` (auto-created/public on first boot)
- Structure: each user has a folder `user-<id_usuario>/` where all their past profile photos are stored.
- Filenames: `perfil_user-<id>_YYYYMMDD_HHMMSS-<rand>.<ext>`

### Endpoints

- POST `/users/me/photo` (multipart FormData, field `file`): uploads a new profile photo to `user-<id>/...`, sets it as current and returns `{ url, path, user }`.
- GET `/users/me/photos`: lists all files in `user-<id>/` and returns `{ files: [{ name, path, url, created_at, size, contentType }] }`.
- PATCH `/users/me/photo` JSON: `{ path: "user-<id>/<file>" }` sets an existing photo from history as current.

Notes: URLs are public for simplicity. If you need signed URLs, we can switch to signed URLs or a proxy endpoint.

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```
