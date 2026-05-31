from dataclasses import dataclass
from datetime import date


@dataclass
class Product:
    store: str        # 'CU' | 'GS25' | '세븐일레븐' | '이마트24' | 씨스페이스
    name: str
    price: int        # 원 단위
    event_type: str   # '1+1' | '2+1' | '3+1' | '할인' | '증정'
    category: str     # '음료' | '과자' | '간편식사' | '아이스크림' | '생활용품'
    image_url: str
    valid_from: date
    valid_to: date


@dataclass
class CrawlResult:
    store: str
    products: list[Product]
    error: str | None = None

    @property
    def succeeded(self) -> bool:
        return self.error is None
