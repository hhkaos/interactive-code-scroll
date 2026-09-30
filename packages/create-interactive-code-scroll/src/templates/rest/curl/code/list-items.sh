#!/usr/bin/env sh
# #region config
BASE_URL="https://api.example.com"
API_KEY="YOUR_API_KEY" # @var apiKey
# #endregion config

# #region run
curl -s "$BASE_URL/items?limit=2" \
  -H "Authorization: Bearer $API_KEY"
# #endregion run
