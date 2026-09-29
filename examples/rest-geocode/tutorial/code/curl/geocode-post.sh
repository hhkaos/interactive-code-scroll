#!/usr/bin/env bash
SERVICE_URL="https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer"
ACCESS_TOKEN="YOUR_ACCESS_TOKEN" # @var accessToken

# #region header-auth
curl --silent "$SERVICE_URL/findAddressCandidates" \
  --header "X-Esri-Authorization: Bearer $ACCESS_TOKEN" \
  --data-urlencode "singleLine=380 New York St, Redlands, CA" \
  --data "outFields=Match_addr,Addr_type" \
  --data "f=json"
# #endregion header-auth
