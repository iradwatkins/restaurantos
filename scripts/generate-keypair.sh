#!/usr/bin/env bash
# Generate RSA keypair for JWT authentication
# Output: base64-encoded values ready for .env JWT_PRIVATE_KEY and JWT_PUBLIC_KEY

set -euo pipefail

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

openssl genrsa -out "$TMPDIR/private.pem" 2048 2>/dev/null
openssl rsa -in "$TMPDIR/private.pem" -pubout -out "$TMPDIR/public.pem" 2>/dev/null

PRIVATE_B64=$(base64 < "$TMPDIR/private.pem" | tr -d '\n')
PUBLIC_B64=$(base64 < "$TMPDIR/public.pem" | tr -d '\n')

echo ""
echo "Add these to your .env file:"
echo ""
echo "JWT_PRIVATE_KEY=$PRIVATE_B64"
echo ""
echo "JWT_PUBLIC_KEY=$PUBLIC_B64"
echo ""
echo "Also configure the public key in your Convex auth provider settings."
