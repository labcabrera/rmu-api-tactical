#!/bin/bash

docker stop rmu-api-tactical

docker rm rmu-api-tactical

docker rmi labcabrera/rmu-api-tactical:latest

docker build -t labcabrera/rmu-api-tactical:latest .

docker run -d -p 3001:3001 --network rmu-network --name rmu-api-tactical -h rmu-api-tactical -e MONGO_URI='mongodb://rmu-mongo:27017/rmu-tactical' -e PORT='3001' labcabrera/rmu-api-tactical:latest

docker logs -f rmu-api-tactical
