#!/bin/bash

# Build script for nearhear frontend
# Usage: ./build-frontend.sh <tag> [--push]
# Example: ./build-frontend.sh v1
# Example: ./build-frontend.sh v1 --push

if [ -z "$1" ]; then
  echo "Usage: ./build-frontend.sh <tag> [--push]"
  echo "Example: ./build-frontend.sh v1"
  echo "Example: ./build-frontend.sh v1 --push"
  exit 1
fi

TAG=$1
PUSH=$2
IMAGE="lizzyg/nearhear-frontend"

echo "Building ${IMAGE}:${TAG}..."

docker build \
  --build-arg VITE_API_ENV=prod \
  --build-arg VITE_POSTHOG_KEY="phc_bhHb3fJjR52we1wcI10jCRwTrhr6Iem6nfn5DfM9Iji" \
  --build-arg VITE_POSTHOG_HOST="https://us.i.posthog.com" \
  -t "${IMAGE}:${TAG}" \
  -t "${IMAGE}:latest" \
  .

if [ $? -ne 0 ]; then
  echo "Build failed!"
  exit 1
fi

echo ""
echo "Build successful!"
echo "Tagged: ${IMAGE}:${TAG}"
echo "Tagged: ${IMAGE}:latest"

if [ "$PUSH" = "--push" ]; then
  echo ""
  echo "Pushing images..."
  docker push "${IMAGE}:${TAG}"
  docker push "${IMAGE}:latest"
  echo "Push complete!"
else
  echo ""
  echo "To push: docker push ${IMAGE}:${TAG} && docker push ${IMAGE}:latest"
fi

