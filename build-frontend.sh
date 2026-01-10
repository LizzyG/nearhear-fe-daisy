#!/bin/bash

# Build script for nearhear frontend
# Usage: ./build-frontend.sh <tag>
# Example: ./build-frontend.sh v1

if [ -z "$1" ]; then
  echo "Usage: ./build-frontend.sh <tag>"
  echo "Example: ./build-frontend.sh v1"
  exit 1
fi

TAG=$1
IMAGE="lizzyg/nearhear-frontend"

echo "Building ${IMAGE}:${TAG}..."

docker build \
  --build-arg VITE_API_ENV=prod \
  --build-arg VITE_POSTHOG_KEY="phc_bhHb3fJjR52we1wcI10jCRwTrhr6Iem6nfn5DfM9Iji" \
  --build-arg VITE_POSTHOG_HOST="https://us.i.posthog.com" \
  -t "${IMAGE}:${TAG}" \
  -t "${IMAGE}:latest" \
  .

if [ $? -eq 0 ]; then
  echo ""
  echo "Build successful!"
  echo "Tagged: ${IMAGE}:${TAG}"
  echo "Tagged: ${IMAGE}:latest"
  echo ""
  echo "To push: docker push ${IMAGE}:${TAG} && docker push ${IMAGE}:latest"
else
  echo "Build failed!"
  exit 1
fi

