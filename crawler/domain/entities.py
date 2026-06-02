from dataclasses import dataclass, field
from datetime import date, datetime


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
    nutrition: dict | None = field(default=None)
    # 영양성분 딕셔너리 형식 (없는 항목은 포함하지 않음):
    # {
    #   "calories": 250,           # kcal
    #   "protein": 5.0,            # g
    #   "fat": 8.0,                # g
    #   "carbohydrates": 35.0,     # g
    #   "sugars": 10.0,            # g
    #   "sodium": 400,             # mg
    #   "saturated_fat": 2.5,      # g
    #   "trans_fat": 0,            # g
    #   "cholesterol": 15,         # mg
    #   "serving_size": "1개(120g)",  # 1회 제공량
    # }
    id: int | None = field(default=None)  # DB upsert 후 채워짐


@dataclass
class CrawlResult:
    store: str
    products: list[Product]
    error: str | None = None

    @property
    def succeeded(self) -> bool:
        return self.error is None


@dataclass
class Subscription:
    id: str                      # uuid
    email: str
    keywords: list[str]          # 빈 리스트면 전체 상품 알림
    stores: list[str]            # 빈 리스트면 전체 편의점
    created_at: datetime


@dataclass
class NotifyResult:
    total_subscriptions: int
    sent_count: int
    skipped_count: int           # 매칭 상품 없어서 건너뜀
    failed_count: int
    errors: list[str]
