#!/bin/bash

# Health check script for PM2
# This can be used to verify the server is actually running

HEALTH_URL="http://localhost:3000/health"
MAX_ATTEMPTS=5
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    if curl -f -s "$HEALTH_URL" > /dev/null 2>&1; then
        echo "Health check passed"
        exit 0
    fi
    
    echo "Health check attempt $ATTEMPT/$MAX_ATTEMPTS failed"
    sleep 2
    ATTEMPT=$((ATTEMPT + 1))
done

echo "Health check failed after $MAX_ATTEMPTS attempts"
exit 1

