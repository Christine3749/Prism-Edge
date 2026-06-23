FROM python:3.13-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

COPY services/api/requirements.txt ./services/api/requirements.txt
RUN python -m pip install --no-cache-dir -r services/api/requirements.txt

COPY services ./services

EXPOSE 8080
CMD ["sh", "-c", "uvicorn services.api.app.main:app --host 0.0.0.0 --port ${PORT}"]
