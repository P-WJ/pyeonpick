FROM mcr.microsoft.com/playwright/python:v1.40.0-jammy

WORKDIR /app

COPY pyproject.toml .
RUN pip install uv && uv pip install --system -e .

COPY . .

CMD ["python", "-m", "crawler.main"]
