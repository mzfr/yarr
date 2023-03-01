FROM golang:alpine AS build
RUN apk add build-base git
WORKDIR /src
COPY . .
RUN make build_default

FROM alpine:latest
WORKDIR /home/yarr
COPY --from=build /src/_output/linux/yarr .
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

RUN apk add --no-cache ca-certificates su-exec
RUN update-ca-certificates

CMD ["/home/yarr/entrypoint.sh"]
