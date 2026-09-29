#!/usr/bin/env bash
# #region config
SERVICE_URL="https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer"
ACCESS_TOKEN="YOUR_ACCESS_TOKEN" # @var accessToken
# #endregion config

# #region request
curl --silent --get "$SERVICE_URL/findAddressCandidates" \
  --data-urlencode "singleLine=380 New York St, Redlands, CA" \
  --data "outFields=Match_addr,Addr_type" \
  --data "f=json" \
  --data "token=$ACCESS_TOKEN"
# #endregion request
