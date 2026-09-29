#!/usr/bin/env bash
# #region request
ACCESS_TOKEN="YOUR_ACCESS_TOKEN" # @var accessToken

curl -G "https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates" \
  --data-urlencode "singleLine=380 New York St, Redlands, CA" \
  -d "f=json" \
  -d "token=$ACCESS_TOKEN"
# #endregion request
