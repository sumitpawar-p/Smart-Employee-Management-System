
FROM maven:3.9.9-eclipse-temurin-17 AS build

WORKDIR /app

COPY pom.xml .
COPY src ./src

RUN for attempt in 1 2 3; do \
    mvn clean package -DskipTests && exit 0; \
    echo "Maven download failed. Retrying in 20 seconds..."; \
    sleep 20; \
    done; exit 1

FROM eclipse-temurin:17-jre

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

CMD ["java", "-jar", "app.jar"]
