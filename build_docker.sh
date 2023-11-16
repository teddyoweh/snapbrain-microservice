docker build -t snapbrain-backend -f Dockerfile .
docker run -p 3030:3030 -p 3050:3050 -p 443:443 -e WS_PORT=3050 -d snapbrain-backend
