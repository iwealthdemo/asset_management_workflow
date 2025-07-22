#!/bin/bash

echo "🔍 Testing sequential ID generation with curl..."

BASE_URL="http://localhost:5000"

# Login and get session cookie
echo "📝 Logging in..."
COOKIE_JAR=$(mktemp)
LOGIN_RESPONSE=$(curl -s -c "$COOKIE_JAR" -X POST \
  -H "Content-Type: application/json" \
  -d '{"username": "analyst", "password": "admin123"}' \
  "$BASE_URL/api/login")

if [[ $? -eq 0 ]]; then
  echo "✅ Login successful"
else
  echo "❌ Login failed"
  exit 1
fi

echo ""
echo "🔢 Creating multiple investment requests to test sequential numbering..."

# Create three investment requests
for i in {1..3}; do
  echo ""
  echo "📝 Creating investment request $i..."
  
  RESPONSE=$(curl -s -b "$COOKIE_JAR" -X POST \
    -H "Content-Type: application/json" \
    -d "{
      \"companyName\": \"Sequential Test Corp $i\",
      \"investmentType\": \"acquisition\",
      \"description\": \"Testing sequential ID $i\",
      \"amount\": $((i * 1000000)),
      \"expectedReturnPercentage\": 15,
      \"riskLevel\": \"medium\",
      \"targetCompany\": \"Test Co $i\",
      \"investmentRationale\": \"Testing sequential numbering system\",
      \"status\": \"new\"
    }" \
    "$BASE_URL/api/investment-requests")
  
  # Extract request ID from response
  REQUEST_ID=$(echo "$RESPONSE" | grep -o '"requestId":"[^"]*"' | cut -d'"' -f4)
  
  if [[ -n "$REQUEST_ID" ]]; then
    echo "✅ Created request with ID: $REQUEST_ID"
  else
    echo "❌ Failed to create request $i"
    echo "Response: $RESPONSE"
  fi
done

echo ""
echo "🎉 Sequential ID generation test completed!"

# Clean up
rm -f "$COOKIE_JAR"