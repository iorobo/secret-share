FROM golang:1.27-bookworm AS app
WORKDIR /build
COPY . .
ARG VERSION
RUN CGO_ENABLED=0 go build -trimpath -ldflags "-s -w -X main.version=${VERSION:-dev}" -o /secret-share-server ./cmd/yopass-server && \
	CGO_ENABLED=0 go build -trimpath -o /secret-share ./cmd/yopass

FROM node:22 AS website
COPY website /website
WORKDIR /website
RUN yarn install --frozen-lockfile --network-timeout 600000 && yarn build

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=app /secret-share-server /secret-share /
COPY --from=website /website/dist /public
ENV ASSET_PATH=/public
EXPOSE 1337
ENTRYPOINT ["/secret-share-server"]
