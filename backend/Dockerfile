FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    UV_COMPILE_BYTECODE=1 \
    PORT=8080

RUN pip install --no-cache-dir uv

COPY pyproject.toml ./
COPY src ./src

RUN uv pip install --system --no-cache .

CMD ["uvicorn", "rootin4_agent.main:app", "--host", "0.0.0.0", "--port", "8080"]
