#!/usr/bin/env bash
set -euo pipefail

REGION=eu-north-1
REPO_NAME=docker-app
VERSION=v2

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
IMAGE_URI="${REGISTRY}/${REPO_NAME}:${VERSION}"

aws ecr describe-repositories \
  --repository-names "${REPO_NAME}" \
  --region "${REGION}" >/dev/null 2>&1 || \
aws ecr create-repository \
  --repository-name "${REPO_NAME}" \
  --region "${REGION}" >/dev/null

aws ecr get-login-password --region "${REGION}" | \
  docker login --username AWS --password-stdin "${REGISTRY}"

docker build --build-arg APP_VERSION="${VERSION}" -t "${REPO_NAME}:${VERSION}" .
docker tag "${REPO_NAME}:${VERSION}" "${IMAGE_URI}"
docker push "${IMAGE_URI}"

echo "Pushed ${IMAGE_URI}"
