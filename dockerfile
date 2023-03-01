FROM golang:1.19.4-alpine3.16 AS builder
RUN apk add build-base git
WORKDIR /src
COPY . .
RUN make build_default

FROM alpine:3.17
WORKDIR /home/yarr
COPY --from=builder /src/_output/yarr .
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

RUN apk add --no-cache ca-certificates su-exec
RUN update-ca-certificates

CMD ["/home/yarr/entrypoint.sh"]
