# Frosthaven companion — static single-page app served by nginx over HTTPS.
# nginx:alpine is multi-arch (linux/arm/v7 + arm64), so it runs on a Raspberry Pi.
FROM nginx:1.27-alpine

# Drop the default site, ship our page as the index.
RUN rm -f /usr/share/nginx/html/*
COPY index.html /usr/share/nginx/html/index.html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# TLS cert/key are bind-mounted at runtime into /etc/nginx/certs (see compose).
EXPOSE 80 443

# Container health: plain-HTTP /healthz on port 80 (no TLS, no cert headache).
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
