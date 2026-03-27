# TODO

- [x] Remove legacy `saved_words.context` and `saved_words.url` columns after full `encounters` migration.
  - Scope: backend read/write paths now persist only `data.encounters`, and frontend pages consume encounter data instead of top-level `context/url`.
  - Rollout: run `my-fastapi-app/scripts/drop_saved_words_legacy_columns.py` together with the updated backend deployment.
