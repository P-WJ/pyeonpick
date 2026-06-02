from dataclasses import dataclass, field
from datetime import date
from typing import Literal

Category = Literal["음료", "과자", "식품", "아이스크림", "생활용품"]
StoreType = Literal["CU", "GS25", "세븐일레븐", "이마트24", "씨스페이스"]
EventType = Literal["1+1", "2+1", "3+1", "할인", "증정"]


@dataclass
class Product:
    store: StoreType
    name: str
    price: int        # 원 단위
    event_type: EventType
    category: Category
    image_url: str
    valid_from: date
    valid_to: date
    id: int | None = field(default=None)  # DB upsert 후 채워짐


@dataclass
class CrawlResult:
    store: str
    products: list[Product]
    error: str | None = None

    @property
    def succeeded(self) -> bool:
        return self.error is None
