FROM eclipse-temurin:21-jdk-jammy AS build
WORKDIR /workspace
COPY gradlew settings.gradle ./
COPY gradle ./gradle
COPY backend/build.gradle ./backend/build.gradle
COPY backend/src ./backend/src
COPY frontend/index.html ./frontend/index.html
COPY frontend/css ./frontend/css
COPY frontend/js ./frontend/js
COPY frontend/porabadmin ./frontend/porabadmin
COPY frontend/prorabadmin ./frontend/prorabadmin
RUN chmod +x gradlew && ./gradlew --no-daemon :backend:test :backend:bootJar

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build /workspace/backend/build/libs/app.jar ./app.jar
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=60 -XX:+ExitOnOutOfMemoryError"
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
