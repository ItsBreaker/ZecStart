# Shielded 101 wallet backend.
#
# Stage 1 builds zingo-cli from upstream zingolib, pinned to the commit the
# app was developed against, with the mixnet compiled out and the
# nakednet-test-mode feature on (the same build as zingolib's
# `makers run-cli --nakednet --features nakednet-test-mode`). It follows
# zingolib's own Dockerfile: a release build of the zingo-cli binary only.
# Stage 2 is a slim Node image with that binary and the backend, run as a
# non-root user.

ARG ZINGOLIB_COMMIT=3f2529e2284d07925abd41b0fa0f1d40143f9241

############################
# Stage 1: build zingo-cli
############################
FROM rust:1-bookworm AS zingo
ARG ZINGOLIB_COMMIT
RUN apt-get update \
 && apt-get install -y --no-install-recommends protobuf-compiler libsqlite3-dev pkg-config cmake clang git ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /src
RUN git init -q zingolib \
 && cd zingolib \
 && git remote add origin https://github.com/zingolabs/zingolib \
 && git fetch -q --depth 1 origin "${ZINGOLIB_COMMIT}" \
 && git checkout -q FETCH_HEAD
WORKDIR /src/zingolib
# rust-toolchain.toml in the repo pins the compiler (rustup installs it here).
# Fewer parallel jobs keep peak memory within a hosted builder's limits.
ENV CARGO_INCREMENTAL=0 CARGO_BUILD_JOBS=4
RUN cargo build --release -p zingo-cli --no-default-features --features nakednet-test-mode \
 && install -D -m 0755 target/release/zingo-cli /out/zingo-cli

############################
# Stage 2: runtime
############################
FROM node:22-bookworm-slim AS runtime
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 ca-certificates libsqlite3-0 \
 && rm -rf /var/lib/apt/lists/*

# High UID/GID, as in zingolib's Dockerfile, to avoid overlap with host users.
ARG UID=10901
RUN groupadd --gid ${UID} app && useradd --uid ${UID} --gid ${UID} --create-home --shell /usr/sbin/nologin app

COPY --from=zingo /out/zingo-cli /usr/local/bin/zingo-cli
WORKDIR /app
COPY --chown=app:app package.json ./
COPY --chown=app:app src ./src
COPY --chown=app:app zingo ./zingo
COPY --chown=app:app scripts ./scripts
COPY --chmod=0755 docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8787 \
    ZINGO_BIN=/usr/local/bin/zingo-cli \
    PYTHON=python3 \
    INDEXER=https://testnet.zec.rocks:443 \
    WALLET_DIR=/data/wallets
EXPOSE 8787

# The entrypoint starts as root only to make the mounted volume writable,
# then drops to the "app" user before starting Node.
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "src/server.mjs"]
