## Running with Docker

> ⚠️ This documentation and the docker configurations are taken from https://github.com/Wakeful-Cloud/yarr

### Running


```bash
# Run in foreground
docker run -it -v [Absolute path on host to store data]:/data -p 7070:7070/tcp --name yarr ghcr.io/mzfr/yarr:latest

# OR run in background
docker run -d -v [Absolute path on host to store data]:/data -p 7070:7070/tcp --name yarr ghcr.io/mzfr/yarr:latest
```
*Note: for improved security and stability, you should use specific commit tags instead of `latest`.*

### Environment Variables
Name | Required/Default | Description
--- | --- | ---
`UID` | `1000` | Runner user ID
`GID` | `1000` | Runner group ID
`ADDRESS` | `0.0.0.0` | Listening address
`PORT` | `7070` | Listening port
`DATA` | `/data` | Data directory

## FAQ


### What architectures are supported?
* X86 64-bit (`linux/amd64`)
* Arm V6 32-bit (`linux/arm/v6`)
* Arm V7 32-bit (`linux/arm/v7`)
* Arm V8 64-bit (`linux/arm64/v8`)
