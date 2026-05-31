"""크롤러 공통 유틸리티.

모든 편의점 크롤러에서 공유하는 카테고리 추론·가격 파싱 함수를 제공한다.
"""

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "음료": ["음료", "커피", "주스", "물", "차", "콜라", "사이다", "에너지", "라떼", "밀크"],
    "과자": ["과자", "스낵", "쿠키", "칩", "비스킷", "초콜릿", "캔디", "젤리", "사탕", "껌"],
    "아이스크림": ["아이스", "빙과", "아이스크림"],
    "간편식사": ["도시락", "샌드위치", "김밥", "라면", "햇반", "컵밥", "볶음밥", "주먹밥", "핫도그", "바"],
    "생활용품": ["마스크", "샴푸", "치약", "칫솔", "세제", "티슈", "화장품"],
}


def infer_category(product_name: str) -> str:
    """상품명 키워드로 카테고리를 추정한다."""
    for category, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            if keyword in product_name:
                return category
    return "기타"


def parse_price(price_text: str) -> int:
    """가격 문자열에서 숫자만 추출해 정수로 반환한다."""
    digits = "".join(char for char in price_text if char.isdigit())
    return int(digits) if digits else 0
