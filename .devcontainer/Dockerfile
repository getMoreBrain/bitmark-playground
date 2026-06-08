FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

# Install shared build and runtime dependencies
COPY .devcontainer/scripts/install-deps.sh /tmp/install-deps.sh
RUN /tmp/install-deps.sh && rm /tmp/install-deps.sh

# Import Node.js release signing keys for GPG verification
# https://github.com/nodejs/node#release-keys
# Required for mise to install Node.js versions
# gpg keys are used to verify the integrity of downloaded Node.js binaries
USER vscode
RUN gpg --keyserver hkps://keys.openpgp.org --recv-keys \
  4ED778F539E3634C779C87C6D7062848A1AB005C \
  141F07595B7B3FFE74309A904F0EEBB37E0E2C14 \
  74F12602B6F1C4E913FAA37AD3A89613643B6201 \
  DD792F573C6DE52C432CBDAC77ABFA00DDBF2B7C \
  CC68F5A3106FF448322E48ED27F5E38D5B0A215F \
  8FCCA13FEF1D0C2E91008E09770F7A9A5AE15600 \
  C4F0DFFF4E8C1A8236409D08E73BC641CC11F4C8 \
  890C08DB8579162FEE0DF9DB8BEAB4DFCF555EF4 \
  C82FA3AE1CBEDC6BE46B9360C43CEC45C17AB93C \
  108F52B48DB57BB0CC439B2997B01419BD92F80A \
  A363A499291CBBC940AE88276104A21DB7A5B203
USER root

# Install mise from a pinned GitHub release, verified against committed SHA256s.
# To bump: change MISE_VERSION, then update both SHA256 values from
#   https://github.com/jdx/mise/releases/download/${MISE_VERSION}/SHASUMS256.txt
ARG MISE_VERSION=v2026.5.11
ARG MISE_SHA256_X64=9f677e94d7eab919fa33e84d54314774e061fbdcfbe9e115bc1f500fe01b66ab
ARG MISE_SHA256_ARM64=a3bc60547a060ebb31ebbe8d8274c721407cf3471043e473b8cb578cee8722fe
RUN set -eux; \
    arch="$(dpkg --print-architecture)"; \
    case "$arch" in \
      amd64) mise_arch=x64;   mise_sha="${MISE_SHA256_X64}"   ;; \
      arm64) mise_arch=arm64; mise_sha="${MISE_SHA256_ARM64}" ;; \
      *) echo "unsupported arch: $arch" >&2; exit 1 ;; \
    esac; \
    tarball="mise-${MISE_VERSION}-linux-${mise_arch}.tar.gz"; \
    curl -fsSLo /tmp/mise.tar.gz \
      "https://github.com/jdx/mise/releases/download/${MISE_VERSION}/${tarball}"; \
    echo "${mise_sha}  /tmp/mise.tar.gz" | sha256sum -c -; \
    tar -xzf /tmp/mise.tar.gz -C /tmp; \
    install -m 0755 /tmp/mise/bin/mise /usr/local/bin/mise; \
    rm -rf /tmp/mise /tmp/mise.tar.gz; \
    echo 'eval "$(mise activate bash)"' >> /home/vscode/.bashrc; \
    echo 'eval "$(mise activate zsh)"'  >> /home/vscode/.zshrc
