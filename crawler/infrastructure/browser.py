from contextlib import asynccontextmanager
from playwright.async_api import async_playwright, Browser, BrowserContext

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)


@asynccontextmanager
async def create_browser_context():
    """Playwright 브라우저 컨텍스트를 생성하고 정리한다."""
    async with async_playwright() as playwright:
        browser: Browser = await playwright.chromium.launch(headless=True)
        context: BrowserContext = await browser.new_context(user_agent=USER_AGENT)
        try:
            yield context
        finally:
            await context.close()
            await browser.close()
