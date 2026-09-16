# Etapa 1: build do frontend
FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build


# Etapa 2: aplicação FastAPI
FROM python:3.12-slim

WORKDIR /app

COPY backend/requirements.lock /app/backend/requirements.lock

RUN pip install --no-cache-dir -r /app/backend/requirements.lock

COPY backend/ /app/backend/
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

WORKDIR /app/backend

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]