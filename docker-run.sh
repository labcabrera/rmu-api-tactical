#!/bin/bash

docker stop rmu-api-tactical

docker rm rmu-api-tactical

docker rmi labcabrera/rmu-api-tactical:latest

docker build -t labcabrera/rmu-api-tactical:latest .

docker run -d -p 3003:3003 --network rmu-network --name rmu-api-tactical -h rmu-api-tactical \
  -e PORT='3003' \
  -e RMU_MONGO_TACTICAL_URI='mongodb://admin:admin@rmu-mongo:27017/rmu-tactical?authSource=admin' \
  -e RMU_IAM_TOKEN_URI='http://rmu-keycloak:8080/realms/rmu-local/protocol/openid-connect/token' \
  -e RMU_IAM_JWK_URI='http://rmu-keycloak:8080/realms/rmu-local/protocol/openid-connect/certs' \
  -e RMU_IAM_CLIENT_ID=rmu-client \
  -e RMU_IAM_CLIENT_SECRET=1tUzPc24SYJMPpX37g2eymEoS9C3Ttzw \
  -e RMU_KAFKA_BROKERS=rmu-kafka-broker:9092 \
  -e RMU_KAFKA_CLIENT_ID=rmu-api-tactical \
  labcabrera/rmu-api-tactical:latest

docker logs -f rmu-api-tactical
